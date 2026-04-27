import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any
const STATUTS = ['brouillon', 'envoyee', 'partiellement_payee', 'payee', 'annulee'] as const
const EPS = 0.01

type FacturePaiementRow = {
  id: number
  factureId: number
  date: string
  montant: number
  mode: string | null
  note: string | null
  createdAt: Date
}

type FactureRow = {
  id: number
  numero: string
  date: string
  statut: string
  clientId: number | null
  client_nom: string
  client_telephone: string
  client_adresse: string | null
  client_matricule_fiscale: string | null
  timbre: number
  montant_paye: number
  createdAt: Date
  lignes: {
    id: number
    type: string
    designation: string
    qte: number | null
    mt_ht: number | null
    montant: number | null
    productId: number | null
    prix_unitaire_ht: number | null
  }[]
  paiements?: FacturePaiementRow[]
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Même formule que frontend computeFactureTotals */
function computeTotalTTCFromLignesDb(
  lignes: FactureRow['lignes'],
  timbre: number
): number {
  let htMainOeuvre = 0
  let htProduits = 0
  let depenses = 0
  for (const l of lignes) {
    if (l.type === 'depense') {
      depenses += l.montant ?? 0
    } else if (l.type === 'produit') {
      htProduits += (l.qte ?? 0) * (l.prix_unitaire_ht ?? 0)
    } else if (
      l.type === 'main_oeuvre' ||
      l.type === 'pieces' ||
      l.type === 'autre_produit' ||
      l.type === 'divers'
    ) {
      htMainOeuvre += (l.qte ?? 0) * (l.mt_ht ?? 0)
    }
  }
  const totalHT = htMainOeuvre + htProduits
  const tva19 = totalHT * 0.19
  return totalHT + tva19 + depenses + timbre
}

function toFacture(f: FactureRow) {
  return {
    id: f.id,
    numero: f.numero,
    date: f.date,
    statut: f.statut as
      | 'brouillon'
      | 'envoyee'
      | 'partiellement_payee'
      | 'payee'
      | 'annulee',
    clientId: f.clientId ?? undefined,
    clientNom: f.client_nom,
    clientTelephone: f.client_telephone,
    clientAdresse: f.client_adresse ?? undefined,
    clientMatriculeFiscale: f.client_matricule_fiscale ?? undefined,
    montantPaye: f.montant_paye ?? 0,
    paiements: (f.paiements ?? []).map((p) => ({
      id: p.id,
      date: p.date,
      montant: p.montant,
      mode: p.mode ?? undefined,
      note: p.note ?? undefined,
      createdAt: p.createdAt.toISOString(),
    })),
    lignes: f.lignes.map((l) => {
      if (l.type === 'depense') {
        return {
          type: 'depense' as const,
          designation: l.designation,
          montant: l.montant ?? 0,
        }
      }
      if (l.type === 'produit') {
        return {
          type: 'produit' as const,
          productId: l.productId ?? 0,
          designation: l.designation,
          qte: l.qte ?? 0,
          prixUnitaireHT: l.prix_unitaire_ht ?? 0,
        }
      }
      if (l.type === 'pieces' || l.type === 'piece_hors_stock') {
        return {
          type: 'pieces' as const,
          designation: l.designation,
          qte: l.qte ?? 0,
          mtHT: l.mt_ht ?? 0,
        }
      }
      if (l.type === 'autre_produit') {
        return {
          type: 'autre_produit' as const,
          designation: l.designation,
          qte: l.qte ?? 0,
          mtHT: l.mt_ht ?? 0,
        }
      }
      if (l.type === 'divers') {
        return {
          type: 'divers' as const,
          designation: l.designation,
          qte: l.qte ?? 0,
          mtHT: l.mt_ht ?? 0,
        }
      }
      return {
        type: 'main_oeuvre' as const,
        designation: l.designation,
        qte: l.qte ?? 0,
        mtHT: l.mt_ht ?? 0,
      }
    }),
    timbre: f.timbre,
    createdAt: f.createdAt.toISOString(),
  }
}

const factureInclude = { lignes: true, paiements: { orderBy: { id: 'asc' } } } as const

function mapLigneFromBody(raw: any) {
  const l = raw
  const rawType = l.type as string
  const type = rawType === 'piece_hors_stock' ? 'pieces' : rawType
  if (type === 'depense') {
    return {
      type: 'depense',
      designation: String(l.designation ?? '').trim(),
      montant: Number(l.montant) || 0,
    }
  }
  if (type === 'produit') {
    return {
      type: 'produit',
      designation: String(l.designation ?? '').trim(),
      qte: Number(l.qte) || 0,
      productId: Number(l.productId) || null,
      prix_unitaire_ht: Number(l.prixUnitaireHT) || 0,
    }
  }
  if (type === 'main_oeuvre' || type === 'pieces' || type === 'autre_produit' || type === 'divers') {
    return {
      type,
      designation: String(l.designation ?? '').trim(),
      qte: Number(l.qte) || 0,
      mt_ht: Number(l.mtHT) || 0,
    }
  }
  return {
    type: 'main_oeuvre',
    designation: String(l.designation ?? '').trim(),
    qte: Number(l.qte) || 0,
    mt_ht: Number(l.mtHT) || 0,
  }
}

// GET /factures - liste avec filtres simples (q, statut, year, month)
router.get('/', authenticate(), async (req, res) => {
  try {
    const q = (req.query.q as string)?.trim()
    const statut = (req.query.statut as string)?.trim()
    const year = req.query.year ? Number(req.query.year) : undefined
    const month = req.query.month ? Number(req.query.month) : undefined

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { numero: { contains: q, mode: 'insensitive' } },
        { client_nom: { contains: q, mode: 'insensitive' } },
        { client_telephone: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (statut) {
      if (!STATUTS.includes(statut as (typeof STATUTS)[number])) {
        return res.status(400).json({ error: 'statut invalide' })
      }
      where.statut = statut
    }
    if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
      return res.status(400).json({ error: 'year invalide' })
    }
    if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
      return res.status(400).json({ error: 'month invalide' })
    }
    if (month !== undefined && year === undefined) {
      return res.status(400).json({ error: 'year est requis quand month est fourni' })
    }
    if (year !== undefined || month !== undefined) {
      where.date = {}
      if (year !== undefined && month !== undefined) {
        const y = String(year)
        const m = String(month).padStart(2, '0')
        ;(where.date as Record<string, string>).gte = `${y}-${m}-01`
        ;(where.date as Record<string, string>).lte = `${y}-${m}-31`
      } else if (year !== undefined) {
        ;(where.date as Record<string, string>).gte = `${year}-01-01`
        ;(where.date as Record<string, string>).lte = `${year}-12-31`
      }
    }

    const list = (await db.facture.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: factureInclude,
    })) as FactureRow[]

    return res.json(list.map(toFacture))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /factures/:id/paiements — enregistre un encaissement (partiel ou solde) ; doit être avant GET :id sémantique (chemins distincts)
router.post('/:id/paiements', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as { date?: string; montant?: number; mode?: string; note?: string }
    if (!body.date?.trim() || typeof body.montant !== 'number' || body.montant <= 0) {
      return res.status(400).json({ error: 'date et montant (positif) requis' })
    }

    const f = (await db.facture.findUnique({
      where: { id },
      include: factureInclude,
    })) as FactureRow | null
    if (!f) return res.status(404).json({ error: 'Facture introuvable' })
    if (f.statut !== 'envoyee' && f.statut !== 'partiellement_payee') {
      return res.status(400).json({ error: 'Paiement possible uniquement sur facture non payée' })
    }

    const totalTTC = round2(computeTotalTTCFromLignesDb(f.lignes, f.timbre))
    const deja = round2(f.montant_paye ?? 0)
    const reste = round2(totalTTC - deja)
    if (reste <= EPS) {
      return res.status(400).json({ error: 'Facture déjà soldée' })
    }
    const montant = round2(Math.min(body.montant, reste))
    if (montant < EPS) {
      return res.status(400).json({ error: 'Montant trop faible' })
    }

    const newPaye = round2(deja + montant)
    const isSolde = totalTTC - newPaye <= EPS
    const nextStatut: string = isSolde ? 'payee' : 'partiellement_payee'
    const mode = (body.mode ?? '').trim() || null
    const note = (body.note ?? '').trim() || null

    await db.$transaction(async (tx: any) => {
      await tx.facturePaiement.create({
        data: {
          factureId: id,
          date: body.date!.trim(),
          montant,
          mode,
          note,
        },
      })
      await tx.moneyIn.create({
        data: {
          date: body.date!.trim(),
          amount: montant,
          type: 'MECA',
          description: `Facture ${f.numero} (encaissement)`,
          payment_method: mode,
        },
      })
      await tx.facture.update({
        where: { id },
        data: {
          statut: nextStatut,
          montant_paye: newPaye,
        },
      })
    })

    const out = (await db.facture.findUnique({
      where: { id },
      include: factureInclude,
    })) as FactureRow
    return res.status(201).json(toFacture(out))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /factures/:id - détail
router.get('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const f = (await db.facture.findUnique({
      where: { id },
      include: factureInclude,
    })) as FactureRow | null
    if (!f) return res.status(404).json({ error: 'Facture introuvable' })
    return res.json(toFacture(f))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /factures - créer
router.post('/', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      numero?: string
      date?: string
      statut?: string
      clientId?: number
      clientNom?: string
      clientTelephone?: string
      clientAdresse?: string
      clientMatriculeFiscale?: string
      lignes?: unknown[]
      timbre?: number
    }
    if (!body.numero?.trim() || !body.date?.trim() || !body.clientNom?.trim()) {
      return res.status(400).json({ error: 'numero, date et clientNom sont requis' })
    }

    const requestStatut = (body.statut ?? 'brouillon').trim()
    if (requestStatut === 'partiellement_payee') {
      return res.status(400).json({ error: 'Le statut partiellement payée est défini par les encaissements' })
    }
    if (!STATUTS.includes(requestStatut as (typeof STATUTS)[number])) {
      return res.status(400).json({ error: 'statut invalide' })
    }

    const lignesInput = Array.isArray(body.lignes) ? body.lignes : []
    const dataLignes = lignesInput.map((raw) => mapLigneFromBody(raw))

    const numero0 = body.numero!.trim()
    const date0 = body.date!.trim()
    const clientNom0 = body.clientNom!.trim()

    const f = (await db.$transaction(async (tx: any) => {
      const created = (await tx.facture.create({
        data: {
          numero: numero0,
          date: date0,
          statut: 'brouillon',
          clientId: body.clientId ?? null,
          client_nom: clientNom0,
          client_telephone: (body.clientTelephone ?? '').trim(),
          client_adresse: (body.clientAdresse ?? '').trim() || null,
          client_matricule_fiscale: (body.clientMatriculeFiscale ?? '').trim() || null,
          timbre: Number(body.timbre) || 1,
          montant_paye: 0,
          lignes: {
            create: dataLignes,
          },
        },
        include: { lignes: true },
      })) as FactureRow

      let out = created
      const target = requestStatut
      if (target === 'brouillon') {
        // déjà
      } else if (target === 'envoyee') {
        out = (await tx.facture.update({
          where: { id: created.id },
          data: { statut: 'envoyee', montant_paye: 0 },
          include: { lignes: true },
        })) as FactureRow
      } else if (target === 'payee') {
        const tot = round2(computeTotalTTCFromLignesDb(created.lignes, created.timbre))
        await tx.facturePaiement.create({
          data: {
            factureId: created.id,
            date: created.date,
            montant: tot,
            mode: null,
            note: 'Paiement intégral (création)',
          },
        })
        await tx.moneyIn.create({
          data: {
            date: created.date,
            amount: tot,
            type: 'MECA',
            description: `Facture ${created.numero}`,
            payment_method: null,
          },
        })
        out = (await tx.facture.update({
          where: { id: created.id },
          data: { statut: 'payee', montant_paye: tot },
          include: { lignes: true },
        })) as FactureRow
      } else if (target === 'annulee') {
        out = (await tx.facture.update({
          where: { id: created.id },
          data: { statut: 'annulee' },
          include: { lignes: true },
        })) as FactureRow
      }

      return (await tx.facture.findUnique({
        where: { id: out.id },
        include: factureInclude,
      })) as FactureRow
    })) as FactureRow

    return res.status(201).json(toFacture(f))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// PUT /factures/:id - mise à jour (remplace les lignes uniquement si fournies) + règles caisse
router.put('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })

    const body = req.body as {
      numero?: string
      date?: string
      statut?: string
      clientId?: number
      clientNom?: string
      clientTelephone?: string
      clientAdresse?: string
      clientMatriculeFiscale?: string
      lignes?: unknown[]
      timbre?: number
    }

    const existing = (await db.facture.findUnique({
      where: { id },
      include: factureInclude,
    })) as FactureRow | null
    if (!existing) return res.status(404).json({ error: 'Facture introuvable' })

    if (body.statut !== undefined && body.statut.trim() === 'partiellement_payee') {
      return res
        .status(400)
        .json({ error: 'Le statut partiellement payée est défini par les encaissements' })
    }

    const nextStatut = body.statut !== undefined ? body.statut.trim() : existing.statut
    if (!STATUTS.includes(nextStatut as (typeof STATUTS)[number])) {
      return res.status(400).json({ error: 'statut invalide' })
    }

    const timbre = body.timbre !== undefined ? Number(body.timbre) || 0 : existing.timbre
    const dateFacture = body.date !== undefined ? body.date.trim() : existing.date
    const numero = body.numero !== undefined ? body.numero.trim() : existing.numero

    if (body.lignes !== undefined) {
      const lignesInput = Array.isArray(body.lignes) ? body.lignes : []
      const dataLignes = lignesInput.map((raw) => mapLigneFromBody(raw))
      const tempLignes = dataLignes.map((l, idx) => ({
        id: idx,
        type: l.type,
        designation: l.designation,
        qte: l.type === 'depense' ? null : (l as any).qte ?? null,
        mt_ht: (l as any).mt_ht ?? null,
        montant: (l as any).montant ?? null,
        productId: (l as any).productId ?? null,
        prix_unitaire_ht: (l as any).prix_unitaire_ht ?? null,
      })) as FactureRow['lignes']
      const totalTTC = round2(computeTotalTTCFromLignesDb(tempLignes, timbre))
      const prev = existing.statut
      const prevPaye = round2(existing.montant_paye ?? 0)

      await db.$transaction(async (tx: any) => {
        if (nextStatut === 'brouillon' && prev !== 'brouillon') {
          await tx.facturePaiement.deleteMany({ where: { factureId: id } })
        }

        if (prev === 'brouillon' && nextStatut === 'payee') {
          const pay = totalTTC
          await tx.factureLigne.deleteMany({ where: { factureId: id } })
          const updated = (await tx.facture.update({
            where: { id },
            data: {
              numero: body.numero !== undefined ? body.numero.trim() : undefined,
              date: body.date !== undefined ? body.date.trim() : undefined,
              statut: 'payee',
              clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
              client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
              client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
              client_adresse:
                body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
              client_matricule_fiscale:
                body.clientMatriculeFiscale !== undefined
                  ? (body.clientMatriculeFiscale ?? '').trim() || null
                  : undefined,
              timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
              montant_paye: pay,
              lignes: { create: dataLignes },
            },
            include: { lignes: true },
          })) as FactureRow
          await tx.facturePaiement.create({
            data: {
              factureId: id,
              date: dateFacture,
              montant: pay,
              mode: null,
              note: 'Paiement intégral (validation)',
            },
          })
          await tx.moneyIn.create({
            data: {
              date: dateFacture,
              amount: pay,
              type: 'MECA',
              description: `Facture ${numero}`,
              payment_method: null,
            },
          })
          return updated
        }

        if (prev === 'brouillon' && nextStatut === 'envoyee') {
          await tx.factureLigne.deleteMany({ where: { factureId: id } })
          return (await tx.facture.update({
            where: { id },
            data: {
              numero: body.numero !== undefined ? body.numero.trim() : undefined,
              date: body.date !== undefined ? body.date.trim() : undefined,
              statut: 'envoyee',
              clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
              client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
              client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
              client_adresse:
                body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
              client_matricule_fiscale:
                body.clientMatriculeFiscale !== undefined
                  ? (body.clientMatriculeFiscale ?? '').trim() || null
                  : undefined,
              timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
              montant_paye: 0,
              lignes: { create: dataLignes },
            },
            include: { lignes: true },
          })) as FactureRow
        }

        if ((prev === 'envoyee' || prev === 'partiellement_payee') && nextStatut === 'payee') {
          const reste = round2(totalTTC - prevPaye)
          await tx.factureLigne.deleteMany({ where: { factureId: id } })
          const updated = (await tx.facture.update({
            where: { id },
            data: {
              numero: body.numero !== undefined ? body.numero.trim() : undefined,
              date: body.date !== undefined ? body.date.trim() : undefined,
              statut: 'payee',
              clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
              client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
              client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
              client_adresse:
                body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
              client_matricule_fiscale:
                body.clientMatriculeFiscale !== undefined
                  ? (body.clientMatriculeFiscale ?? '').trim() || null
                  : undefined,
              timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
              montant_paye: totalTTC,
              lignes: { create: dataLignes },
            },
            include: { lignes: true },
          })) as FactureRow
          if (reste > EPS) {
            await tx.facturePaiement.create({
              data: {
                factureId: id,
                date: dateFacture,
                montant: reste,
                mode: null,
                note: 'Solde (marqué payée)',
              },
            })
            await tx.moneyIn.create({
              data: {
                date: dateFacture,
                amount: reste,
                type: 'MECA',
                description: `Facture ${numero} (solde)`,
                payment_method: null,
              },
            })
          }
          return updated
        }

        if (nextStatut === 'brouillon' && prev !== 'brouillon') {
          await tx.factureLigne.deleteMany({ where: { factureId: id } })
          return (await tx.facture.update({
            where: { id },
            data: {
              numero: body.numero !== undefined ? body.numero.trim() : undefined,
              date: body.date !== undefined ? body.date.trim() : undefined,
              statut: 'brouillon',
              clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
              client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
              client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
              client_adresse:
                body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
              client_matricule_fiscale:
                body.clientMatriculeFiscale !== undefined
                  ? (body.clientMatriculeFiscale ?? '').trim() || null
                  : undefined,
              timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
              montant_paye: 0,
              lignes: { create: dataLignes },
            },
            include: { lignes: true },
          })) as FactureRow
        }

        // Autres mises à jour (incl. annulée) sans règles d’encaissement spéciales
        await tx.factureLigne.deleteMany({ where: { factureId: id } })
        return (await tx.facture.update({
          where: { id },
          data: {
            numero: body.numero !== undefined ? body.numero.trim() : undefined,
            date: body.date !== undefined ? body.date.trim() : undefined,
            statut: nextStatut,
            clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
            client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
            client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
            client_adresse:
              body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
            client_matricule_fiscale:
              body.clientMatriculeFiscale !== undefined
                ? (body.clientMatriculeFiscale ?? '').trim() || null
                : undefined,
            timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
            lignes: { create: dataLignes },
            ...(nextStatut === 'brouillon' && prev !== 'brouillon' ? { montant_paye: 0 } : {}),
          },
          include: { lignes: true },
        })) as FactureRow
      })

      const full = (await db.facture.findUnique({
        where: { id },
        include: factureInclude,
      })) as FactureRow
      return res.json(toFacture(full))
    }

    // Métadonnées seulement (sans remplacer les lignes)
    const onlyMetaLignes = (await db.facture.findUnique({ where: { id }, include: { lignes: true } })) as FactureRow
    const totalTTC = round2(computeTotalTTCFromLignesDb(onlyMetaLignes.lignes, timbre))
    const prev = existing.statut
    const prevPaye = round2(existing.montant_paye ?? 0)

    await db.$transaction(async (tx: any) => {
      if (nextStatut === 'brouillon' && prev !== 'brouillon') {
        await tx.facturePaiement.deleteMany({ where: { factureId: id } })
      }

      if (prev === 'brouillon' && nextStatut === 'payee') {
        const pay = totalTTC
        await tx.facturePaiement.create({
          data: {
            factureId: id,
            date: dateFacture,
            montant: pay,
            mode: null,
            note: 'Paiement intégral (validation)',
          },
        })
        await tx.moneyIn.create({
          data: {
            date: dateFacture,
            amount: pay,
            type: 'MECA',
            description: `Facture ${numero}`,
            payment_method: null,
          },
        })
        return (await tx.facture.update({
          where: { id },
          data: {
            statut: 'payee',
            montant_paye: pay,
            numero: body.numero !== undefined ? body.numero.trim() : undefined,
            date: body.date !== undefined ? body.date.trim() : undefined,
            clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
            client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
            client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
            client_adresse:
              body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
            client_matricule_fiscale:
              body.clientMatriculeFiscale !== undefined
                ? (body.clientMatriculeFiscale ?? '').trim() || null
                : undefined,
            timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
          },
        })) as FactureRow
      }

      if (prev === 'brouillon' && nextStatut === 'envoyee') {
        return (await tx.facture.update({
          where: { id },
          data: {
            statut: 'envoyee',
            montant_paye: 0,
            numero: body.numero !== undefined ? body.numero.trim() : undefined,
            date: body.date !== undefined ? body.date.trim() : undefined,
            clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
            client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
            client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
            client_adresse: body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
            client_matricule_fiscale:
              body.clientMatriculeFiscale !== undefined
                ? (body.clientMatriculeFiscale ?? '').trim() || null
                : undefined,
            timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
          },
        })) as FactureRow
      }

      if ((prev === 'envoyee' || prev === 'partiellement_payee') && nextStatut === 'payee') {
        const reste = round2(totalTTC - prevPaye)
        if (reste > EPS) {
          await tx.facturePaiement.create({
            data: {
              factureId: id,
              date: dateFacture,
              montant: reste,
              mode: null,
              note: 'Solde (marqué payée)',
            },
          })
          await tx.moneyIn.create({
            data: {
              date: dateFacture,
              amount: reste,
              type: 'MECA',
              description: `Facture ${numero} (solde)`,
              payment_method: null,
            },
          })
        }
        return (await tx.facture.update({
          where: { id },
          data: {
            statut: 'payee',
            montant_paye: totalTTC,
            numero: body.numero !== undefined ? body.numero.trim() : undefined,
            date: body.date !== undefined ? body.date.trim() : undefined,
            clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
            client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
            client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
            client_adresse: body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
            client_matricule_fiscale:
              body.clientMatriculeFiscale !== undefined
                ? (body.clientMatriculeFiscale ?? '').trim() || null
                : undefined,
            timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
          },
        })) as FactureRow
      }

      if (nextStatut === 'brouillon' && prev !== 'brouillon') {
        return (await tx.facture.update({
          where: { id },
          data: {
            statut: 'brouillon',
            montant_paye: 0,
            numero: body.numero !== undefined ? body.numero.trim() : undefined,
            date: body.date !== undefined ? body.date.trim() : undefined,
            clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
            client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
            client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
            client_adresse: body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
            client_matricule_fiscale:
              body.clientMatriculeFiscale !== undefined
                ? (body.clientMatriculeFiscale ?? '').trim() || null
                : undefined,
            timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
          },
        })) as FactureRow
      }

      return (await tx.facture.update({
        where: { id },
        data: {
          numero: body.numero !== undefined ? body.numero.trim() : undefined,
          date: body.date !== undefined ? body.date.trim() : undefined,
          statut: nextStatut,
          clientId: body.clientId !== undefined ? body.clientId ?? null : undefined,
          client_nom: body.clientNom !== undefined ? body.clientNom.trim() : undefined,
          client_telephone: body.clientTelephone !== undefined ? (body.clientTelephone ?? '').trim() : undefined,
          client_adresse: body.clientAdresse !== undefined ? (body.clientAdresse ?? '').trim() || null : undefined,
          client_matricule_fiscale:
            body.clientMatriculeFiscale !== undefined
              ? (body.clientMatriculeFiscale ?? '').trim() || null
              : undefined,
          timbre: body.timbre !== undefined ? Number(body.timbre) || 0 : undefined,
        },
        include: { lignes: true },
      })) as FactureRow
    })

    const full = (await db.facture.findUnique({
      where: { id },
      include: factureInclude,
    })) as FactureRow
    return res.json(toFacture(full))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /factures/:id - suppression
router.delete('/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.facture.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Facture introuvable' })
    await db.facture.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

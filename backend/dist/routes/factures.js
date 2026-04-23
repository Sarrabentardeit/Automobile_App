"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const db = prisma_1.prisma;
const STATUTS = ['brouillon', 'envoyee', 'payee', 'annulee'];
function toFacture(f) {
    return {
        id: f.id,
        numero: f.numero,
        date: f.date,
        statut: f.statut,
        clientId: f.clientId ?? undefined,
        clientNom: f.client_nom,
        clientTelephone: f.client_telephone,
        clientAdresse: f.client_adresse ?? undefined,
        clientMatriculeFiscale: f.client_matricule_fiscale ?? undefined,
        lignes: f.lignes.map((l) => {
            if (l.type === 'depense') {
                return {
                    type: 'depense',
                    designation: l.designation,
                    montant: l.montant ?? 0,
                };
            }
            if (l.type === 'produit') {
                return {
                    type: 'produit',
                    productId: l.productId ?? 0,
                    designation: l.designation,
                    qte: l.qte ?? 0,
                    prixUnitaireHT: l.prix_unitaire_ht ?? 0,
                };
            }
            if (l.type === 'pieces' || l.type === 'piece_hors_stock') {
                return {
                    type: 'pieces',
                    designation: l.designation,
                    qte: l.qte ?? 0,
                    mtHT: l.mt_ht ?? 0,
                };
            }
            if (l.type === 'autre_produit') {
                return {
                    type: 'autre_produit',
                    designation: l.designation,
                    qte: l.qte ?? 0,
                    mtHT: l.mt_ht ?? 0,
                };
            }
            if (l.type === 'divers') {
                return {
                    type: 'divers',
                    designation: l.designation,
                    qte: l.qte ?? 0,
                    mtHT: l.mt_ht ?? 0,
                };
            }
            return {
                type: 'main_oeuvre',
                designation: l.designation,
                qte: l.qte ?? 0,
                mtHT: l.mt_ht ?? 0,
            };
        }),
        timbre: f.timbre,
        createdAt: f.createdAt.toISOString(),
    };
}
// GET /factures - liste avec filtres simples (q, statut, year, month)
router.get('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const q = req.query.q?.trim();
        const statut = req.query.statut?.trim();
        const year = req.query.year ? Number(req.query.year) : undefined;
        const month = req.query.month ? Number(req.query.month) : undefined;
        const where = {};
        if (q) {
            where.OR = [
                { numero: { contains: q, mode: 'insensitive' } },
                { client_nom: { contains: q, mode: 'insensitive' } },
                { client_telephone: { contains: q, mode: 'insensitive' } },
            ];
        }
        if (statut) {
            if (!STATUTS.includes(statut)) {
                return res.status(400).json({ error: 'statut invalide' });
            }
            where.statut = statut;
        }
        if (year !== undefined && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
            return res.status(400).json({ error: 'year invalide' });
        }
        if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) {
            return res.status(400).json({ error: 'month invalide' });
        }
        if (month !== undefined && year === undefined) {
            return res.status(400).json({ error: 'year est requis quand month est fourni' });
        }
        if (year !== undefined || month !== undefined) {
            where.date = {};
            if (year !== undefined && month !== undefined) {
                const y = String(year);
                const m = String(month).padStart(2, '0');
                where.date.gte = `${y}-${m}-01`;
                where.date.lte = `${y}-${m}-31`;
            }
            else if (year !== undefined) {
                ;
                where.date.gte = `${year}-01-01`;
                where.date.lte = `${year}-12-31`;
            }
        }
        const list = (await db.facture.findMany({
            where: Object.keys(where).length ? where : undefined,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            include: { lignes: true },
        }));
        return res.json(list.map(toFacture));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /factures/:id - détail
router.get('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const f = (await db.facture.findUnique({
            where: { id },
            include: { lignes: true },
        }));
        if (!f)
            return res.status(404).json({ error: 'Facture introuvable' });
        return res.json(toFacture(f));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /factures - créer
router.post('/', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const body = req.body;
        if (!body.numero?.trim() || !body.date?.trim() || !body.clientNom?.trim()) {
            return res.status(400).json({ error: 'numero, date et clientNom sont requis' });
        }
        const lignesInput = Array.isArray(body.lignes) ? body.lignes : [];
        const dataLignes = lignesInput.map((raw) => {
            const l = raw;
            const rawType = l.type;
            const type = rawType === 'piece_hors_stock' ? 'pieces' : rawType;
            if (type === 'depense') {
                return {
                    type: 'depense',
                    designation: String(l.designation ?? '').trim(),
                    montant: Number(l.montant) || 0,
                };
            }
            if (type === 'produit') {
                return {
                    type: 'produit',
                    designation: String(l.designation ?? '').trim(),
                    qte: Number(l.qte) || 0,
                    productId: Number(l.productId) || null,
                    prix_unitaire_ht: Number(l.prixUnitaireHT) || 0,
                };
            }
            if (type === 'main_oeuvre' || type === 'pieces' || type === 'autre_produit' || type === 'divers') {
                return {
                    type,
                    designation: String(l.designation ?? '').trim(),
                    qte: Number(l.qte) || 0,
                    mt_ht: Number(l.mtHT) || 0,
                };
            }
            return {
                type: 'main_oeuvre',
                designation: String(l.designation ?? '').trim(),
                qte: Number(l.qte) || 0,
                mt_ht: Number(l.mtHT) || 0,
            };
        });
        const f = (await db.facture.create({
            data: {
                numero: body.numero.trim(),
                date: body.date.trim(),
                statut: (body.statut ?? 'brouillon').trim(),
                clientId: body.clientId ?? null,
                client_nom: body.clientNom.trim(),
                client_telephone: (body.clientTelephone ?? '').trim(),
                client_adresse: (body.clientAdresse ?? '').trim() || null,
                client_matricule_fiscale: (body.clientMatriculeFiscale ?? '').trim() || null,
                timbre: Number(body.timbre) || 1,
                lignes: {
                    create: dataLignes,
                },
            },
            include: { lignes: true },
        }));
        return res.status(201).json(toFacture(f));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// PUT /factures/:id - mise à jour (remplace les lignes uniquement si fournies)
router.put('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const body = req.body;
        const existing = await db.facture.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Facture introuvable' });
        // Si body.lignes est défini, on remplace toutes les lignes
        if (body.lignes !== undefined) {
            const lignesInput = Array.isArray(body.lignes) ? body.lignes : [];
            const dataLignes = lignesInput.map((raw) => {
                const l = raw;
                const rawType = l.type;
                const type = rawType === 'piece_hors_stock' ? 'pieces' : rawType;
                if (type === 'depense') {
                    return {
                        type: 'depense',
                        designation: String(l.designation ?? '').trim(),
                        montant: Number(l.montant) || 0,
                    };
                }
                if (type === 'produit') {
                    return {
                        type: 'produit',
                        designation: String(l.designation ?? '').trim(),
                        qte: Number(l.qte) || 0,
                        productId: Number(l.productId) || null,
                        prix_unitaire_ht: Number(l.prixUnitaireHT) || 0,
                    };
                }
                if (type === 'main_oeuvre' || type === 'pieces' || type === 'autre_produit' || type === 'divers') {
                    return {
                        type,
                        designation: String(l.designation ?? '').trim(),
                        qte: Number(l.qte) || 0,
                        mt_ht: Number(l.mtHT) || 0,
                    };
                }
                return {
                    type: 'main_oeuvre',
                    designation: String(l.designation ?? '').trim(),
                    qte: Number(l.qte) || 0,
                    mt_ht: Number(l.mtHT) || 0,
                };
            });
            const f = (await db.$transaction([
                db.factureLigne.deleteMany({ where: { factureId: id } }),
                db.facture.update({
                    where: { id },
                    data: {
                        ...(body.numero !== undefined && { numero: body.numero.trim() }),
                        ...(body.date !== undefined && { date: body.date.trim() }),
                        ...(body.statut !== undefined && { statut: body.statut.trim() }),
                        ...(body.clientId !== undefined && { clientId: body.clientId ?? null }),
                        ...(body.clientNom !== undefined && { client_nom: body.clientNom.trim() }),
                        ...(body.clientTelephone !== undefined && { client_telephone: (body.clientTelephone ?? '').trim() }),
                        ...(body.clientAdresse !== undefined && { client_adresse: (body.clientAdresse ?? '').trim() || null }),
                        ...(body.clientMatriculeFiscale !== undefined && {
                            client_matricule_fiscale: (body.clientMatriculeFiscale ?? '').trim() || null,
                        }),
                        ...(body.timbre !== undefined && { timbre: Number(body.timbre) || 0 }),
                        lignes: {
                            create: dataLignes,
                        },
                    },
                    include: { lignes: true },
                }),
            ]));
            const updated = f[1];
            return res.json(toFacture(updated));
        }
        // Sinon, on met simplement à jour les métadonnées sans toucher aux lignes
        const updated = (await db.facture.update({
            where: { id },
            data: {
                ...(body.numero !== undefined && { numero: body.numero.trim() }),
                ...(body.date !== undefined && { date: body.date.trim() }),
                ...(body.statut !== undefined && { statut: body.statut.trim() }),
                ...(body.clientId !== undefined && { clientId: body.clientId ?? null }),
                ...(body.clientNom !== undefined && { client_nom: body.clientNom.trim() }),
                ...(body.clientTelephone !== undefined && { client_telephone: (body.clientTelephone ?? '').trim() }),
                ...(body.clientAdresse !== undefined && { client_adresse: (body.clientAdresse ?? '').trim() || null }),
                ...(body.clientMatriculeFiscale !== undefined && {
                    client_matricule_fiscale: (body.clientMatriculeFiscale ?? '').trim() || null,
                }),
                ...(body.timbre !== undefined && { timbre: Number(body.timbre) || 0 }),
            },
            include: { lignes: true },
        }));
        return res.json(toFacture(updated));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /factures/:id - suppression
router.delete('/:id', (0, auth_1.authenticate)(), async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id))
            return res.status(400).json({ error: 'ID invalide' });
        const existing = await db.facture.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Facture introuvable' });
        await db.facture.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;

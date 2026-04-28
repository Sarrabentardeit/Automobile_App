import { useMemo, useState, useEffect } from 'react'
import { FileDown, FileText, Pencil, Printer, Wallet, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFacturation } from '@/contexts/FacturationContext'
import type { Facture, LigneFacture } from '@/types'
import { FACTURE_STATUT_CONFIG } from '@/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { computeFactureTotals, exportFacturePdf, formatMontantEnLettres, printFacture } from '@/lib/factureUtils'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type FacturePartielleRow = {
  facture: Facture
  factureId: number
  numero: string
  clientNom: string
  factureDate: string
  totalTTC: number
  montantPaye: number
  reste: number
  nbPaiements: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export default function FacturationPaiementsPartielsPage() {
  const navigate = useNavigate()
  const { user, permissions } = useAuth()
  const { factures } = useFacturation()
  const [panelDetail, setPanelDetail] = useState<Facture | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const facturesPartiellementPayees = useMemo(() => {
    const rows: FacturePartielleRow[] = []
    for (const f of factures) {
      if (f.statut !== 'partiellement_payee') continue
      const paiements = f.paiements ?? []
      const totalTTC = computeFactureTotals(f.lignes, f.timbre).totalTTC
      const montantPaye = f.montantPaye ?? paiements.reduce((s, p) => s + p.montant, 0)
      const reste = Math.max(0, round2(totalTTC - montantPaye))
      rows.push({
        facture: f,
        factureId: f.id,
        numero: f.numero,
        clientNom: f.clientNom,
        factureDate: f.date,
        totalTTC,
        montantPaye,
        reste,
        nbPaiements: paiements.length,
      })
    }
    return rows.sort((a, b) => b.factureDate.localeCompare(a.factureDate) || b.factureId - a.factureId)
  }, [factures])

  const ITEMS_PER_PAGE = 30
  const totalPages = Math.max(1, Math.ceil(facturesPartiellementPayees.length / ITEMS_PER_PAGE))
  const paginatedFacturesPartielles = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return facturesPartiellementPayees.slice(start, start + ITEMS_PER_PAGE)
  }, [facturesPartiellementPayees, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [facturesPartiellementPayees.length])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const totalReste = useMemo(() => facturesPartiellementPayees.reduce((s, f) => s + f.reste, 0), [facturesPartiellementPayees])

  const handleExportPdf = async (f: Facture) => {
    await exportFacturePdf(f)
  }

  const renderLigne = (l: LigneFacture) => {
    if (l.type === 'depense') {
      return {
        designation: l.designation,
        qte: '—',
        pu: '—',
        total: `${l.montant.toFixed(2)} DT`,
      }
    }
    if (l.type === 'produit') {
      return {
        designation: l.designation,
        qte: l.qte.toString(),
        pu: `${l.prixUnitaireHT.toFixed(2)} DT`,
        total: `${(l.qte * l.prixUnitaireHT).toFixed(2)} DT`,
      }
    }
    return {
      designation: l.designation,
      qte: l.qte.toString(),
      pu: `${l.mtHT.toFixed(2)} DT`,
      total: `${(l.qte * l.mtHT).toFixed(2)} DT`,
    }
  }

  if (!user) return null
  const canAccess = permissions?.canViewFinance ?? true
  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Wallet className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n&apos;avez pas accès aux paiements partiels.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Paiement partiel vente</h1>
          <p className="text-sm text-gray-500">Liste des factures marquées partiellement payées</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 w-fit">
        <FileText className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-gray-700">{facturesPartiellementPayees.length} factures</span>
        <span className="text-sm font-semibold text-amber-800">Reste total {round2(totalReste).toFixed(2)} DT</span>
      </div>

      <Card padding="none" className="overflow-hidden">
        {facturesPartiellementPayees.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-gray-600 font-medium">Aucune facture partiellement payée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Facture</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date facture</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total facture</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Payé</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Reste</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Nb paiements</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFacturesPartielles.map((f, i) => (
                  <tr
                    key={f.factureId}
                    className={i % 2 === 0 ? 'bg-white border-b border-gray-50' : 'bg-gray-50/40 border-b border-gray-50'}
                    onClick={() => setPanelDetail(f.facture)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap cursor-pointer">
                      {f.numero}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{f.clientNom}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(f.factureDate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{f.totalTTC.toFixed(2)} DT</td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{f.montantPaye.toFixed(2)} DT</td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700 font-medium whitespace-nowrap">
                      {f.reste.toFixed(2)} DT
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{f.nbPaiements}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {facturesPartiellementPayees.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-xs text-gray-500">
            Page {currentPage} / {totalPages} · {facturesPartiellementPayees.length} facture(s)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {panelDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanelDetail(null)} />
          <div className="relative w-full sm:max-w-sm md:max-w-md bg-white shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[90vh] sm:rounded-l-2xl overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate pr-2">Facture {panelDetail.numero}</h3>
              <button onClick={() => setPanelDetail(null)} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 sm:p-4 flex-1 min-h-0 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                <p><span className="text-gray-500">Date :</span> {formatDate(panelDetail.date)}</p>
                <p><span className="text-gray-500">Client :</span> {panelDetail.clientNom}</p>
                <p><span className="text-gray-500">Téléphone :</span> {panelDetail.clientTelephone || '—'}</p>
                <p>
                  <span className="text-gray-500">Statut :</span>{' '}
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', FACTURE_STATUT_CONFIG[panelDetail.statut].badge)}>
                    {FACTURE_STATUT_CONFIG[panelDetail.statut].label}
                  </span>
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-2 text-sm">Lignes facture</h4>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs sm:text-sm min-w-[260px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-medium text-gray-600">Désignation</th>
                        <th className="text-right py-2 font-medium text-gray-600">Qté</th>
                        <th className="text-right py-2 font-medium text-gray-600">P.U. HT</th>
                        <th className="text-right py-2 font-medium text-gray-600">Total HT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {panelDetail.lignes.map((l, i) => {
                        const v = renderLigne(l)
                        return (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-2">{v.designation}</td>
                            <td className="py-2 text-right tabular-nums">{v.qte}</td>
                            <td className="py-2 text-right tabular-nums">{v.pu}</td>
                            <td className="py-2 text-right font-medium tabular-nums">{v.total}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {(() => {
                  const t = computeFactureTotals(panelDetail.lignes, panelDetail.timbre)
                  const paye = panelDetail.montantPaye ?? 0
                  const reste = Math.max(0, round2(t.totalTTC - paye))
                  return (
                    <div className="mt-3 space-y-1 text-sm border-t border-gray-100 pt-3">
                      <div className="flex justify-between text-gray-600"><span>Total HT</span><span className="tabular-nums font-medium">{t.totalHT.toFixed(2)} DT</span></div>
                      <div className="flex justify-between text-gray-600"><span>TVA 19 %</span><span className="tabular-nums font-medium">{t.tva19.toFixed(2)} DT</span></div>
                      <div className="flex justify-between text-gray-600"><span>Dépenses</span><span className="tabular-nums font-medium">{t.depenses.toFixed(2)} DT</span></div>
                      <div className="flex justify-between text-gray-600"><span>Timbre</span><span className="tabular-nums font-medium">{panelDetail.timbre.toFixed(2)} DT</span></div>
                      <div className="flex justify-between font-bold text-gray-900 pt-1"><span>Total TTC</span><span className="tabular-nums">{t.totalTTC.toFixed(2)} DT</span></div>
                      <div className="flex justify-between text-emerald-700"><span>Montant payé</span><span className="tabular-nums font-semibold">{paye.toFixed(2)} DT</span></div>
                      <div className="flex justify-between text-amber-700"><span>Reste</span><span className="tabular-nums font-semibold">{reste.toFixed(2)} DT</span></div>
                      <p className="text-xs text-gray-500 italic">{formatMontantEnLettres(t.totalTTC)}</p>
                    </div>
                  )
                })()}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                <Button size="sm" variant="outline" onClick={() => printFacture(panelDetail)} icon={<Printer className="w-4 h-4" />}>
                  Imprimer
                </Button>
                <Button size="sm" variant="outline" onClick={() => void handleExportPdf(panelDetail)} icon={<FileDown className="w-4 h-4" />}>
                  PDF
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setPanelDetail(null)
                    navigate('/facturation-vente')
                  }}
                  icon={<Pencil className="w-4 h-4" />}
                >
                  Modifier
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

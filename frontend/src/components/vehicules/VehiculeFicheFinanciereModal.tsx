import { useEffect, useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { Vehicule, VehiculeDepenseLigne, VehiculeFicheFinanciere } from '@/types'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  Phone,
  Hash,
  Receipt,
  Wallet,
  Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStockGeneral } from '@/contexts/StockGeneralContext'

function parseMontant(raw: string): number {
  const n = parseFloat(raw.replace(',', '.').replace(/\s/g, ''))
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function formatDt(n: number): string {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DT`
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-shadow'
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5'

interface Props {
  open: boolean
  vehicule: Vehicule | null
  canEdit: boolean
  onClose: () => void
  fetchFiche: (vehiculeId: number) => Promise<VehiculeFicheFinanciere>
  onSaveAvance: (vehiculeId: number, avance: number) => Promise<VehiculeFicheFinanciere>
  onAddDepense: (vehiculeId: number, libelle: string, montant: number) => Promise<VehiculeDepenseLigne>
  onUpdateDepense: (
    vehiculeId: number,
    depenseId: number,
    libelle: string,
    montant: number
  ) => Promise<VehiculeDepenseLigne>
  onDeleteDepense: (vehiculeId: number, depenseId: number) => Promise<void>
  onAddDepenseFromStock: (
    vehiculeId: number,
    productId: number,
    quantite: number
  ) => Promise<VehiculeDepenseLigne>
}

export default function VehiculeFicheFinanciereModal({
  open,
  vehicule,
  canEdit,
  onClose,
  fetchFiche,
  onSaveAvance,
  onAddDepense,
  onUpdateDepense,
  onDeleteDepense,
  onAddDepenseFromStock,
}: Props) {
  const { produits, loading: stockListLoading, refetch: refetchStockCatalogue } = useStockGeneral()
  const [loading, setLoading] = useState(false)
  const [savingAvance, setSavingAvance] = useState(false)
  const [fiche, setFiche] = useState<VehiculeFicheFinanciere | null>(null)
  const [avanceInput, setAvanceInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [newLibelle, setNewLibelle] = useState('')
  const [newMontant, setNewMontant] = useState('')
  const [adding, setAdding] = useState(false)

  const [stockProductId, setStockProductId] = useState('')
  const [stockQuantite, setStockQuantite] = useState('1')
  const [addingStock, setAddingStock] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLibelle, setEditLibelle] = useState('')
  const [editMontant, setEditMontant] = useState('')

  const load = useCallback(async () => {
    if (!vehicule) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchFiche(vehicule.id)
      setFiche(data)
      setAvanceInput(String(data.avance_client ?? 0))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible')
      setFiche(null)
    } finally {
      setLoading(false)
    }
  }, [vehicule, fetchFiche])

  useEffect(() => {
    if (open && vehicule) void load()
    if (!open) {
      setFiche(null)
      setEditingId(null)
      setNewLibelle('')
      setNewMontant('')
      setError(null)
    }
  }, [open, vehicule, load])

  useEffect(() => {
    if (open && canEdit) refetchStockCatalogue()
  }, [open, canEdit, refetchStockCatalogue])

  const total = fiche?.total ?? 0
  const avanceNum = parseMontant(avanceInput)
  const resteLocal = total - avanceNum
  const ligneCount = fiche?.lignes?.length ?? 0

  const handleSaveAvance = async () => {
    if (!vehicule || !canEdit) return
    setSavingAvance(true)
    setError(null)
    try {
      const data = await onSaveAvance(vehicule.id, avanceNum)
      setFiche(data)
      setAvanceInput(String(data.avance_client ?? 0))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setSavingAvance(false)
    }
  }

  const handleAdd = async () => {
    if (!vehicule || !canEdit) return
    const lib = newLibelle.trim()
    const m = parseMontant(newMontant)
    if (!lib) {
      setError('Indiquez une description de dépense.')
      return
    }
    setAdding(true)
    setError(null)
    try {
      await onAddDepense(vehicule.id, lib, m)
      setNewLibelle('')
      setNewMontant('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ajout impossible')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (l: VehiculeDepenseLigne) => {
    setEditingId(l.id)
    setEditLibelle(l.libelle)
    setEditMontant(String(l.montant))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditLibelle('')
    setEditMontant('')
  }

  const saveEdit = async () => {
    if (!vehicule || editingId == null || !canEdit) return
    const lib = editLibelle.trim()
    const m = parseMontant(editMontant)
    if (!lib) {
      setError('Description requise.')
      return
    }
    setError(null)
    try {
      await onUpdateDepense(vehicule.id, editingId, lib, m)
      cancelEdit()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible')
    }
  }

  const handleAddFromStock = async () => {
    if (!vehicule || !canEdit) return
    const pid = parseInt(stockProductId, 10)
    const q = Math.max(1, Math.floor(parseFloat(String(stockQuantite).replace(',', '.')) || 0))
    if (!pid || Number.isNaN(pid)) {
      setError('Choisissez un produit du stock.')
      return
    }
    const p = produits.find(x => x.id === pid)
    if (p && p.quantite < q) {
      setError('Stock insuffisant pour cette quantité.')
      return
    }
    setAddingStock(true)
    setError(null)
    try {
      await onAddDepenseFromStock(vehicule.id, pid, q)
      setStockProductId('')
      setStockQuantite('1')
      refetchStockCatalogue()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sortie stock impossible')
    } finally {
      setAddingStock(false)
    }
  }

  const handleDelete = async (depenseId: number, fromStock: boolean) => {
    if (!vehicule || !canEdit) return
    const msg = fromStock
      ? 'Supprimer cette ligne ? La quantité sera réintégrée au stock.'
      : 'Supprimer cette ligne de dépense ?'
    if (!confirm(msg)) return
    setError(null)
    try {
      await onDeleteDepense(vehicule.id, depenseId)
      if (fromStock) refetchStockCatalogue()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
    }
  }

  if (!vehicule) return null

  const subtitle = `Dossier #${vehicule.id} · ${vehicule.modele}${vehicule.immatriculation ? ` · ${vehicule.immatriculation}` : ''}`

  return (
    <Modal open={open} onClose={onClose} title="Fiche financière" subtitle={subtitle} maxWidth="lg">
      {error && (
        <div
          className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
          role="alert"
        >
          <span className="font-medium">Erreur.</span>
          <span>{error}</span>
        </div>
      )}

      {loading && !fiche ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm font-medium">Chargement de la fiche…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bandeau dossier */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-4 py-4 text-white shadow-lg sm:px-5 sm:py-5">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-orange-500/10" />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <Receipt className="h-3.5 w-3.5" />
                  Récapitulatif atelier
                </p>
                <h3 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{vehicule.modele}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-1 font-mono text-xs sm:text-sm">
                    <Hash className="h-3.5 w-3.5 opacity-60" />
                    {vehicule.immatriculation?.trim() || 'Sans immatriculation'}
                  </span>
                  {vehicule.client_telephone && (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 opacity-70" />
                      {vehicule.client_telephone}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                <span className="text-[10px] font-medium uppercase text-slate-400">Réf.</span>
                <span className="font-mono text-sm font-bold tabular-nums">#{vehicule.id}</span>
              </div>
            </div>
            {ligneCount > 0 && (
              <p className="relative mt-3 border-t border-white/10 pt-3 text-xs text-slate-400">
                {ligneCount} ligne{ligneCount > 1 ? 's' : ''} de dépense · montants en DT (TND)
              </p>
            )}
          </div>

          {/* Tableau des lignes */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Détail des dépenses</h4>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/5">
              <div className="hidden grid-cols-[minmax(0,1fr)_120px_88px] gap-2 border-b border-slate-100 bg-slate-50/90 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                <span>Libellé</span>
                <span className="text-right">Montant</span>
                <span className="text-right">{canEdit ? 'Actions' : ''}</span>
              </div>
              <ul className="divide-y divide-slate-100">
                {(fiche?.lignes ?? []).map((l, idx) => {
                  const fromStock = l.product_id != null && l.product_id > 0
                  return (
                    <li
                      key={l.id}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      <div className="px-3 py-3 sm:py-2.5">
                        {editingId === l.id && canEdit && !fromStock ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              value={editLibelle}
                              onChange={e => setEditLibelle(e.target.value)}
                              className={cn(inputClass, 'flex-1')}
                              placeholder="Description"
                              aria-label="Libellé de la dépense"
                            />
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editMontant}
                              onChange={e => setEditMontant(e.target.value)}
                              className={cn(inputClass, 'w-full sm:w-32')}
                              placeholder="0"
                              aria-label="Montant"
                            />
                            <div className="flex justify-end gap-2">
                              <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                                Annuler
                              </Button>
                              <Button type="button" size="sm" variant="primary" onClick={() => void saveEdit()}>
                                Enregistrer
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_120px_88px] sm:items-center">
                            <div className="flex min-w-0 items-start gap-2">
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500 tabular-nums">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-snug text-slate-900">{l.libelle || '—'}</p>
                                {fromStock && (
                                  <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800 ring-1 ring-emerald-200/60">
                                    <Package className="h-3 w-3" />
                                    Stock
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-right text-sm font-semibold tabular-nums text-slate-900 sm:pt-0">
                              <span className="text-slate-400 sm:hidden">Montant · </span>
                              {formatDt(l.montant)}
                            </p>
                            {canEdit && (
                              <div className="flex justify-end gap-0.5 sm:pt-0">
                                {!fromStock && (
                                  <button
                                    type="button"
                                    onClick={() => startEdit(l)}
                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                    title="Modifier"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(l.id, fromStock)}
                                  className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
                {(!fiche?.lignes || fiche.lignes.length === 0) && (
                  <li className="px-4 py-12 text-center">
                    <Receipt className="mx-auto h-10 w-10 text-slate-200" />
                    <p className="mt-3 text-sm font-medium text-slate-500">Aucune dépense pour ce dossier</p>
                    <p className="mt-1 text-xs text-slate-400">Ajoutez des lignes manuellement ou depuis le stock.</p>
                  </li>
                )}
              </ul>
            </div>
          </section>

          {/* Sortie stock */}
          {canEdit && (
            <section className="rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white p-4 shadow-sm ring-1 ring-emerald-900/5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">Pièces &amp; produits (stock)</h4>
                  <p className="text-[11px] text-emerald-800/80">Sortie inventaire · mouvement enregistré automatiquement</p>
                </div>
              </div>
              {stockListLoading ? (
                <p className="py-4 text-center text-sm text-slate-500">Chargement du catalogue…</p>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className={labelClass} htmlFor="fiche-stock-produit">
                      Produit
                    </label>
                    <select
                      id="fiche-stock-produit"
                      value={stockProductId}
                      onChange={e => setStockProductId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Sélectionner un article…</option>
                      {produits.map(p => (
                        <option key={p.id} value={p.id} disabled={p.quantite <= 0}>
                          {p.nom} — stock {p.quantite} {p.unite ?? 'u.'}
                          {p.prixVente != null && p.prixVente > 0 ? ` (${p.prixVente} DT)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full sm:w-24">
                    <label className={labelClass} htmlFor="fiche-stock-qte">
                      Qté
                    </label>
                    <input
                      id="fiche-stock-qte"
                      type="text"
                      inputMode="numeric"
                      value={stockQuantite}
                      onChange={e => setStockQuantite(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    icon={<Package className="h-4 w-4" />}
                    onClick={() => void handleAddFromStock()}
                    disabled={addingStock || !stockProductId}
                    className="w-full shrink-0 sm:w-auto"
                  >
                    {addingStock ? 'Patientez…' : 'Valider la sortie'}
                  </Button>
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
                Montant facturé : prix de vente × quantité (sinon coût moyen). La suppression d&apos;une ligne stock
                réintègre la quantité.
              </p>
            </section>
          )}

          {/* Saisie manuelle */}
          {canEdit && (
            <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Dépense libre</h4>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className={labelClass} htmlFor="fiche-libelle-manuel">
                    Libellé
                  </label>
                  <input
                    id="fiche-libelle-manuel"
                    value={newLibelle}
                    onChange={e => setNewLibelle(e.target.value)}
                    className={inputClass}
                    placeholder="Ex. Main d'œuvre, frais divers…"
                  />
                </div>
                <div className="w-full sm:w-36">
                  <label className={labelClass} htmlFor="fiche-montant-manuel">
                    Montant (DT)
                  </label>
                  <input
                    id="fiche-montant-manuel"
                    type="text"
                    inputMode="decimal"
                    value={newMontant}
                    onChange={e => setNewMontant(e.target.value)}
                    className={inputClass}
                    placeholder="0,00"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => void handleAdd()}
                  disabled={adding}
                  className="w-full shrink-0 border-slate-300 sm:w-auto"
                >
                  {adding ? 'Ajout…' : 'Ajouter la ligne'}
                </Button>
              </div>
            </section>
          )}

          {!canEdit && (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
              Consultation seule — vous ne pouvez pas modifier cette fiche.
            </p>
          )}

          {/* Synthèse financière */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-xl">
            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Calculator className="h-4 w-4 text-orange-400" />
                Synthèse
              </div>
            </div>
            <div className="grid gap-px bg-white/10 sm:grid-cols-3">
              <div className="bg-slate-900 px-4 py-4 sm:px-5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <Receipt className="h-3.5 w-3.5" />
                  Total dépenses
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl">{formatDt(total)}</p>
              </div>
              <div className="bg-slate-900 px-4 py-4 sm:px-5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <Wallet className="h-3.5 w-3.5" />
                  Acompte client
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={avanceInput}
                    onChange={e => setAvanceInput(e.target.value)}
                    disabled={!canEdit}
                    aria-label="Montant de l'acompte"
                    className={cn(
                      'min-w-0 flex-1 rounded-xl border px-3 py-2 text-right text-base font-semibold tabular-nums shadow-inner focus:outline-none sm:max-w-[140px]',
                      canEdit
                        ? 'border-white/20 bg-white/10 text-white placeholder:text-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30'
                        : 'border-transparent bg-white/5 text-slate-300'
                    )}
                  />
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleSaveAvance()}
                      disabled={savingAvance}
                      className="shrink-0 bg-white/15 text-white hover:bg-white/25"
                    >
                      {savingAvance ? '…' : 'Enregistrer'}
                    </Button>
                  )}
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-600 to-orange-700 px-4 py-4 sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-100/90">Reste à payer</p>
                <p
                  className={cn(
                    'mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl',
                    resteLocal > 0 ? 'text-white' : resteLocal < 0 ? 'text-emerald-100' : 'text-white'
                  )}
                >
                  {formatDt(resteLocal)}
                </p>
                {resteLocal < 0 && (
                  <p className="mt-1 text-[10px] text-emerald-100/90">Crédit ou trop-perçu côté client</p>
                )}
              </div>
            </div>
            <p className="border-t border-white/10 px-4 py-2.5 text-[10px] text-slate-500 sm:px-5">
              Reste = total des dépenses − acompte. Pensez à enregistrer l&apos;acompte après modification.
            </p>
          </section>
        </div>
      )}
    </Modal>
  )
}

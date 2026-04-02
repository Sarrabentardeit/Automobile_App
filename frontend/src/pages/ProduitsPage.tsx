import { useState, useMemo, useCallback, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import type { HuileType, ProduitStock } from '@/types'
import {
  HUILE_TYPES,
  PRODUIT_CATEGORIES_PRESET,
  fluideTypesForCategorieProduit,
  isHuilesCategorieStock,
  isLegacyHuilesLiquidesCombinedLabel,
  normalizeFluideTypeForCategorie,
} from '@/types'
import { useStockGeneral } from '@/contexts/StockGeneralContext'
import { apiFetch } from '@/lib/api'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { Package, Plus, AlertTriangle, Pencil, PackageOpen, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type FormProduit = {
  categorie: string
  nom: string
  reference: string
  quantite: number
  unite: string
  /** Valeur totale stock (TND) — saisie directe hors huiles */
  valeurAchatTTC: number
  /** Prix unitaire conseillé (huiles) ou optionnel */
  prixVente?: number
  seuilAlerte?: number
  fluideType: HuileType
}

function emptyForm(): FormProduit {
  return {
    categorie: 'Pièces',
    nom: '',
    reference: '',
    quantite: 0,
    unite: 'unité',
    valeurAchatTTC: 0,
    prixVente: undefined,
    seuilAlerte: undefined,
    fluideType: 'moteur',
  }
}

export default function ProduitsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, permissions, getAccessToken } = useAuth()
  const { addProduit, updateProduit, removeProduit, refetch: refetchStock } = useStockGeneral()
  const toast = useToast()
  const [products, setProducts] = useState<ProduitStock[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategorie, setFilterCategorie] = useState<string>('tous')
  const [search, setSearch] = useState('')
  const [showAlertsOnly, setShowAlertsOnly] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null)
  const [form, setForm] = useState<FormProduit>(emptyForm)

  const loadProducts = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setProducts([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await apiFetch<ProduitStock[]>('/stock/produits', { token })
      setProducts(Array.isArray(list) ? list : [])
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  /** Stock général / autre : « Nouveau produit » avec navigation vers cette page */
  useEffect(() => {
    const st = location.state as { openNewProduct?: boolean } | null
    if (st?.openNewProduct) {
      setForm(emptyForm())
      setEditingId(null)
      setShowAdd(true)
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  const categoriesFromData = useMemo(() => {
    const s = new Set<string>()
    for (const p of products) {
      const c = p.categorie?.trim()
      if (c) s.add(c)
    }
    return [...s].sort()
  }, [products])

  /** Préréglages + catégories en base (tri FR) — filtres et fiches avec anciennes catégories */
  const allCategoriesMerged = useMemo(() => {
    const merged = new Set<string>([...PRODUIT_CATEGORIES_PRESET, ...categoriesFromData])
    return [...merged].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [categoriesFromData])

  /** Options du select modal : sans libellé combiné obsolète ; sans « Autre » en doublon (voir option unique ci-dessous). */
  const modalCategoryOptions = useMemo(
    () =>
      allCategoriesMerged.filter(
        c =>
          !isLegacyHuilesLiquidesCombinedLabel(c) && c.trim().toLowerCase() !== 'autre'
      ),
    [allCategoriesMerged]
  )

  /** Puces de filtre : ordre = préréglages (`PRODUIT_CATEGORIES_PRESET`), puis catégories hors préset (tri FR) ; sans ancien « Huiles & liquides ». */
  const filterChipCategories = useMemo(() => {
    const merged = new Set<string>([...PRODUIT_CATEGORIES_PRESET, ...categoriesFromData])
    const filtered = [...merged].filter(c => !isLegacyHuilesLiquidesCombinedLabel(c))
    const presetSet = new Set<string>([...PRODUIT_CATEGORIES_PRESET])
    const presetInOrder = [...PRODUIT_CATEGORIES_PRESET].filter(p => filtered.includes(p))
    const extras = filtered
      .filter(c => !presetSet.has(c))
      .sort((a, b) => a.localeCompare(b, 'fr'))
    return [...presetInOrder, ...extras]
  }, [categoriesFromData])

  const filterChips = useMemo(() => ['tous', ...filterChipCategories], [filterChipCategories])

  useEffect(() => {
    if (filterCategorie === 'tous') return
    if (isLegacyHuilesLiquidesCombinedLabel(filterCategorie)) {
      setFilterCategorie('tous')
      return
    }
    if (!filterChipCategories.includes(filterCategorie)) {
      setFilterCategorie('tous')
    }
  }, [filterCategorie, filterChipCategories])

  function isAlert(p: ProduitStock) {
    const s = p.seuilAlerte
    if (s != null && p.quantite < s) return true
    return false
  }

  const filtered = useMemo(() => {
    let list = products
    if (showAlertsOnly) list = list.filter(p => isAlert(p))
    if (filterCategorie !== 'tous') list = list.filter(p => (p.categorie ?? '').trim() === filterCategorie)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        p =>
          p.nom.toLowerCase().includes(q) ||
          (p.categorie ?? '').toLowerCase().includes(q) ||
          (p.reference ?? '').toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => a.nom.localeCompare(b.nom))
  }, [products, filterCategorie, search, showAlertsOnly])

  const alertCount = useMemo(() => products.filter(p => isAlert(p)).length, [products])

  const openEdit = (p: ProduitStock) => {
    const huile = isHuilesCategorieStock(p.categorie) || !!p.fluideType
    const qte = p.quantite ?? 0
    const val = p.valeurAchatTTC ?? 0
    let prixV = p.prixVente
    if (huile && qte > 0 && (prixV == null || Number.isNaN(prixV)) && val > 0) {
      prixV = Math.round((val / qte) * 100) / 100
    }
    setForm({
      categorie: p.categorie?.trim() || 'Pièces',
      nom: p.nom,
      reference: p.reference ?? '',
      quantite: qte,
      unite: p.unite ?? 'unité',
      valeurAchatTTC: val,
      prixVente: prixV,
      seuilAlerte: p.seuilAlerte,
      fluideType: normalizeFluideTypeForCategorie(p.categorie, p.fluideType),
    })
    setEditingId(p.id)
  }

  const openNew = () => {
    setForm(emptyForm())
    setEditingId(null)
    setShowAdd(true)
  }

  const save = async () => {
    if (!form.nom.trim()) return
    const qte = Math.max(0, form.quantite)
    const huile = isHuilesCategorieStock(form.categorie)
    let valeurAchatTTC = Math.max(0, form.valeurAchatTTC)
    if (huile) {
      const pu = form.prixVente ?? 0
      valeurAchatTTC = Math.round(pu * qte * 100) / 100
    }

    const payload: Omit<ProduitStock, 'id'> = {
      nom: form.nom.trim(),
      categorie: form.categorie.trim() || undefined,
      quantite: qte,
      valeurAchatTTC,
      prixVente: form.prixVente,
      reference: form.reference.trim(),
      unite: form.unite.trim() || 'unité',
      seuilAlerte: form.seuilAlerte,
      fluideType: huile ? form.fluideType : null,
    }

    try {
      if (editingId) {
        await updateProduit(editingId, payload)
        toast.success('Produit modifié')
        setEditingId(null)
      } else {
        await addProduit(payload)
        toast.success('Produit ajouté au catalogue')
        setShowAdd(false)
      }
      await loadProducts()
      refetchStock()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    }
  }

  const confirmDeleteProduct = async () => {
    if (deleteProductId == null) return
    const id = deleteProductId
    try {
      await removeProduit(id)
      toast.success('Produit supprimé')
      setDeleteProductId(null)
      if (editingId === id) {
        setEditingId(null)
        setShowAdd(false)
      }
      await loadProducts()
      refetchStock()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  const huileForm = isHuilesCategorieStock(form.categorie)

  const fluideTypeKeys = useMemo(
    () => fluideTypesForCategorieProduit(form.categorie),
    [form.categorie]
  )

  useEffect(() => {
    if (!huileForm) return
    const allowed = fluideTypesForCategorieProduit(form.categorie)
    setForm(f => {
      if (allowed.includes(f.fluideType)) return f
      return { ...f, fluideType: allowed[0] ?? 'moteur' }
    })
  }, [form.categorie, huileForm])

  const catTrim = form.categorie.trim()
  const isCustomCategorie =
    catTrim.length === 0 || !modalCategoryOptions.includes(catTrim)

  if (!user) return null

  if (!permissions?.canViewInventory) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès au catalogue produits.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto pb-12 px-3 sm:px-4">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white">
              <Package className="w-5 h-5" />
            </span>
            Produits
          </h1>
          <p className="text-sm text-gray-500 mt-1">Catalogue — chargement…</p>
        </header>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-12 px-3 sm:px-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white">
              <Package className="w-5 h-5" />
            </span>
            Produits
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Catalogue : créer et modifier les fiches produits — même inventaire que le{' '}
            <Link to="/stock-general" className="text-amber-700 font-medium hover:underline inline-flex items-center gap-1">
              <PackageOpen className="w-3.5 h-3.5" />
              stock général
            </Link>
            {' '}(quantités et mouvements).
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {alertCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowAlertsOnly(prev => !prev)
                if (!showAlertsOnly) {
                  setFilterCategorie('tous')
                  setSearch('')
                }
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                showAlertsOnly
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              {alertCount} alerte{alertCount > 1 ? 's' : ''}{showAlertsOnly ? ' · filtre' : ''}
            </button>
          )}
          <Button onClick={openNew} icon={<Plus className="w-4 h-4" />}>
            Ajouter un produit
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <input
            type="search"
            placeholder="Rechercher (nom, catégorie, référence…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            {filterChips.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategorie(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border',
                  filterCategorie === cat
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                )}
              >
                {cat === 'tous' ? 'Tous' : cat}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card padding="lg" className="text-center py-14">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Aucun produit</p>
            <p className="text-sm text-gray-400 mt-1">
              {filterCategorie !== 'tous' || search ? 'Modifiez les filtres ou ajoutez un produit.' : 'Ajoutez votre premier produit au catalogue.'}
            </p>
            <Button className="mt-4" onClick={openNew} icon={<Plus className="w-4 h-4" />}>
              Ajouter un produit
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(p => {
              const huile = isHuilesCategorieStock(p.categorie) || !!p.fluideType
              const t = normalizeFluideTypeForCategorie(p.categorie, p.fluideType)
              return (
                <Card
                  key={p.id}
                  padding="none"
                  className={cn(
                    'overflow-hidden transition-shadow hover:shadow-md',
                    isAlert(p) && 'border-amber-200 bg-amber-50/30'
                  )}
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold border bg-gray-50 text-gray-700 border-gray-200">
                          {p.categorie?.trim() || '—'}
                        </span>
                        {huile && (
                          <span className={cn('inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold border', HUILE_TYPES[t].color)}>
                            {HUILE_TYPES[t].label}
                          </span>
                        )}
                        {isAlert(p) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-200 text-amber-900">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Stock bas
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900">{p.nom}</p>
                      <p className="text-sm text-gray-500">Réf. {p.reference || '—'}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 tabular-nums">{p.quantite}</p>
                        <p className="text-xs text-gray-500">{p.unite ?? 'unité'}</p>
                        {p.seuilAlerte != null && (
                          <p className="text-xs text-gray-400">Seuil {p.seuilAlerte}</p>
                        )}
                        {p.prixVente != null && (
                          <p className="text-xs text-gray-600 mt-1">{p.prixVente.toFixed(2)} DT / {p.unite ?? 'u.'}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteProductId(p.id)}
                          className="p-2.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={showAdd || editingId !== null}
        onClose={() => { setShowAdd(false); setEditingId(null) }}
        title={editingId ? 'Modifier le produit' : 'Nouveau produit'}
        subtitle={huileForm ? 'Huiles ou liquides — champs adaptés' : 'Saisissez la catégorie et les informations du catalogue'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              value={isCustomCategorie ? '__autre__' : catTrim}
              onChange={e => {
                const v = e.target.value
                if (v === '__autre__') setForm(f => ({ ...f, categorie: '' }))
                else
                  setForm(f => {
                    const next = { ...f, categorie: v }
                    if (isHuilesCategorieStock(v)) {
                      const allowed = fluideTypesForCategorieProduit(v)
                      if (!allowed.includes(f.fluideType)) next.fluideType = allowed[0] ?? 'moteur'
                    }
                    return next
                  })
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm bg-white"
            >
              {modalCategoryOptions.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__autre__">Autre</option>
            </select>
            {isCustomCategorie && (
              <input
                type="text"
                value={form.categorie}
                onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
                className="mt-2 w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                placeholder="Nom de la catégorie"
              />
            )}
          </div>
          <Input
            label="Nom du produit"
            value={form.nom}
            onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder="Ex. Rotule AV, 5W30 synthétique…"
          />
          <Input
            label="Référence"
            value={form.reference}
            onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
            placeholder="Réf. fournisseur ou interne"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantité en stock"
              type="number"
              min={0}
              value={form.quantite}
              onChange={e => setForm(f => ({ ...f, quantite: Number(e.target.value) || 0 }))}
            />
            <Input
              label="Unité"
              value={form.unite}
              onChange={e => setForm(f => ({ ...f, unite: e.target.value }))}
              placeholder="L, pièce, jeu…"
            />
          </div>

          {huileForm ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de fluide</label>
                <select
                  value={form.fluideType}
                  onChange={e => setForm(f => ({ ...f, fluideType: e.target.value as HuileType }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                  {fluideTypeKeys.map(t => (
                    <option key={t} value={t}>{HUILE_TYPES[t].label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Prix unitaire (DT)"
                type="number"
                min={0}
                step={0.1}
                value={form.prixVente ?? ''}
                onChange={e =>
                  setForm(f => ({
                    ...f,
                    prixVente: e.target.value === '' ? undefined : Number(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-gray-500">
                Valeur stock estimée :{' '}
                {((form.prixVente ?? 0) * form.quantite).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} TND
              </p>
            </>
          ) : (
            <Input
              label="Valeur totale du stock (TND)"
              type="number"
              min={0}
              step={0.01}
              value={form.valeurAchatTTC}
              onChange={e => setForm(f => ({ ...f, valeurAchatTTC: Number(e.target.value) || 0 }))}
            />
          )}

          {!huileForm && (
            <Input
              label="Prix de vente conseillé (optionnel, DT)"
              type="number"
              min={0}
              step={0.1}
              value={form.prixVente ?? ''}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  prixVente: e.target.value === '' ? undefined : Number(e.target.value) || 0,
                }))
              }
            />
          )}

          <Input
            label="Seuil d’alerte stock bas (optionnel)"
            type="number"
            min={0}
            value={form.seuilAlerte ?? ''}
            onChange={e => setForm(f => ({ ...f, seuilAlerte: e.target.value === '' ? undefined : Number(e.target.value) }))}
          />

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditingId(null) }} className="flex-1">
              Annuler
            </Button>
            <Button onClick={save} className="flex-1" disabled={!form.nom.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteProductId !== null}
        onClose={() => setDeleteProductId(null)}
        title="Supprimer le produit"
        maxWidth="sm"
      >
        <p className="text-gray-600 text-sm">
          {deleteProductId != null && (
            <>
              Supprimer «{' '}
              <span className="font-semibold text-gray-800">
                {products.find(x => x.id === deleteProductId)?.nom ?? 'ce produit'}
              </span>
              » du catalogue ? Cette action est définitive.
            </>
          )}
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setDeleteProductId(null)}>
            Annuler
          </Button>
          <Button
            variant="outline"
            onClick={() => void confirmDeleteProduct()}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}

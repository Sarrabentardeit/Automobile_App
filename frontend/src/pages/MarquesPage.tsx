import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import {
  createMarque,
  deactivateMarque,
  fetchMarques,
  marqueLogoUrl,
  updateMarque,
  type Marque,
} from '@/lib/marquesApi'
import { cn } from '@/lib/utils'

const MAX_LOGO_BYTES = 5 * 1024 * 1024
const PAGE_SIZE = 12

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Lecture impossible'))
    reader.readAsDataURL(file)
  })
}

export default function MarquesPage() {
  const { getAccessToken, permissions, user } = useAuth()
  const toast = useToast()
  const canManage =
    user?.role === 'admin' ||
    user?.role === 'responsable' ||
    Boolean(permissions?.canEditVehicule || permissions?.canManageUsers)

  const [marques, setMarques] = useState<Marque[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Marque | null>(null)
  const [nom, setNom] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    try {
      const list = await fetchMarques(token, { all: true })
      setMarques(list)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur chargement')
      setMarques([])
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, toast])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return marques
    return marques.filter(m => m.nom.toLowerCase().includes(q) || m.slug.includes(q))
  }, [marques, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const openAdd = () => {
    setEditing(null)
    setNom('')
    setLogoDataUrl(null)
    setPreviewUrl(null)
    setRemoveLogo(false)
    setShowForm(true)
  }

  const openEdit = (m: Marque) => {
    setEditing(m)
    setNom(m.nom)
    setLogoDataUrl(null)
    setPreviewUrl(m.logoUrl ? marqueLogoUrl(m.logoUrl) : null)
    setRemoveLogo(false)
    setShowForm(true)
  }

  const onPickLogo = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Choisissez une image (JPEG, PNG, WebP)')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Image trop lourde (max 5 Mo)')
      return
    }
    try {
      const dataUrl = await readFileAsDataUrl(file)
      setLogoDataUrl(dataUrl)
      setPreviewUrl(dataUrl)
      setRemoveLogo(false)
    } catch {
      toast.error('Impossible de lire l’image')
    }
  }

  const save = async () => {
    const token = getAccessToken()
    if (!token || !nom.trim()) {
      toast.error('Nom de marque requis')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateMarque(token, editing.id, {
          nom: nom.trim(),
          logoDataUrl: logoDataUrl ?? undefined,
          removeLogo: removeLogo || undefined,
        })
        toast.success('Marque mise à jour')
      } else {
        await createMarque(token, {
          nom: nom.trim(),
          logoDataUrl: logoDataUrl ?? undefined,
        })
        toast.success('Marque ajoutée')
      }
      setShowForm(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (m: Marque) => {
    if (!window.confirm(`Désactiver la marque « ${m.nom} » ?`)) return
    const token = getAccessToken()
    if (!token) return
    try {
      await deactivateMarque(token, m.id)
      toast.success('Marque désactivée')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const reactivate = async (m: Marque) => {
    const token = getAccessToken()
    if (!token) return
    try {
      await updateMarque(token, m.id, { actif: true })
      toast.success('Marque réactivée')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur')
    }
  }

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Marques</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {marques.filter(m => m.actif).length} active(s) · logos visibles dans Véhicules
          </p>
        </div>
        {canManage ? (
          <Button onClick={openAdd} icon={<Plus className="w-4 h-4" />}>
            Ajouter une marque
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une marque…"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-16">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          Aucune marque
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {pageItems.map(m => (
              <div
                key={m.id}
                className={cn(
                  'bg-white rounded-2xl border p-4 flex flex-col gap-3',
                  m.actif ? 'border-gray-200' : 'border-gray-100 opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {m.logoUrl ? (
                      <img
                        src={marqueLogoUrl(m.logoUrl)}
                        alt={m.nom}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Tag className="w-6 h-6 text-orange-400" />
                    )}
                  </div>
                  {!m.actif ? (
                    <span className="text-[10px] font-bold uppercase text-gray-400">Inactive</span>
                  ) : null}
                </div>
                <p className="font-bold text-gray-900 truncate">{m.nom}</p>
                {canManage ? (
                  <div className="flex gap-1.5 mt-auto">
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      className="flex-1 h-9 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1 text-xs font-semibold"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    {m.actif ? (
                      <button
                        type="button"
                        onClick={() => void deactivate(m)}
                        className="h-9 w-9 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 flex items-center justify-center"
                        title="Désactiver"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void reactivate(m)}
                        className="flex-1 h-9 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 text-xs font-semibold"
                      >
                        Réactiver
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gray-500">
                Marques — page {page} sur {totalPages} ({filtered.length} résultat
                {filtered.length > 1 ? 's' : ''})
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Modifier la marque' : 'Ajouter une marque'}
        subtitle="Nom + logo (optionnel)"
        maxWidth="md"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Annuler
            </Button>
            <Button onClick={() => void save()} disabled={saving} className="flex-1">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
              {previewUrl && !removeLogo ? (
                <img src={previewUrl} alt="" className="w-full h-full object-contain p-2" />
              ) : (
                <Tag className="w-10 h-10 text-gray-300" />
              )}
            </div>
            <div className="flex gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer hover:bg-slate-800">
                <ImagePlus className="w-3.5 h-3.5" />
                Logo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    void onPickLogo(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
              {(previewUrl || editing?.logoUrl) && !removeLogo ? (
                <button
                  type="button"
                  onClick={() => {
                    setLogoDataUrl(null)
                    setPreviewUrl(null)
                    setRemoveLogo(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  Retirer
                </button>
              ) : null}
            </div>
          </div>
          <Input
            id="marque_nom"
            label="Nom de la marque"
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder="Ex: Audi, Jetour…"
            required
          />
        </div>
      </Modal>
    </div>
  )
}

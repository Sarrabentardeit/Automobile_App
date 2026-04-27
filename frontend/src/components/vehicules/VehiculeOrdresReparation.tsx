import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useClients } from '@/contexts/ClientsContext'
import { useUsers } from '@/contexts/UsersContext'
import { useOrdreReparationsApi } from '@/hooks/useOrdreReparationsApi'
import { useToast } from '@/contexts/ToastContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import OrdreReparationExcelForm, {
  complementFormToJson,
  complementFromOrdreJson,
  defaultComplementForm,
  type ExcelFormState,
} from '@/components/vehicules/OrdreReparationExcelForm'
import { buildOrdreReparationDocumentHtml, GARAGE_NAME_ORDRE } from '@/components/vehicules/ordreReparationTemplate'
import type { Vehicule } from '@/types'
import type { OrdreReparation, VoyantEtat } from '@/types'
import { formatDate, getUserDisplayName } from '@/lib/utils'
import { ClipboardList, Plus, Pencil, Printer, Trash2, FileSpreadsheet } from 'lucide-react'

type FormState = ExcelFormState

const LIGNES_MODELE: string[] = [
  'VERIFICATION NIVEAU LIQUIDE REFROIDISSEMENT',
  "VERIFICATION NIVEAU D'HUILE MOTEUR",
  'VERIFICATION NIVEAU HUILE FREIN',
  'INSPECTION DISQUES ET PLAQUETTES DE FREIN',
  'INSPECTION PNEUS',
  'DIAGNOSTIC',
]

const VOYANT_KEYS = ['moteur', 'airbag', 'abs', 'carburant', 'prechauffage', 'pression', 'batterie', 'huile']
const emptyVoyants = (): Record<string, VoyantEtat> =>
  Object.fromEntries(VOYANT_KEYS.map(k => [k, '' as VoyantEtat])) as Record<string, VoyantEtat>

function ordreToForm(o: OrdreReparation): FormState {
  const cj = o.carrosserieJson ?? {}
  return {
    clientNom: o.clientNom,
    clientTelephone: o.clientTelephone,
    voiture: o.voiture,
    immatriculation: o.immatriculation,
    kilometrage: o.kilometrage == null ? '' : String(o.kilometrage),
    dateEntree: o.dateEntree,
    technicien: o.technicien,
    vin: o.vin,
    rempliPar: o.rempliPar,
    carrosserie: {
      avG: cj.avG ?? cj['avG'] ?? '',
      avD: cj.avD ?? '',
      arG: cj.arG ?? '',
      arD: cj.arD ?? '',
      toit: cj.toit ?? '',
    },
    voyants: { ...emptyVoyants(), ...(o.voyantsJson as Record<string, VoyantEtat> | null) },
    lignes: o.lignes.map(l => ({
      description: l.description,
      statut: l.statut,
      ordre: l.ordre,
    })),
    complement: complementFromOrdreJson(o.complementJson),
  }
}

function formToPayload(f: FormState) {
  const km = f.kilometrage.trim() === '' ? null : Math.max(0, parseInt(f.kilometrage, 10) || 0)
  return {
    clientNom: f.clientNom,
    clientTelephone: f.clientTelephone,
    voiture: f.voiture,
    immatriculation: f.immatriculation,
    kilometrage: km,
    dateEntree: f.dateEntree,
    technicien: f.technicien,
    vin: f.vin,
    rempliPar: f.rempliPar,
    carrosserieJson: f.carrosserie,
    voyantsJson: f.voyants,
    complementJson: complementFormToJson(f.complement),
    lignes: f.lignes.map((l, i) => ({
      description: l.description,
      statut: l.statut,
      ordre: l.ordre ?? i,
    })),
  }
}

type Props = { vehicule: Vehicule }

export default function VehiculeOrdresReparation({ vehicule }: Props) {
  const { user, getAccessToken } = useAuth()
  const { clients } = useClients()
  const { users } = useUsers()
  const toast = useToast()
  const { list: fetchList, create, update, remove, downloadExcel } = useOrdreReparationsApi(getAccessToken)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  /** Évite de relancer l’API à chaque rendu (fetchList instable → useCallback load changeait en boucle). */
  const fetchListRef = useRef(fetchList)
  fetchListRef.current = fetchList

  const [list, setList] = useState<OrdreReparation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OrdreReparation | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const canEdit =
    user?.role === 'admin' ||
    user?.role === 'responsable' ||
    user?.permissions?.canEditVehicule ||
    user?.permissions?.canAddVehicule ||
    user?.permissions?.canChangeEtat

  const technicienDefaut = useMemo(
    () => getUserDisplayName(vehicule.technicien_id, users),
    [vehicule.technicien_id, users]
  )

  const vehiculeId = vehicule.id

  /** Chargement initial : seulement quand l’id change (aucune dépendance sur des fonctions instables). */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const rows = await fetchListRef.current(vehiculeId)
        if (cancelled) return
        setList(rows)
      } catch (e) {
        if (cancelled) return
        setList([])
        setLoadError(e instanceof Error ? e.message : 'Impossible de charger les ordres')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [vehiculeId])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const rows = await fetchListRef.current(vehiculeId)
      setList(rows)
    } catch (e) {
      setList([])
      setLoadError(e instanceof Error ? e.message : 'Impossible de charger les ordres')
    } finally {
      setLoading(false)
    }
  }, [vehiculeId])

  const openCreate = () => {
    const client = (clients ?? []).find(c => c.telephone === vehicule.client_telephone)
    setForm({
      clientNom: client?.nom ?? '',
      clientTelephone: vehicule.client_telephone ?? '',
      voiture: vehicule.modele,
      immatriculation: vehicule.immatriculation ?? '',
      kilometrage: '',
      dateEntree: vehicule.date_entree,
      technicien: technicienDefaut && technicienDefaut !== '—' ? technicienDefaut : '',
      vin: '',
      rempliPar: user?.nom_complet?.trim() ?? '',
      carrosserie: { avG: '', avD: '', arG: '', arD: '', toit: '' },
      voyants: emptyVoyants(),
      lignes: LIGNES_MODELE.map((description, i) => ({ description, statut: 'en_attente' as const, ordre: i })),
      complement: defaultComplementForm(),
    })
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (o: OrdreReparation) => {
    setForm(ordreToForm(o))
    setEditing(o)
    setModalOpen(true)
  }

  const printOrdre = (o: OrdreReparation) => {
    const w = window.open('', '_blank')
    if (!w) {
      toast.error('Autorisez les pop-ups pour imprimer')
      return
    }
    w.document.write(buildOrdreReparationDocumentHtml(o))
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 250)
  }

  const submit = async () => {
    if (!form) return
    setSaving(true)
    try {
      const payload = formToPayload(form)
      if (editing) {
        await update(vehicule.id, editing.id, payload)
        toast.success('Ordre de réparation enregistré')
      } else {
        await create(vehicule.id, payload)
        toast.success('Ordre de réparation créé')
      }
      setModalOpen(false)
      setForm(null)
      setEditing(null)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setSaving(true)
    try {
      await remove(vehicule.id, id)
      toast.success('Fiche supprimée')
      setDeleteId(null)
      void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div id="ordre-reparation" className="scroll-mt-24">
      <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-indigo-600" />
        Ordres de réparation
      </h2>
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <p className="text-sm text-gray-600">
            Une fiche par entrée atelier, imprimable (modèle {GARAGE_NAME_ORDRE}, présentation type Excel).
          </p>
          {canEdit && (
            <Button type="button" size="sm" onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
              Nouvel ordre
            </Button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : loadError ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Impossible de charger les ordres</p>
            <p className="text-amber-800/90 mt-1">{loadError}</p>
            <p className="text-xs text-amber-700/80 mt-2">
              Vérifiez que le backend est démarré, que la migration Prisma a été appliquée (<code className="bg-amber-100 px-1 rounded">npx prisma migrate deploy</code>
              ) puis <strong className="font-semibold">npx prisma generate</strong>.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
              Réessayer
            </Button>
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun ordre de réparation pour ce véhicule.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map(o => (
              <li key={o.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {o.numero || `OR #${o.id}`}
                    <span className="font-normal text-gray-500 text-sm ml-2">{formatDate(o.dateEntree)}</span>
                  </p>
                  <p className="text-xs text-gray-500">Par {o.rempliPar || '—'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => printOrdre(o)}
                    icon={<Printer className="w-3.5 h-3.5" />}
                  >
                    Aperçu
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={downloadingId === o.id}
                    onClick={async () => {
                      setDownloadingId(o.id)
                      try {
                        await downloadExcel(vehicule.id, o.id, o.numero)
                      } catch {
                        toast.error('Impossible de générer le fichier Excel')
                      } finally {
                        setDownloadingId(null)
                      }
                    }}
                    icon={<FileSpreadsheet className="w-3.5 h-3.5 text-green-700" />}
                  >
                    {downloadingId === o.id ? 'Génération…' : 'Excel (.xlsx)'}
                  </Button>
                  {canEdit && (
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(o)} icon={<Pencil className="w-3.5 h-3.5" />}>
                      Modifier
                    </Button>
                  )}
                  {canEdit && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteId(o.id)} icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={modalOpen && !!form}
        onClose={() => {
          if (!saving) {
            setModalOpen(false)
            setForm(null)
            setEditing(null)
          }
        }}
        title={editing ? `Modifier — ${editing.numero || ''}` : 'Nouvel ordre de réparation'}
        subtitle="Mise en page identique à la feuille Excel atelier (bordures, grilles, schéma)"
        maxWidth="2xl"
      >
        {form && (
          <div className="space-y-3">
            <OrdreReparationExcelForm
              form={form}
              setForm={setForm}
              canEdit={Boolean(canEdit)}
              onAddLigne={() =>
                setForm(f => f && { ...f, lignes: [...f.lignes, { description: '', statut: 'en_attente', ordre: f.lignes.length }] })
              }
              onAddPiece={() =>
                setForm(
                  f =>
                    f && {
                      ...f,
                      complement: {
                        ...f.complement,
                        pieces: [...f.complement.pieces, { quantite: '', produit: '' }],
                      },
                    }
                )
              }
            />
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-200">
              <Button type="button" variant="ghost" onClick={() => (setModalOpen(false), setForm(null), setEditing(null))} disabled={saving}>
                Annuler
              </Button>
              {canEdit && (
                <Button type="button" onClick={() => void submit()} disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {deleteId != null && (
        <Modal open onClose={() => setDeleteId(null)} title="Supprimer la fiche ?" maxWidth="sm">
          <p className="text-sm text-gray-600 mb-4">Cette action est définitive.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeleteId(null)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" variant="danger" onClick={() => void handleDelete(deleteId)} disabled={saving}>
              Supprimer
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

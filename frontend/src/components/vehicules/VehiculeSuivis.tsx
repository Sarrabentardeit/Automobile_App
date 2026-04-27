import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, Eye, Download, Printer } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useSuivisApi } from '../../hooks/useSuivisApi'
import type { VehiculeSuivi, VehiculeSuiviInput } from '../../types'
import SuiviForm from './SuiviForm'
import { buildSuiviDocumentHtml } from './suiviTemplate'

interface Props {
  vehiculeId: number
  vehiculeModele?: string
  vehiculeImmat?: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function emptyInput(modele = '', immat = ''): VehiculeSuiviInput {
  return {
    date: today(),
    voiture: modele,
    matricule: immat,
    kilometrage: '',
    travauxEffectues: '',
    travauxProchains: '',
    produitsUtilises: '',
    technicien: '',
    rempliPar: '',
  }
}

type Mode = 'list' | 'new' | 'edit' | 'view'

export default function VehiculeSuivis({ vehiculeId, vehiculeModele = '', vehiculeImmat = '' }: Props) {
  const { getAccessToken } = useAuth()
  const api = useSuivisApi(vehiculeId, getAccessToken)

  // Keep a stable ref to api so load() doesn't re-trigger on every render
  const apiRef = React.useRef(api)
  apiRef.current = api

  const [suivis, setSuivis] = useState<VehiculeSuivi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  const [mode, setMode] = useState<Mode>('list')
  const [selected, setSelected] = useState<VehiculeSuivi | null>(null)
  const [formData, setFormData] = useState<VehiculeSuiviInput>(emptyInput(vehiculeModele, vehiculeImmat))

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiRef.current.list()
      setSuivis(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  // vehiculeId est la seule vraie dépendance — on recharge si le véhicule change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculeId])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setFormData(emptyInput(vehiculeModele, vehiculeImmat))
    setSelected(null)
    setMode('new')
  }

  const openEdit = (s: VehiculeSuivi) => {
    setSelected(s)
    setFormData({
      date: s.date,
      voiture: s.voiture,
      matricule: s.matricule,
      kilometrage: s.kilometrage,
      travauxEffectues: s.travauxEffectues,
      travauxProchains: s.travauxProchains,
      produitsUtilises: s.produitsUtilises,
      technicien: s.technicien,
      rempliPar: s.rempliPar,
    })
    setMode('edit')
  }

  const openView = (s: VehiculeSuivi) => {
    setSelected(s)
    setMode('view')
  }

  const goBack = () => {
    setMode('list')
    setSelected(null)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (mode === 'new') {
        const created = await api.create(formData)
        setSuivis(prev => [created, ...prev])
      } else if (mode === 'edit' && selected) {
        const updated = await api.update(selected.id, formData)
        setSuivis(prev => prev.map(s => s.id === updated.id ? updated : s))
      }
      goBack()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette fiche suivi ?')) return
    try {
      setDeleting(id)
      await api.remove(id)
      setSuivis(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  const handlePrint = (s: VehiculeSuivi) => {
    const html = buildSuiviDocumentHtml(s)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }

  const handleApercu = (s: VehiculeSuivi) => {
    const html = buildSuiviDocumentHtml(s)
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  const handleExcel = async (s: VehiculeSuivi) => {
    try {
      await api.downloadExcel(s.id, s.numero)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  // ──────────────────────────────────────────────────────────
  // RENDER: view (read-only aperçu)
  // ──────────────────────────────────────────────────────────
  if (mode === 'view' && selected) {
    return (
      <div className="p-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={goBack} className="text-sm text-blue-600 hover:underline">← Retour</button>
          <span className="text-gray-400 text-sm">Aperçu – {selected.numero}</span>
          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              onClick={() => handlePrint(selected)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              <Printer size={14} /> Imprimer
            </button>
            <button
              onClick={() => handleApercu(selected)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
            >
              <Eye size={14} /> Aperçu
            </button>
            <button
              onClick={() => handleExcel(selected)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
            >
              <Download size={14} /> Excel
            </button>
          </div>
        </div>
        <SuiviForm data={selected as unknown as VehiculeSuiviInput} setData={() => {}} readOnly numero={selected.numero} />
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────
  // RENDER: new / edit
  // ──────────────────────────────────────────────────────────
  if (mode === 'new' || mode === 'edit') {
    return (
      <div className="p-2">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={goBack} className="text-sm text-blue-600 hover:underline">← Retour</button>
          <span className="text-gray-500 text-sm font-medium">
            {mode === 'new' ? 'Nouvelle fiche suivi' : `Modifier – ${selected?.numero}`}
          </span>
        </div>
        <SuiviForm data={formData} setData={setFormData} numero={mode === 'edit' ? selected?.numero : undefined} />
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button onClick={goBack} className="px-5 py-2 bg-gray-200 rounded hover:bg-gray-300">
            Annuler
          </button>
        </div>
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────
  // RENDER: list
  // ──────────────────────────────────────────────────────────
  return (
    <div className="p-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Fiches Suivi</h3>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          <Plus size={15} /> Nouvelle fiche
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Chargement…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && suivis.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">Aucune fiche suivi pour ce véhicule.</p>
      )}

      {suivis.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-3 py-2 border border-gray-300 font-semibold">N°</th>
                <th className="px-3 py-2 border border-gray-300 font-semibold">Date</th>
                <th className="px-3 py-2 border border-gray-300 font-semibold">Kilométrage</th>
                <th className="px-3 py-2 border border-gray-300 font-semibold">Technicien</th>
                <th className="px-3 py-2 border border-gray-300 font-semibold">Rempli par</th>
                <th className="px-3 py-2 border border-gray-300 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suivis.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 border border-gray-200 font-mono text-xs">{s.numero}</td>
                  <td className="px-3 py-1.5 border border-gray-200">{s.date}</td>
                  <td className="px-3 py-1.5 border border-gray-200">{s.kilometrage || '–'}</td>
                  <td className="px-3 py-1.5 border border-gray-200">{s.technicien || '–'}</td>
                  <td className="px-3 py-1.5 border border-gray-200">{s.rempliPar || '–'}</td>
                  <td className="px-3 py-1.5 border border-gray-200">
                    <div className="flex items-center gap-1.5 justify-center">
                      <button onClick={() => openView(s)} title="Aperçu"
                        className="p-1 rounded hover:bg-indigo-100 text-indigo-600">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(s)} title="Modifier"
                        className="p-1 rounded hover:bg-yellow-100 text-yellow-700">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handlePrint(s)} title="Imprimer"
                        className="p-1 rounded hover:bg-blue-100 text-blue-600">
                        <Printer size={14} />
                      </button>
                      <button onClick={() => handleExcel(s)} title="Télécharger Excel"
                        className="p-1 rounded hover:bg-emerald-100 text-emerald-600">
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                        title="Supprimer"
                        className="p-1 rounded hover:bg-red-100 text-red-500 disabled:opacity-40">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

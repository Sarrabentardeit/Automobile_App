import { useCallback, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { apiFetch } from '@/lib/api'
import type {
  ChecklistItem,
  ChecklistRole,
  ChecklistSection,
  ChecklistTemplatesAdminPayload,
  DailyChecklistData,
} from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { ArrowLeft, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ROLES: { id: ChecklistRole; label: string }[] = [
  { id: 'chef_atelier', label: 'Chef atelier' },
  { id: 'coordinateur', label: 'Coordinateur' },
  { id: 'technicien', label: 'Technicien' },
]

function validateOneTemplate(d: DailyChecklistData, profileLabel: string): string | null {
  if (!d.sections.length) return `${profileLabel} : ajoutez au moins une section.`
  for (const s of d.sections) {
    if (!s.title.trim()) return `${profileLabel} : titre de section vide.`
    if (!s.items.length) return `${profileLabel} : chaque section doit avoir au moins une tâche.`
    for (const it of s.items) {
      if (!it.label.trim()) return `${profileLabel} : toutes les tâches doivent avoir un libellé.`
    }
  }
  return null
}

function cloneData<T>(d: T): T {
  return structuredClone(d)
}

function newItem(sectionId: string): ChecklistItem {
  return {
    id: `${sectionId}-i-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    status: 'todo',
    comment: '',
  }
}

function newSection(): ChecklistSection {
  const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return { id, title: 'Nouvelle section', items: [newItem(id)] }
}

export default function ChecklistTemplatesPage() {
  const navigate = useNavigate()
  const { user, getAccessToken } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState<ChecklistRole>('chef_atelier')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [templates, setTemplates] = useState<Record<ChecklistRole, DailyChecklistData> | null>(null)
  const [defaults, setDefaults] = useState<Record<ChecklistRole, DailyChecklistData> | null>(null)
  const [usingCustom, setUsingCustom] = useState<Record<ChecklistRole, boolean> | null>(null)

  const load = useCallback(async () => {
    const token = getAccessToken()
    if (!token) return
    setLoading(true)
    try {
      const data = await apiFetch<ChecklistTemplatesAdminPayload>('/checklists/admin/templates', { token })
      setTemplates(cloneData(data.effective))
      setDefaults(cloneData(data.defaults))
      setUsingCustom(data.usingCustom)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de charger les modèles')
      setTemplates(null)
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, toast])

  useEffect(() => {
    void load()
  }, [load])

  if (!user) return null
  if (user.role !== 'admin') {
    return <Navigate to="/checklists" replace />
  }

  const canRemoveSection = Boolean(templates && templates[tab].sections.length > 1)

  const patchRole = (role: ChecklistRole, next: DailyChecklistData) => {
    setTemplates(prev => (prev ? { ...prev, [role]: next } : prev))
  }

  const setSectionTitle = (sectionId: string, title: string) => {
    if (!templates) return
    const d = templates[tab]
    patchRole(tab, {
      ...d,
      sections: d.sections.map(s => (s.id === sectionId ? { ...s, title } : s)),
    })
  }

  const setItemLabel = (sectionId: string, itemId: string, label: string) => {
    if (!templates) return
    const d = templates[tab]
    patchRole(tab, {
      ...d,
      sections: d.sections.map(s =>
        s.id !== sectionId
          ? s
          : { ...s, items: s.items.map(it => (it.id === itemId ? { ...it, label } : it)) },
      ),
    })
  }

  const addItem = (sectionId: string) => {
    if (!templates) return
    const d = templates[tab]
    patchRole(tab, {
      ...d,
      sections: d.sections.map(s =>
        s.id !== sectionId ? s : { ...s, items: [...s.items, newItem(sectionId)] },
      ),
    })
  }

  const removeItem = (sectionId: string, itemId: string) => {
    if (!templates) return
    const d = templates[tab]
    const section = d.sections.find(s => s.id === sectionId)
    if (!section || section.items.length <= 1) return
    patchRole(tab, {
      ...d,
      sections: d.sections.map(s =>
        s.id !== sectionId ? s : { ...s, items: s.items.filter(it => it.id !== itemId) },
      ),
    })
  }

  const addSection = () => {
    if (!templates) return
    const d = templates[tab]
    patchRole(tab, { ...d, sections: [...d.sections, newSection()] })
  }

  const removeSection = (sectionId: string) => {
    if (!templates || !canRemoveSection) return
    const d = templates[tab]
    patchRole(tab, { ...d, sections: d.sections.filter(s => s.id !== sectionId) })
  }

  const save = async () => {
    const token = getAccessToken()
    if (!token || !templates) return
    const tabLabel = ROLES.find(r => r.id === tab)?.label ?? tab
    const err = validateOneTemplate(templates[tab], tabLabel)
    if (err) {
      toast.error(err)
      return
    }
    setSaving(true)
    try {
      const data = await apiFetch<ChecklistTemplatesAdminPayload>('/checklists/admin/templates', {
        method: 'PUT',
        token,
        body: JSON.stringify({ templates: { [tab]: templates[tab] } }),
      })
      setTemplates(cloneData(data.effective))
      setDefaults(cloneData(data.defaults))
      setUsingCustom(data.usingCustom)
      toast.success('Enregistré.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const clearCustomization = async () => {
    const token = getAccessToken()
    if (!token) return
    setResetting(true)
    try {
      await apiFetch(`/checklists/admin/templates/${tab}`, { method: 'DELETE', token })
      toast.success('Personnalisation supprimée pour ce profil.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible')
    } finally {
      setResetting(false)
    }
  }

  const applyDefaultsToEditor = () => {
    if (!defaults || !templates) return
    patchRole(tab, cloneData(defaults[tab]))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button size="sm" variant="outline" onClick={() => navigate('/checklists')} icon={<ArrowLeft className="w-4 h-4" />}>
            Retour
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-3 flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-orange-500" />
            Modèles de checklist
          </h1>
        </div>
      </div>

      {loading || !templates || !defaults || !usingCustom ? (
        <p className="text-gray-500 text-sm">Chargement…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200">
            {ROLES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setTab(r.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === r.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                )}
              >
                {r.label}
                {usingCustom[r.id] && <span className="ml-1 text-[10px] text-orange-600 font-semibold">perso.</span>}
              </button>
            ))}
          </div>

          <Card padding="md" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <p className="text-sm text-gray-600">
                {usingCustom[tab]
                  ? 'Ce profil utilise un modèle personnalisé.'
                  : 'Ce profil utilise le modèle livré avec l’application.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {usingCustom[tab] && (
                  <Button size="sm" variant="outline" onClick={() => void clearCustomization()} disabled={resetting}>
                    Supprimer la personnalisation
                  </Button>
                )}
                <Button size="sm" variant="outline" type="button" onClick={applyDefaultsToEditor}>
                  Modèle d’origine → éditeur
                </Button>
              </div>
            </div>

            <div className="space-y-6 pt-2 border-t border-gray-100">
              {templates[tab].sections.map((section, sIdx) => (
                <div key={section.id} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <Input
                        label={`Section ${sIdx + 1}`}
                        value={section.title}
                        onChange={e => setSectionTitle(section.id, e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      title="Supprimer la section"
                      disabled={!canRemoveSection}
                      onClick={() => removeSection(section.id)}
                      className="self-center p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tâches</p>
                    {section.items.map(item => (
                      <div key={item.id} className="flex gap-2 items-center">
                        <Input
                          className="flex-1"
                          value={item.label}
                          placeholder="Libellé de la tâche"
                          onChange={e => setItemLabel(section.id, item.id, e.target.value)}
                        />
                        <button
                          type="button"
                          title="Supprimer"
                          disabled={section.items.length <= 1}
                          onClick={() => removeItem(section.id, item.id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={() => addItem(section.id)} icon={<Plus className="w-4 h-4" />}>
                      Ajouter une tâche
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button size="sm" variant="outline" onClick={addSection} icon={<Plus className="w-4 h-4" />}>
              Ajouter une section
            </Button>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? 'Enregistrement…' : `Enregistrer — ${ROLES.find(r => r.id === tab)?.label ?? tab}`}
              </Button>
              <Button variant="outline" onClick={() => void load()} disabled={loading || saving}>
                Annuler / recharger
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

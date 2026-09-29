import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useOperations } from '@/contexts/OperationsContext'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { Wrench, Plus } from 'lucide-react'

export default function OperationsManagePage() {
  const { user, permissions } = useAuth()
  const { operations, addOperation, updateOperation } = useOperations()
  const toast = useToast()
  const navigate = useNavigate()
  const [nom, setNom] = useState('')
  const [saving, setSaving] = useState(false)
  const [renaming, setRenaming] = useState<{ id: number; nom: string } | null>(null)

  if (!user) return null

  if (!permissions?.canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 font-medium">Seul un administrateur peut gérer les opérations.</p>
      </div>
    )
  }

  const create = async () => {
    const value = nom.trim()
    if (value.length < 2) {
      toast.error('Indiquez un nom, par exemple Opération Skander')
      return
    }
    setSaving(true)
    try {
      const created = await addOperation(value)
      setNom('')
      toast.success('Opération ajoutée')
      navigate(`/operations/${created.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible d’ajouter')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Opérations</h1>
        <p className="text-sm text-gray-500 mt-1">Ajoutez une personne ici. Elle apparaît dans le menu, sans modification du code.</p>
      </header>

      <Card padding="lg" className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Input
              label="Nouvelle opération"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Nom opération"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void create()
              }}
            />
          </div>
          <Button onClick={create} disabled={saving} icon={<Plus className="w-4 h-4" />}>
            Ajouter
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {operations.map((op) => (
          <Card key={op.id} padding="md" className="flex items-center gap-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700">
              <Wrench className="w-4 h-4" />
            </span>
            {renaming?.id === op.id ? (
              <input
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                value={renaming.nom}
                autoFocus
                onChange={(e) => setRenaming({ id: op.id, nom: e.target.value })}
                onKeyDown={async (e) => {
                  if (e.key === 'Escape') setRenaming(null)
                  if (e.key === 'Enter') {
                    const value = renaming.nom.trim()
                    if (value.length < 2) return
                    await updateOperation(op.id, { nom: value })
                    toast.success('Nom mis à jour')
                    setRenaming(null)
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="flex-1 text-left font-medium text-gray-900"
                onClick={() => navigate(`/operations/${op.id}`)}
              >
                {op.nom}
                {!op.actif ? <span className="ml-2 text-xs font-normal text-gray-400">masquée</span> : null}
              </button>
            )}
            <Button variant="ghost" onClick={() => setRenaming({ id: op.id, nom: op.nom })}>
              Renommer
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await updateOperation(op.id, { actif: !op.actif })
                toast.success(op.actif ? 'Retirée du menu' : 'Remise dans le menu')
              }}
            >
              {op.actif ? 'Masquer' : 'Afficher'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

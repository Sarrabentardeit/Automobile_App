import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useTeamMembers } from '@/contexts/TeamMembersContext'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { UsersRound, Plus, Pencil, Trash2, User, Phone } from 'lucide-react'

export default function EquipeMembresPage() {
  const { permissions } = useAuth()
  const { members, addMember, updateMember, removeMember } = useTeamMembers()
  const toast = useToast()
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingPhone, setEditingPhone] = useState('')
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  if (!permissions?.canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <UsersRound className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium">Vous n'avez pas accès à cette page.</p>
      </div>
    )
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    addMember(newName, newPhone)
    toast.success('Membre ajouté avec succès')
    setNewName('')
    setNewPhone('')
  }

  const handleSaveEdit = () => {
    if (editingIndex === null) return
    updateMember(editingIndex, { name: editingName, phone: editingPhone })
    toast.success('Membre modifié avec succès')
    setEditingIndex(null)
    setEditingName('')
    setEditingPhone('')
  }

  const openEdit = (index: number) => {
    setEditingIndex(index)
    setEditingName(members[index].name)
    setEditingPhone(members[index].phone ?? '')
  }

  const handleConfirmDelete = () => {
    if (deleteIndex !== null) {
      removeMember(deleteIndex)
      toast.success('Membre supprimé')
      setDeleteIndex(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersRound className="w-7 h-7 text-emerald-600" />
            Membres équipe
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Liste des membres affichés dans la Caisse. Nom et numéro de téléphone.
          </p>
        </div>
      </div>

      <Card padding="none">
        <div className="px-4 py-4 border-b border-gray-100 flex flex-col gap-3">
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 flex-1">
            <Input
              id="newMember"
              placeholder="Nom du membre"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1"
            />
            <Input
              id="newPhone"
              placeholder="Numéro de téléphone"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              type="tel"
              className="flex-1 sm:max-w-[180px]"
            />
            <Button type="submit" size="sm" icon={<Plus className="w-4 h-4" />} disabled={!newName.trim()}>
              Ajouter
            </Button>
          </form>
        </div>

        <div className="divide-y divide-gray-50">
          {members.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              Aucun membre. Ajoutez un nom et optionnellement un numéro ci-dessus.
            </div>
          ) : (
            members.map((member, index) => (
              <div
                key={`${index}-${member.name}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 block truncate">{member.name}</span>
                  {member.phone ? (
                    <span className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      {member.phone}
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(index)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteIndex(index)}
                    className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal Modifier */}
      <Modal
        open={editingIndex !== null}
        onClose={() => { setEditingIndex(null); setEditingName(''); setEditingPhone('') }}
        title="Modifier le membre"
        subtitle={editingIndex !== null ? members[editingIndex].name : ''}
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            placeholder="Nom du membre"
          />
          <Input
            label="Numéro de téléphone"
            value={editingPhone}
            onChange={e => setEditingPhone(e.target.value)}
            placeholder="Ex. 58118291"
            type="tel"
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setEditingIndex(null); setEditingName(''); setEditingPhone('') }} className="flex-1">
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} className="flex-1" disabled={!editingName.trim()}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmer suppression */}
      <Modal
        open={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        title="Supprimer ce membre ?"
        subtitle={deleteIndex !== null ? `« ${members[deleteIndex].name} » sera retiré de la liste. Il n'apparaîtra plus dans la Caisse.` : ''}
      >
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteIndex(null)} className="flex-1">
            Annuler
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} className="flex-1">
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}

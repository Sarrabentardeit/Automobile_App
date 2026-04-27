import { useEffect, useMemo, useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { FileSpreadsheet, FolderOpen, Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getApiUrl } from '@/lib/api'

type DocItem = { id: string; title: string; fileName: string; usage: string }

type DocMeta = {
  fileName: string
  exists: boolean
  size: number
  updatedAt: string | null
}

export default function DocumentsPage() {
  const { getAccessToken, user } = useAuth()
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState<DocItem[]>([])
  const [metaByFile, setMetaByFile] = useState<Record<string, DocMeta>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUsage, setNewUsage] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUsage, setEditUsage] = useState('')
  const [editFileName, setEditFileName] = useState('')
  const [editReplace, setEditReplace] = useState<File | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  const isAdmin = user?.role === 'admin'

  const loadCards = async () => {
    const token = getAccessToken()
    if (!token) return
    const url = getApiUrl('/documents/cards')
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const data = (await res.json()) as DocItem[]
    setDocs(Array.isArray(data) ? data : [])
  }

  const loadMeta = async () => {
    const token = getAccessToken()
    if (!token) return
    const url = getApiUrl('/documents/templates')
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const list = (await res.json()) as DocMeta[]
    const map: Record<string, DocMeta> = {}
    for (const m of list) map[m.fileName] = m
    setMetaByFile(map)
  }

  useEffect(() => {
    void loadCards()
    void loadMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openTemplate = async (fileName: string) => {
    const token = getAccessToken()
    if (!token) {
      alert('Session expirée, reconnectez-vous.')
      return
    }
    const url = getApiUrl(`/documents/templates/${encodeURIComponent(fileName)}`)
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      alert('Impossible d ouvrir le modèle.')
      return
    }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const openEdit = (doc: DocItem) => {
    setEditId(doc.id)
    setEditTitle(doc.title)
    setEditUsage(doc.usage)
    setEditFileName(doc.fileName)
    setEditReplace(null)
    setEditOpen(true)
  }

  const updateDocument = async () => {
    if (!editId || !editTitle.trim() || !editUsage.trim()) {
      alert('Remplissez le titre et la description.')
      return
    }
    const token = getAccessToken()
    if (!token) {
      alert('Session expirée, reconnectez-vous.')
      return
    }
    setEditSaving(true)
    try {
      let contentBase64: string | undefined
      if (editReplace) {
        const arr = await editReplace.arrayBuffer()
        const bytes = new Uint8Array(arr)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        contentBase64 = btoa(binary)
      }
      const url = getApiUrl(`/documents/cards/${encodeURIComponent(editId)}`)
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          usage: editUsage.trim(),
          ...(contentBase64 ? { contentBase64 } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error ?? 'Erreur mise à jour')
        return
      }
      setEditOpen(false)
      setEditId(null)
      setEditReplace(null)
      await loadCards()
      await loadMeta()
    } finally {
      setEditSaving(false)
    }
  }

  const deleteDocument = async (doc: DocItem) => {
    if (!confirm(`Supprimer « ${doc.title} » ?`)) return
    const token = getAccessToken()
    if (!token) {
      alert('Session expirée, reconnectez-vous.')
      return
    }
    const url = getApiUrl(`/documents/cards/${encodeURIComponent(doc.id)}`)
    const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert((data as { error?: string }).error ?? 'Erreur suppression')
      return
    }
    await loadCards()
    await loadMeta()
  }

  const addDocument = async () => {
    if (!newTitle.trim() || !newUsage.trim() || !newFile) {
      alert('Remplissez titre, description et fichier.')
      return
    }
    const token = getAccessToken()
    if (!token) {
      alert('Session expirée, reconnectez-vous.')
      return
    }
    setSaving(true)
    try {
      const arr = await newFile.arrayBuffer()
      const bytes = new Uint8Array(arr)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      const contentBase64 = btoa(binary)
      const url = getApiUrl('/documents/cards')
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          usage: newUsage.trim(),
          originalFileName: newFile.name,
          contentBase64,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error ?? 'Erreur création document')
        return
      }
      setModalOpen(false)
      setNewTitle('')
      setNewUsage('')
      setNewFile(null)
      await loadCards()
      await loadMeta()
    } finally {
      setSaving(false)
    }
  }

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return docs
    return docs.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.fileName.toLowerCase().includes(q) ||
      d.usage.toLowerCase().includes(q),
    )
  }, [query, docs])

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-orange-500" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Documents</h1>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setEditOpen(false)
              setModalOpen(true)
            }}
          >
            Ajouter document
          </Button>
        )}
      </div>

      <Card padding="sm">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Recherche par nom document..."
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDocs.map((doc) => (
          <Card key={doc.id} className="border-gray-200" padding="sm">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{doc.title}</h2>
                  <p className="text-xs text-gray-500 break-all">{doc.fileName}</p>
                  {metaByFile[doc.fileName] && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {metaByFile[doc.fileName].exists ? 'Disponible' : 'Manquant'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(doc)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-orange-50 hover:text-orange-600"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDocument(doc)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                </div>
              </div>

              <p className="text-sm text-gray-600">{doc.usage}</p>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Wrench className="w-3.5 h-3.5" />}
                  onClick={() => void openTemplate(doc.fileName)}
                >
                  Ouvrir le modele
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditId(null); setEditReplace(null) }}
        title="Modifier le document"
        subtitle="Mettre à jour le titre, la description ou le fichier Excel"
        maxWidth="md"
      >
        <div className="space-y-3">
          <p className="text-xs text-gray-500 break-all">Fichier : {editFileName}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={editUsage}
              onChange={(e) => setEditUsage(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 min-h-[90px] focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remplacer le fichier (optionnel)</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setEditReplace(e.target.files?.[0] ?? null)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
            />
            {editReplace && <p className="text-xs text-gray-500 mt-1">{editReplace.name}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditId(null); setEditReplace(null) }}>Annuler</Button>
            <Button onClick={() => void updateDocument()} disabled={editSaving}>
              {editSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ajouter un document"
        subtitle="Créer une nouvelle carte avec fichier Excel"
        maxWidth="md"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Ex: Suivi diag livraison"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newUsage}
              onChange={(e) => setNewUsage(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 min-h-[90px] focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="Description du document"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fichier Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2"
            />
            {newFile && <p className="text-xs text-gray-500 mt-1">{newFile.name}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={() => void addDocument()} disabled={saving}>
              {saving ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

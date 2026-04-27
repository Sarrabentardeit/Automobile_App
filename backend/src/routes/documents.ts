import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { authenticate, type AuthRequest } from '../middleware/auth'

const router = Router()
const TEMPLATE_DIR = path.join(__dirname, '../../templates')
const CARDS_FILE = path.join(TEMPLATE_DIR, 'documents-cards.json')

type DocumentCard = {
  id: string
  title: string
  fileName: string
  usage: string
}

const DEFAULT_CARDS: DocumentCard[] = [
  { id: 'ordre-reparation', title: 'Ordre de reparation', fileName: 'ordre-reparation-template.xlsx', usage: 'Fiche atelier du vehicule (apercu, impression, export Excel).' },
  { id: 'suivi', title: 'Fiche suivi atelier', fileName: 'suivi-template.xlsx', usage: 'Suivi travaux effectues / prochains et produits utilises.' },
  { id: 'suivi-diag', title: 'Suivi DIAG', fileName: 'suivi-diag-template.xlsx', usage: 'Modele DIAG a centraliser dans l application.' },
  { id: 'suivi-diag-achat', title: 'Suivi DIAG achat', fileName: 'suivi-diag-achat-template.xlsx', usage: 'Modele DIAG achat a centraliser dans l application.' },
]

function isAdmin(req: AuthRequest): boolean {
  return req.user?.role?.toLowerCase() === 'admin'
}

function readCards(): DocumentCard[] {
  try {
    if (!fs.existsSync(CARDS_FILE)) return DEFAULT_CARDS
    const raw = fs.readFileSync(CARDS_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_CARDS
    return parsed.filter(Boolean) as DocumentCard[]
  } catch {
    return DEFAULT_CARDS
  }
}

function writeCards(cards: DocumentCard[]): void {
  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), 'utf-8')
}

function getAllowedFiles(): Set<string> {
  return new Set(readCards().map((c) => c.fileName))
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return cleaned.endsWith('.xlsx') ? cleaned : `${cleaned}.xlsx`
}

router.get('/documents/cards', authenticate(), async (_req, res) => {
  return res.json(readCards())
})

router.put('/documents/cards/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès admin requis' })
    const id = String(req.params.id || '')
    const body = req.body as { title?: string; usage?: string; contentBase64?: string }
    const title = String(body.title ?? '').trim()
    const usage = String(body.usage ?? '').trim()
    const contentBase64 = String(body.contentBase64 ?? '').trim()
    if (!title || !usage) {
      return res.status(400).json({ error: 'Titre et description requis' })
    }
    const cards = readCards()
    const idx = cards.findIndex((c) => c.id === id)
    if (idx < 0) return res.status(404).json({ error: 'Document introuvable' })
    const { fileName } = cards[idx]
    if (contentBase64) {
      const buffer = Buffer.from(contentBase64, 'base64')
      if (!buffer.length) return res.status(400).json({ error: 'Fichier invalide' })
      fs.writeFileSync(path.join(TEMPLATE_DIR, fileName), buffer)
    }
    const updated: DocumentCard = { id, title, usage, fileName }
    const next = [...cards]
    next[idx] = updated
    writeCards(next)
    return res.json(updated)
  } catch (err) {
    console.error('[documents/cards/put]', err)
    return res.status(500).json({ error: 'Erreur mise à jour document' })
  }
})

router.delete('/documents/cards/:id', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès admin requis' })
    const id = String(req.params.id || '')
    const cards = readCards()
    const found = cards.find((c) => c.id === id)
    if (!found) return res.status(404).json({ error: 'Document introuvable' })
    const { fileName } = found
    const newCards = cards.filter((c) => c.id !== id)
    writeCards(newCards)
    const stillUsed = newCards.some((c) => c.fileName === fileName)
    if (!stillUsed) {
      const filePath = path.join(TEMPLATE_DIR, fileName)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    return res.status(204).send()
  } catch (err) {
    console.error('[documents/cards/delete]', err)
    return res.status(500).json({ error: 'Erreur suppression document' })
  }
})

router.post('/documents/cards', authenticate(), async (req: AuthRequest, res) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Accès admin requis' })
    const body = req.body as { title?: string; usage?: string; originalFileName?: string; contentBase64?: string }
    const title = String(body.title ?? '').trim()
    const usage = String(body.usage ?? '').trim()
    const originalFileName = String(body.originalFileName ?? '').trim()
    const contentBase64 = String(body.contentBase64 ?? '').trim()
    if (!title || !usage || !originalFileName || !contentBase64) {
      return res.status(400).json({ error: 'Informations incomplètes' })
    }

    const buffer = Buffer.from(contentBase64, 'base64')
    if (!buffer.length) return res.status(400).json({ error: 'Fichier invalide' })

    const cards = readCards()
    const baseName = sanitizeFileName(originalFileName)
    const ext = '.xlsx'
    const root = baseName.replace(/\.xlsx$/, '')
    let fileName = baseName
    let idx = 1
    while (fs.existsSync(path.join(TEMPLATE_DIR, fileName))) {
      fileName = `${root}-${idx}${ext}`
      idx += 1
    }

    fs.writeFileSync(path.join(TEMPLATE_DIR, fileName), buffer)
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newCard: DocumentCard = { id, title, usage, fileName }
    const updated = [newCard, ...cards]
    writeCards(updated)
    return res.status(201).json(newCard)
  } catch (err) {
    console.error('[documents/cards/create]', err)
    return res.status(500).json({ error: 'Erreur création document' })
  }
})

router.get('/documents/templates', authenticate(), async (_req, res) => {
  try {
    const files = readCards().map(({ fileName }) => {
      const filePath = path.join(TEMPLATE_DIR, fileName)
      const exists = fs.existsSync(filePath)
      const stats = exists ? fs.statSync(filePath) : null
      return {
        fileName,
        exists,
        size: stats?.size ?? 0,
        updatedAt: stats?.mtime?.toISOString?.() ?? null,
      }
    })
    return res.json(files)
  } catch (err) {
    console.error('[documents/templates/list]', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/documents/templates/:fileName', authenticate(), async (req, res) => {
  try {
    const fileName = String(req.params.fileName || '')
    if (!getAllowedFiles().has(fileName)) {
      return res.status(404).json({ error: 'Template introuvable' })
    }
    const filePath = path.join(TEMPLATE_DIR, fileName)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier template absent' })
    }
    return res.download(filePath, fileName)
  } catch (err) {
    console.error('[documents/templates/download]', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router

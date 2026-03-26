import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

const router = Router()
const db = prisma as any

type MoneyInRow = {
  id: number
  date: string
  amount: number
  type: string
  description: string
  payment_method: string | null
}

type MoneyOutRow = {
  id: number
  date: string
  amount: number
  category: string
  description: string
  beneficiary: string | null
  source_ref: string | null
}

const toMoneyInDto = (m: MoneyInRow) => ({
  id: m.id,
  date: m.date,
  amount: m.amount,
  type: m.type,
  description: m.description,
  paymentMethod: m.payment_method ?? undefined,
})

const toMoneyOutDto = (m: MoneyOutRow) => ({
  id: m.id,
  date: m.date,
  amount: m.amount,
  category: m.category,
  description: m.description,
  beneficiary: m.beneficiary ?? undefined,
  sourceRef: m.source_ref ?? undefined,
})

router.get('/in', authenticate(), async (_req, res) => {
  try {
    const rows = (await db.moneyIn.findMany({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    })) as MoneyInRow[]
    return res.json(rows.map(toMoneyInDto))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/in', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      date?: string
      amount?: number
      type?: string
      description?: string
      paymentMethod?: string
    }
    if (!body.date || typeof body.amount !== 'number' || !body.type || !body.description) {
      return res.status(400).json({ error: 'date, amount, type, description requis' })
    }
    const created = (await db.moneyIn.create({
      data: {
        date: body.date,
        amount: body.amount,
        type: body.type.trim(),
        description: body.description.trim(),
        payment_method: (body.paymentMethod ?? '').trim() || null,
      },
    })) as MoneyInRow
    return res.status(201).json(toMoneyInDto(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/in/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as {
      date?: string
      amount?: number
      type?: string
      description?: string
      paymentMethod?: string
    }
    const existing = await db.moneyIn.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Entrée introuvable' })
    const data: Record<string, unknown> = {}
    if (body.date !== undefined) data.date = body.date
    if (body.amount !== undefined) data.amount = body.amount
    if (body.type !== undefined) data.type = body.type.trim()
    if (body.description !== undefined) data.description = body.description.trim()
    if (body.paymentMethod !== undefined) data.payment_method = body.paymentMethod.trim() || null
    const updated = (await db.moneyIn.update({ where: { id }, data })) as MoneyInRow
    return res.json(toMoneyInDto(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/in/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.moneyIn.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Entrée introuvable' })
    await db.moneyIn.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/out', authenticate(), async (_req, res) => {
  try {
    const rows = (await db.moneyOut.findMany({
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
    })) as MoneyOutRow[]
    return res.json(rows.map(toMoneyOutDto))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/out', authenticate(), async (req, res) => {
  try {
    const body = req.body as {
      date?: string
      amount?: number
      category?: string
      description?: string
      beneficiary?: string
      sourceRef?: string
    }
    if (!body.date || typeof body.amount !== 'number' || !body.category || !body.description) {
      return res.status(400).json({ error: 'date, amount, category, description requis' })
    }
    const created = (await db.moneyOut.create({
      data: {
        date: body.date,
        amount: body.amount,
        category: body.category.trim(),
        description: body.description.trim(),
        beneficiary: (body.beneficiary ?? '').trim() || null,
        source_ref: (body.sourceRef ?? '').trim() || null,
      },
    })) as MoneyOutRow
    return res.status(201).json(toMoneyOutDto(created))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/out/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const body = req.body as {
      date?: string
      amount?: number
      category?: string
      description?: string
      beneficiary?: string
      sourceRef?: string
    }
    const existing = await db.moneyOut.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Sortie introuvable' })
    const data: Record<string, unknown> = {}
    if (body.date !== undefined) data.date = body.date
    if (body.amount !== undefined) data.amount = body.amount
    if (body.category !== undefined) data.category = body.category.trim()
    if (body.description !== undefined) data.description = body.description.trim()
    if (body.beneficiary !== undefined) data.beneficiary = body.beneficiary.trim() || null
    if (body.sourceRef !== undefined) data.source_ref = body.sourceRef.trim() || null
    const updated = (await db.moneyOut.update({ where: { id }, data })) as MoneyOutRow
    return res.json(toMoneyOutDto(updated))
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/out/:id', authenticate(), async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
    const existing = await db.moneyOut.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Sortie introuvable' })
    await db.moneyOut.delete({ where: { id } })
    return res.status(204).send()
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


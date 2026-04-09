import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import jwt from 'jsonwebtoken'
import { env } from './config/env'
import authRouter from './routes/auth'
import usersRouter from './routes/users'
import vehiculesRouter from './routes/vehicules'
import stockRouter from './routes/stock'
import clientsRouter from './routes/clients'
import facturesRouter from './routes/factures'
import achatsRouter from './routes/achats'
import contactsImportantsRouter from './routes/contactsImportants'
import fournisseursRouter from './routes/fournisseurs'
import fournisseurTransactionsRouter from './routes/fournisseurTransactions'
import demandesDevisRouter from './routes/demandesDevis'
import clientsDettesRouter from './routes/clientsDettes'
import reclamationsRouter from './routes/reclamations'
import notificationsRouter from './routes/notifications'
import teamMembersRouter from './routes/teamMembers'
import calendarAssignmentsRouter from './routes/calendarAssignments'
import caisseRouter from './routes/caisse'
import monthlyChargesRouter from './routes/monthlyCharges'
import moneyRouter from './routes/money'
import outilsRouter from './routes/outils'
import checklistsRouter from './routes/checklists'
import statsRouter from './routes/stats'
import settingsRouter from './routes/settings'

const app = express()

function canReadUploads(req: express.Request): boolean {
  const header = req.headers.authorization
  let token: string | null = null
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7).trim()
  } else if (typeof req.query.accessToken === 'string' && req.query.accessToken.trim()) {
    token = req.query.accessToken.trim()
  }
  if (!token) return false
  try {
    jwt.verify(token, env.JWT_ACCESS_SECRET)
    return true
  } catch {
    return false
  }
}

app.use(
  helmet({
    // Autorise l'affichage des images hébergées par l'API depuis le frontend (localhost:5175)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)
app.use(
  cors({
    origin:
      env.NODE_ENV === 'development'
        ? (origin, cb) => {
            const allowed = /^https?:\/\/localhost(:\d+)?$/.test(origin ?? '')
            cb(null, allowed ? origin : env.CORS_ORIGIN)
          }
        : env.CORS_ORIGIN,
    credentials: true
  })
)
app.use(express.json({ limit: '12mb' }))
/** Évite cache navigateur / proxy sur les réponses JSON (un poste ne doit pas voir d’anciennes données). */
app.use((req, res, next) => {
  if (req.path.startsWith('/uploads')) return next()
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  next()
})
app.use(morgan('dev'))
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV })
})

app.use('/auth', authRouter)
app.use('/users', usersRouter)
app.use('/vehicules', vehiculesRouter)
app.use('/stock', stockRouter)
app.use('/clients', clientsRouter)
app.use('/factures', facturesRouter)
app.use('/achats', achatsRouter)
app.use('/contacts-importants', contactsImportantsRouter)
app.use('/fournisseurs', fournisseursRouter)
app.use('/fournisseur-transactions', fournisseurTransactionsRouter)
app.use('/demandes-devis', demandesDevisRouter)
app.use('/clients-dettes', clientsDettesRouter)
app.use('/reclamations', reclamationsRouter)
app.use('/notifications', notificationsRouter)
app.use('/team-members', teamMembersRouter)
app.use('/calendar-assignments', calendarAssignmentsRouter)
app.use('/caisse', caisseRouter)
app.use('/charges-mensuelles', monthlyChargesRouter)
app.use('/money', moneyRouter)
app.use('/outils', outilsRouter)
app.use('/checklists', checklistsRouter)
app.use('/stats', statsRouter)
app.use('/settings', settingsRouter)

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Unexpected error' })
})

app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`)
})


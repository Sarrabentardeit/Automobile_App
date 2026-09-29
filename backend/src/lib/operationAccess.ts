import type { Response, NextFunction } from 'express'
import { prisma } from './prisma'
import type { AuthRequest } from '../middleware/auth'

const db = prisma as any

/** `all` = toutes les opérations. Sinon la liste des id autorisés. */
export type OperationAccess = 'all' | number[]

export function allowsOperation(access: OperationAccess, operationId: number) {
  return access === 'all' || access.includes(operationId)
}

export async function operationAccess(req: AuthRequest): Promise<OperationAccess> {
  const role = (req.user?.role ?? '').toLowerCase()
  if (role === 'admin') return 'all'
  const userId = req.user?.sub
  if (!userId) return []
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { permissions: true },
  })
  const perms = (user?.permissions ?? {}) as Record<string, unknown>
  if (!perms.canViewEquipeOutils) return []
  if (!Object.prototype.hasOwnProperty.call(perms, 'operationIds') || perms.operationIds == null) return 'all'
  if (!Array.isArray(perms.operationIds)) return 'all'
  return [...new Set(perms.operationIds.map((n) => Number(n)).filter((n) => Number.isInteger(n)))]
}

export async function requireOperation(
  req: AuthRequest,
  res: Response,
  operationId: number,
): Promise<boolean> {
  const access = await operationAccess(req)
  if (allowsOperation(access, operationId)) return true
  res.status(403).json({ error: 'Accès refusé à cette opération' })
  return false
}

export function requireOperationCle(cle: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const op = await db.operation.findUnique({ where: { cle } })
    if (!op) {
      next()
      return
    }
    const ok = await requireOperation(req, res, op.id)
    if (ok) next()
  }
}

import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export interface AuthPayload {
  sub: number
  email: string
  role: string
  fullName?: string
}

export interface AuthRequest extends Request {
  user?: AuthPayload
}

export const authenticate =
  (required = true) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header) {
      if (!required) return next()
      return res.status(401).json({ error: 'Missing Authorization header' })
    }

    const [, token] = header.split(' ')
    if (!token) {
      if (!required) return next()
      return res.status(401).json({ error: 'Invalid Authorization header' })
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AuthPayload
      req.user = payload
      return next()
    } catch {
      if (!required) return next()
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
  }


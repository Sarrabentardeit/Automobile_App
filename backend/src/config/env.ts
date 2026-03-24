import dotenv from 'dotenv'

dotenv.config()

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value == null) return fallback
  const v = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(v)) return true
  if (['0', 'false', 'no', 'off'].includes(v)) return false
  return fallback
}

const required = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? '4000'),
  DATABASE_URL: required(process.env.DATABASE_URL, 'DATABASE_URL'),
  JWT_ACCESS_SECRET: required(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  ALLOW_PUBLIC_REGISTRATION: parseBoolean(process.env.ALLOW_PUBLIC_REGISTRATION, process.env.NODE_ENV !== 'production'),
}


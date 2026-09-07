import fs from 'fs/promises'
import path from 'path'
import { prisma } from './prisma'

/** Marques initiales (seed si table vide). */
export const DEFAULT_BRANDS = [
  'Audi', 'Bmw', 'Changan', 'Cherry', 'Chevrolet', 'Citroen', 'Dacia', 'Fiat', 'Ford', 'Haval',
  'Honda', 'Hyundai', 'Jeep', 'Kia', 'Mazda', 'Mercedes', 'Mg', 'Mini', 'Mitsubishi', 'Nissan',
  'Opel', 'Peugeot', 'Porsche', 'Range', 'Renault', 'Ssangyong', 'Seat', 'Skoda', 'Suzuki',
  'Toyota', 'Volkswagen', 'Volvo', 'Jetour', 'Geely', 'Isuzu', 'Mahindra', 'Tata', 'Lada',
] as const

export type MarqueCached = {
  id: number
  nom: string
  slug: string
  logoUrl: string | null
  actif: boolean
}

const LOGOS_ROOT = path.resolve(process.cwd(), 'uploads', 'marques')
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

let brandCache: MarqueCached[] = []

export function brandToSlug(brand: string): string {
  return brand
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function titleBrand(raw: string): string {
  const s = raw.trim()
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function refreshBrandCache(): Promise<MarqueCached[]> {
  const db = prisma as any
  if (!db.marque) {
    brandCache = []
    return brandCache
  }
  const rows = await db.marque.findMany({
    orderBy: { nom: 'asc' },
    select: { id: true, nom: true, slug: true, logoUrl: true, actif: true },
  })
  brandCache = rows.map((r: MarqueCached) => ({
    id: r.id,
    nom: r.nom,
    slug: r.slug,
    logoUrl: r.logoUrl ?? null,
    actif: r.actif !== false,
  }))
  return brandCache
}

export function getBrandCache(): MarqueCached[] {
  return brandCache
}

export function getActiveBrands(): MarqueCached[] {
  return brandCache.filter(b => b.actif)
}

/** Seed marques par défaut si la table est vide. */
export async function ensureMarquesSeed(): Promise<void> {
  const db = prisma as any
  if (!db.marque) return
  const count = await db.marque.count()
  if (count > 0) {
    await refreshBrandCache()
    return
  }
  const now = new Date()
  await db.marque.createMany({
    data: DEFAULT_BRANDS.map(nom => ({
      nom,
      slug: brandToSlug(nom),
      logoUrl: null,
      actif: true,
      updatedAt: now,
    })),
    skipDuplicates: true,
  })
  await refreshBrandCache()
  console.log(`[marques] seeded ${DEFAULT_BRANDS.length} brands`)
}

/**
 * Détecte la marque depuis le début du modèle.
 * Utilise le cache DB (marques actives), sinon fallback liste par défaut.
 */
export function detectVehiculeBrand(modele: string): string {
  const raw = (modele || '').trim()
  if (!raw) return 'Autres'
  const lower = raw.toLowerCase()
  const active = getActiveBrands()
  const pool = active.length
    ? active
    : DEFAULT_BRANDS.map(nom => ({
        id: 0,
        nom,
        slug: brandToSlug(nom),
        logoUrl: null as string | null,
        actif: true,
      }))

  // Match longest nom first (ex. "Range Rover" vs "Range")
  const sorted = [...pool].sort((a, b) => b.nom.length - a.nom.length)
  for (const b of sorted) {
    const n = b.nom.toLowerCase()
    if (lower === n || lower.startsWith(`${n} `)) return b.nom
  }
  // Fallback: first word equals slug
  const firstWord = raw.split(/\s+/)[0]?.toLowerCase() ?? ''
  const bySlug = pool.find(b => b.slug === firstWord || brandToSlug(b.nom) === firstWord)
  if (bySlug) return bySlug.nom
  return 'Autres'
}

/** URL slug → prefix for Prisma startsWith. */
export function slugToModelePrefix(slug: string): string | null {
  const s = slug.trim().toLowerCase()
  if (s === 'autres') return null
  const cached = getActiveBrands().find(b => b.slug === s)
  if (cached) return cached.nom
  const known = DEFAULT_BRANDS.find(b => brandToSlug(b) === s)
  if (known) return known
  return s
    .split('-')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
}

export function groupModelesByBrand(
  modeles: string[]
): Array<{ name: string; slug: string; count: number; logoUrl?: string | null }> {
  const counts = new Map<string, number>()
  for (const modele of modeles) {
    const brand = detectVehiculeBrand(modele)
    counts.set(brand, (counts.get(brand) ?? 0) + 1)
  }
  const logoByName = new Map(getActiveBrands().map(b => [b.nom.toLowerCase(), b.logoUrl]))
  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      slug: brandToSlug(name),
      count,
      logoUrl: logoByName.get(name.toLowerCase()) ?? null,
    }))
    .sort((a, b) => {
      if (a.name === 'Autres') return 1
      if (b.name === 'Autres') return -1
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    })
}

function parseLogoDataUrl(dataUrl?: string): { mimeType: string; buffer: Buffer; ext: string } | null {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  let mimeType = match[1].toLowerCase()
  if (mimeType === 'image/jpg' || mimeType === 'image/pjpeg') mimeType = 'image/jpeg'
  if (!ALLOWED_MIME.includes(mimeType as (typeof ALLOWED_MIME)[number])) return null
  try {
    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length > 5 * 1024 * 1024) return null
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
    return { mimeType, buffer, ext }
  } catch {
    return null
  }
}

export async function saveMarqueLogo(marqueId: number, dataUrl: string): Promise<string> {
  const parsed = parseLogoDataUrl(dataUrl)
  if (!parsed) throw new Error('Image invalide (JPEG/PNG/WebP, max 5 Mo)')
  await fs.mkdir(LOGOS_ROOT, { recursive: true })
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    await fs.unlink(path.join(LOGOS_ROOT, `${marqueId}.${ext}`)).catch(() => undefined)
  }
  const fileName = `${marqueId}.${parsed.ext}`
  await fs.writeFile(path.join(LOGOS_ROOT, fileName), parsed.buffer)
  return `/uploads/marques/${fileName}`
}

export async function clearMarqueLogo(marqueId: number): Promise<void> {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    await fs.unlink(path.join(LOGOS_ROOT, `${marqueId}.${ext}`)).catch(() => undefined)
  }
}

/** Compat: ancienne constante utilisée ailleurs */
export const KNOWN_BRANDS = DEFAULT_BRANDS.map(b => b.toLowerCase())

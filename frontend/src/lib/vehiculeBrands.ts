import type { Vehicule } from '@/types'

export const KNOWN_BRANDS = [
  'audi', 'bmw', 'changan', 'cherry', 'chevrolet', 'citroen', 'dacia', 'fiat', 'ford', 'haval',
  'honda', 'hyundai', 'jeep', 'kia', 'mazda', 'mercedes', 'mg', 'mini', 'mitsubishi', 'nissan',
  'opel', 'peugeot', 'porsche', 'range', 'renault', 'ssangyong', 'seat', 'skoda', 'suzuki',
  'toyota', 'volkswagen', 'volvo', 'jetour', 'geely', 'isuzu', 'mahindra', 'tata', 'lada',
] as const

export function detectVehiculeBrand(modele: string): string {
  const raw = (modele || '').trim()
  if (!raw) return 'Autres'
  const firstWord = raw.split(/\s+/)[0]?.toLowerCase() ?? ''
  const matched = KNOWN_BRANDS.find(b => b === firstWord)
  if (!matched) return 'Autres'
  return matched.charAt(0).toUpperCase() + matched.slice(1)
}

export function brandToSlug(brand: string): string {
  return brand.trim().toLowerCase().replace(/\s+/g, '-')
}

export type BrandFolder = { name: string; slug: string; count: number }

export function groupVehiculesByBrand(vehicules: Vehicule[]): BrandFolder[] {
  const counts = new Map<string, number>()
  for (const v of vehicules) {
    const brand = detectVehiculeBrand(v.modele)
    counts.set(brand, (counts.get(brand) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: brandToSlug(name), count }))
    .sort((a, b) => {
      if (a.name === 'Autres') return 1
      if (b.name === 'Autres') return -1
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    })
}

export const BRAND_FOLDER_PAGE_SIZE = 12

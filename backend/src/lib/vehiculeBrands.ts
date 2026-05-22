/** Brand detection from vehicle model — shared logic for list + folder views. */

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

/** URL slug → prefix for Prisma startsWith (e.g. volkswagen → Volkswagen). */
export function slugToModelePrefix(slug: string): string | null {
  const s = slug.trim().toLowerCase()
  if (s === 'autres') return null
  const known = KNOWN_BRANDS.find(b => b === s || brandToSlug(b.charAt(0).toUpperCase() + b.slice(1)) === s)
  if (known) return known.charAt(0).toUpperCase() + known.slice(1)
  return s
    .split('-')
    .map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ')
}

export function groupModelesByBrand(modeles: string[]): Array<{ name: string; slug: string; count: number }> {
  const counts = new Map<string, number>()
  for (const modele of modeles) {
    const brand = detectVehiculeBrand(modele)
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

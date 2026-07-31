export const KNOWN_BRANDS = [
  'audi', 'bmw', 'changan', 'cherry', 'chevrolet', 'citroen', 'dacia', 'fiat', 'ford', 'haval',
  'honda', 'hyundai', 'jeep', 'kia', 'mazda', 'mercedes', 'mg', 'mini', 'mitsubishi', 'nissan',
  'opel', 'peugeot', 'porsche', 'range', 'renault', 'ssangyong', 'seat', 'skoda', 'suzuki',
  'toyota', 'volkswagen', 'volvo', 'jetour', 'geely', 'isuzu', 'mahindra', 'tata', 'lada',
] as const

export const BRAND_OPTIONS = KNOWN_BRANDS.map(
  (b) => b.charAt(0).toUpperCase() + b.slice(1)
)

/** Compose `Marque Modèle` pour le classement automatique des dossiers. */
export function buildModeleLabel(marque: string, modele: string): string {
  const m = marque.trim()
  const d = modele.trim()
  if (m && d) return `${m} ${d}`
  return m || d || 'Véhicule'
}

export function parseMarqueModele(fullModele: string): { marque: string; modele: string } {
  const raw = (fullModele || '').trim()
  if (!raw) return { marque: '', modele: '' }
  for (const marque of BRAND_OPTIONS) {
    const lower = marque.toLowerCase()
    if (raw.toLowerCase() === lower) return { marque, modele: '' }
    if (raw.toLowerCase().startsWith(`${lower} `)) {
      return { marque, modele: raw.slice(marque.length).trim() }
    }
  }
  return { marque: '', modele: raw }
}

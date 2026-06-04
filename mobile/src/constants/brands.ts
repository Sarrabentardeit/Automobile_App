export const BRAND_OPTIONS = [
  'Audi',
  'Bmw',
  'Changan',
  'Cherry',
  'Chevrolet',
  'Citroen',
  'Dacia',
  'Fiat',
  'Ford',
  'Haval',
  'Honda',
  'Hyundai',
  'Jeep',
  'Kia',
  'Mazda',
  'Mercedes',
  'Mg',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Opel',
  'Peugeot',
  'Porsche',
  'Range',
  'Renault',
  'Ssangyong',
  'Seat',
  'Skoda',
  'Suzuki',
  'Toyota',
  'Volkswagen',
  'Volvo',
  'Jetour',
  'Geely',
  'Isuzu',
  'Mahindra',
  'Tata',
  'Lada',
] as const

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

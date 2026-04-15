import type { Vehicule } from '@/types'
import { ETAT_CONFIG } from '@/types'
import { formatDate, formatDateTime, getUserDisplayName } from '@/lib/utils'

function escapeCsvCell(value: string): string {
  if (/[;\r\n"]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Export CSV ouvrable dans Excel (UTF-8 BOM, séparateur `;`).
 */
export function downloadVehiculesCsv(
  vehicules: Vehicule[],
  users: { id: number; nom_complet: string }[],
  filename?: string
): void {
  const headers = [
    'ID',
    'Modèle',
    'Immatriculation',
    'Type',
    'État',
    'Défaut / travaux',
    'Téléphone client',
    'Date entrée',
    'Date sortie',
    'Technicien',
    'Responsable',
    'Service',
    'Notes',
    'Dernière mise à jour',
  ]

  const rows: string[][] = vehicules.map(v => {
    const etatLabel = ETAT_CONFIG[v.etat_actuel]?.label ?? v.etat_actuel
    return [
      String(v.id),
      v.modele ?? '',
      v.immatriculation ?? '',
      v.type === 'moto' ? 'Moto' : 'Voiture',
      etatLabel,
      v.defaut ?? '',
      v.client_telephone ?? '',
      v.date_entree ? formatDate(v.date_entree) : '',
      v.date_sortie ? formatDate(v.date_sortie) : '',
      getUserDisplayName(v.technicien_id, users),
      getUserDisplayName(v.responsable_id, users),
      v.service_type ?? '',
      v.notes ?? '',
      v.derniere_mise_a_jour ? formatDateTime(v.derniere_mise_a_jour) : '',
    ].map(s => escapeCsvCell(s))
  })

  const sep = ';'
  const lines = [headers.map(escapeCsvCell), ...rows].map(cols => cols.join(sep)).join('\r\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + lines], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `archives-vehicules-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

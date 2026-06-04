import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Alert } from 'react-native'
import { ETAT_CONFIG, type Vehicule } from '../types/vehicule'
import { formatDate } from './format'
import type { AppUser } from './vehiculeApi'

function escapeCsvCell(value: string): string {
  if (/[;\r\n"]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function formatDateTime(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('fr-FR')
  } catch {
    return iso
  }
}

export function buildVehiculesCsv(
  vehicules: Vehicule[],
  users: AppUser[]
): string {
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

  const name = (id: number | null | undefined) => {
    if (id == null) return ''
    return users.find((u) => u.id === id)?.nom_complet ?? `ID ${id}`
  }

  const rows = vehicules.map((v) => {
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
      name(v.technicien_id),
      name(v.responsable_id),
      v.service_type ?? '',
      v.notes ?? '',
      v.derniere_mise_a_jour ? formatDateTime(v.derniere_mise_a_jour) : '',
    ].map(escapeCsvCell)
  })

  const sep = ';'
  return (
    '\uFEFF' +
    [headers.map(escapeCsvCell), ...rows].map((cols) => cols.join(sep)).join('\r\n')
  )
}

export async function shareVehiculesCsv(
  vehicules: Vehicule[],
  users: AppUser[],
  filename: string
): Promise<void> {
  const csv = buildVehiculesCsv(vehicules, users)
  const path = `${FileSystem.cacheDirectory}${filename}`
  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  })
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'text/csv',
      dialogTitle: 'Exporter archives',
    })
  } else {
    Alert.alert('Export', `Fichier : ${path}`)
  }
}

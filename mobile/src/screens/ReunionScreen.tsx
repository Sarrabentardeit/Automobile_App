import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { apiFetch } from '../lib/api'
import { theme } from '../theme/appTheme'
import { ETAT_CONFIG, type EtatVehicule } from '../types/vehicule'

type Row = {
  id: number
  modele: string
  immatriculation: string
  etat_actuel: string
  date_entree: string
  date_sortie: string | null
  note: string
  defaut: string
}

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function stayDays(row: Row) {
  const start = new Date(`${row.date_entree.slice(0, 10)}T12:00:00`).getTime()
  const end =
    row.etat_actuel === 'vert' && row.date_sortie
      ? new Date(`${row.date_sortie.slice(0, 10)}T12:00:00`).getTime()
      : Date.now()
  return Math.max(0, Math.floor((end - start) / 86400000))
}

const ETATS_FILTRE: EtatVehicule[] = [
  'orange',
  'mauve',
  'sous_traitance',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'retour',
]

type Props = {
  accessToken: string
  onOpenVehicle: (id: number) => void
}

export default function ReunionScreen({ accessToken, onOpenVehicle }: Props) {
  const [date, setDate] = useState(today)
  const [rows, setRows] = useState<Row[]>([])
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [saved, setSaved] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState<EtatVehicule | 'tous'>('tous')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void apiFetch<{ rows: Row[] }>('/reunions', { token: accessToken, params: { date } })
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.rows) ? data.rows : []
        const next = Object.fromEntries(list.map((row) => [row.id, row.note || '']))
        setRows(list)
        setNotes(next)
        setSaved(next)
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, date])

  const ordered = useMemo(
    () => [...rows].sort((a, b) => stayDays(b) - stayDays(a) || a.id - b.id),
    [rows]
  )
  const counts = useMemo(() => {
    const map = Object.fromEntries(ETATS_FILTRE.map((etat) => [etat, 0])) as Record<string, number>
    for (const row of ordered) map[row.etat_actuel] = (map[row.etat_actuel] ?? 0) + 1
    return map
  }, [ordered])
  const visible = filtre === 'tous' ? ordered : ordered.filter((row) => row.etat_actuel === filtre)
  const inShop = ordered.length

  const shift = (delta: number) => {
    const d = new Date(`${date}T12:00:00`)
    d.setDate(d.getDate() + delta)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (next > today()) return
    setDate(next)
  }

  const saveNote = async (id: number, note: string) => {
    if ((saved[id] ?? '') === note) return
    await apiFetch('/reunions', {
      method: 'PUT',
      token: accessToken,
      body: { date, vehiculeId: id, note },
    })
    setSaved((prev) => ({ ...prev, [id]: note }))
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.kicker}>Atelier</Text>
      <Text style={styles.title}>Réunion</Text>
      <View style={styles.dateRow}>
        <Pressable style={styles.dateBtn} onPress={() => shift(-1)}>
          <Text style={styles.dateBtnText}>Veille</Text>
        </Pressable>
        <Pressable style={styles.dateBtn} onPress={() => setDate(today())}>
          <Text style={styles.dateBtnText}>Aujourd’hui</Text>
        </Pressable>
      </View>
      <Text style={styles.dateLabel}>{date}</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Au garage</Text>
          <Text style={styles.statValue}>{loading ? '—' : inShop}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Pressable
          style={[styles.chip, filtre === 'tous' && styles.chipOn]}
          onPress={() => setFiltre('tous')}
        >
          <Text style={[styles.chipText, filtre === 'tous' && styles.chipTextOn]}>Tous ({inShop})</Text>
        </Pressable>
        {ETATS_FILTRE.map((etat) => {
          const active = filtre === etat
          const color = ETAT_CONFIG[etat].color
          return (
            <Pressable
              key={etat}
              style={[styles.chip, { borderColor: color }, active && { backgroundColor: color }]}
              onPress={() => setFiltre(active ? 'tous' : etat)}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : color }]}>
                {ETAT_CONFIG[etat].label} ({counts[etat] ?? 0})
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {!loading && visible.length === 0 ? (
        <Text style={styles.muted}>
          {filtre === 'tous' ? 'Aucune voiture au garage.' : 'Aucune voiture dans cet état.'}
        </Text>
      ) : null}
      {visible.map((row, index) => {
        const days = stayDays(row)
        return (
          <View key={row.id} style={styles.card}>
            <Pressable onPress={() => onOpenVehicle(row.id)}>
              <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.model}>{row.modele}</Text>
              <Text style={styles.plate}>{row.immatriculation || 'Sans immatriculation'}</Text>
            </Pressable>
            <Text style={[styles.days, days >= 5 && row.etat_actuel !== 'vert' && styles.daysLong]}>
              {days} {days === 1 ? 'jour' : 'jours'}
            </Text>
            <TextInput
              value={notes[row.id] ?? ''}
              onChangeText={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
              onBlur={() => void saveNote(row.id, notes[row.id] ?? '')}
              placeholder="Note de la réunion"
              placeholderTextColor="#9ca3af"
              multiline
              style={styles.note}
            />
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#9ca3af' },
  title: { fontSize: 26, fontWeight: '700', color: theme.text, marginTop: 4 },
  dateRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dateBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateBtnText: { fontWeight: '600', color: theme.text },
  dateLabel: { marginTop: 8, color: theme.textMuted },
  stats: { flexDirection: 'row', gap: 10, marginTop: 14 },
  filters: { gap: 8, paddingVertical: 12 },
  chip: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: theme.text, borderColor: theme.text },
  chipText: { fontSize: 11, fontWeight: '700', color: theme.textMuted },
  chipTextOn: { color: '#fff' },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  statLabel: { fontSize: 12, color: theme.textMuted },
  statValue: { fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10 },
  rank: { color: '#d1d5db', fontWeight: '700' },
  model: { fontSize: 16, fontWeight: '700', color: theme.text, marginTop: 2 },
  plate: { color: theme.textMuted, marginTop: 2 },
  days: { marginTop: 8, fontWeight: '700', color: theme.text },
  daysLong: { color: '#ea580c' },
  note: {
    marginTop: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 10,
    minHeight: 52,
    color: theme.text,
  },
  muted: { color: theme.textMuted, marginTop: 12 },
})

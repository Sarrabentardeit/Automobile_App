import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { apiFetch } from '../lib/api'
import { theme } from '../theme/appTheme'
import { ETAT_CONFIG, type EtatVehicule } from '../types/vehicule'

type Period = 'jour' | 'semaine'

type GarageCar = {
  id: number
  modele: string
  immatriculation: string
  etat: string
  stayDays: number
}

type ValidatedCar = {
  id: number
  modele: string
  immatriculation: string
  date_sortie: string | null
  stayDays: number
}

type ActivityItem = {
  id: string
  at: string
  kind: 'etat' | 'note'
  vehiculeId: number
  modele: string
  etatFrom: string | null
  etatTo: string | null
  auteur: string
  detail: string
}

type SuiviData = {
  metrics: { inGarage: number; validated: number; waitingParts: number }
  garage: GarageCar[]
  validated: ValidatedCar[]
  activity: ActivityItem[]
}

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function labelOf(etat: string | null) {
  if (etat && etat in ETAT_CONFIG) return ETAT_CONFIG[etat as EtatVehicule].label
  return etat || '—'
}

type Props = {
  accessToken: string
  onOpenVehicle: (id: number) => void
}

export default function SuiviScreen({ accessToken, onOpenVehicle }: Props) {
  const [date, setDate] = useState(today)
  const [period, setPeriod] = useState<Period>('jour')
  const [data, setData] = useState<SuiviData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void apiFetch<SuiviData>('/suivi', { token: accessToken, params: { date, period } })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, date, period])

  const shift = (delta: number) => {
    const d = new Date(`${date}T12:00:00`)
    d.setDate(d.getDate() + delta)
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (next > today()) return
    setPeriod('jour')
    setDate(next)
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.kicker}>Direction</Text>
      <Text style={styles.title}>Suivi atelier</Text>
      <View style={styles.dateRow}>
        <Pressable style={styles.dateBtn} onPress={() => shift(-1)}>
          <Text style={styles.dateBtnText}>Veille</Text>
        </Pressable>
        <Pressable style={[styles.dateBtn, period === 'jour' && date === today() && styles.dateBtnOn]} onPress={() => { setPeriod('jour'); setDate(today()) }}>
          <Text style={[styles.dateBtnText, period === 'jour' && date === today() && styles.dateBtnTextOn]}>Aujourd’hui</Text>
        </Pressable>
        <Pressable style={[styles.dateBtn, period === 'semaine' && styles.dateBtnOn]} onPress={() => setPeriod((current) => (current === 'semaine' ? 'jour' : 'semaine'))}>
          <Text style={[styles.dateBtnText, period === 'semaine' && styles.dateBtnTextOn]}>Semaine</Text>
        </Pressable>
      </View>
      <View style={styles.stats}>
        <Stat label="Au garage" value={loading ? '—' : String(data?.metrics.inGarage ?? 0)} />
        <Stat label="Validées" value={loading ? '—' : String(data?.metrics.validated ?? 0)} />
        <Stat label="Pièces +5 j" value={loading ? '—' : String(data?.metrics.waitingParts ?? 0)} />
      </View>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      <Text style={styles.section}>Au garage</Text>
      {(data?.garage ?? []).map((row) => (
        <Pressable key={row.id} style={styles.card} onPress={() => onOpenVehicle(row.id)}>
          <Text style={styles.model}>{row.modele}</Text>
          <Text style={styles.meta}>{row.immatriculation || '—'} · {labelOf(row.etat)} · {row.stayDays} j</Text>
        </Pressable>
      ))}
      {!loading && (data?.garage.length ?? 0) === 0 ? <Text style={styles.muted}>Aucune voiture au garage.</Text> : null}
      <Text style={styles.section}>Validées</Text>
      {(data?.validated ?? []).map((row) => (
        <Pressable key={row.id} style={styles.card} onPress={() => onOpenVehicle(row.id)}>
          <Text style={styles.model}>{row.modele}</Text>
          <Text style={styles.meta}>{row.immatriculation || '—'} · {row.date_sortie || '—'} · {row.stayDays} j</Text>
        </Pressable>
      ))}
      {!loading && (data?.validated.length ?? 0) === 0 ? <Text style={styles.muted}>Aucune validation sur cette période.</Text> : null}
      <Text style={styles.section}>Ce qui a été fait</Text>
      {(data?.activity ?? []).map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => item.vehiculeId && onOpenVehicle(item.vehiculeId)}>
          <Text style={styles.model}>{item.modele || 'Véhicule'}</Text>
          <Text style={styles.meta}>
            {item.kind === 'note' ? `Note · ${item.detail}` : `${labelOf(item.etatFrom)} → ${labelOf(item.etatTo)}`}
          </Text>
          {item.auteur ? <Text style={styles.meta}>{item.auteur}</Text> : null}
        </Pressable>
      ))}
      {!loading && (data?.activity.length ?? 0) === 0 ? <Text style={styles.muted}>Aucun mouvement.</Text> : null}
    </ScrollView>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: '#9ca3af' },
  title: { fontSize: 26, fontWeight: '700', color: theme.text, marginTop: 4 },
  dateRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  dateBtn: { borderWidth: 1, borderColor: theme.border, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  dateBtnOn: { backgroundColor: theme.text, borderColor: theme.text },
  dateBtnText: { fontWeight: '600', color: theme.text },
  dateBtnTextOn: { color: '#fff' },
  stats: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12 },
  statLabel: { fontSize: 11, color: theme.textMuted },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.text, marginTop: 2 },
  section: { marginTop: 8, marginBottom: 8, fontSize: 13, fontWeight: '700', color: theme.text },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8 },
  model: { fontSize: 16, fontWeight: '700', color: theme.text },
  meta: { color: theme.textMuted, marginTop: 4 },
  muted: { color: theme.textMuted, marginBottom: 8 },
})

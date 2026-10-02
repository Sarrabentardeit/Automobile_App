import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { apiFetch } from '../lib/api'
import { fetchUsers, type AppUser } from '../lib/vehiculeApi'
import { theme } from '../theme/appTheme'
import { ETAT_CONFIG, type EtatVehicule } from '../types/vehicule'

type Period = 'jour' | 'semaine'
type EtatFilter = EtatVehicule | 'parts' | 'tous'

const ETAT_ORDER: EtatVehicule[] = [
  'orange',
  'mauve',
  'sous_traitance',
  'attente_client',
  'bleu',
  'rouge',
  'remise_cle',
  'retour',
]

type GarageCar = {
  id: number
  modele: string
  immatriculation: string
  etat: string
  defaut: string
  date_entree: string
  technicien_id: number | null
  responsable_id: number | null
  stayDays: number
}

type ValidatedCar = {
  id: number
  modele: string
  immatriculation: string
  defaut: string
  date_entree: string
  date_sortie: string | null
  stayDays: number
}

type ActivityItem = {
  id: string
  at: string
  kind: 'etat' | 'note'
  vehiculeId: number
  modele: string
  immatriculation: string
  etatFrom: string | null
  etatTo: string | null
  auteur: string
  detail: string
}

type SuiviData = {
  from: string
  to: string
  period: Period
  garageAsOf: string
  metrics: { inGarage: number; validated: number; waitingParts: number }
  garage: GarageCar[]
  validated: ValidatedCar[]
  activity: ActivityItem[]
  truncated: boolean
}

function today() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function shiftDate(iso: string, delta: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const next = new Date(y, (m || 1) - 1, (d || 1) + delta)
  const pad = (n: number) => String(n).padStart(2, '0')
  const value = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`
  const max = today()
  return value > max ? max : value
}

function longDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

function clock(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function asIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(Number).filter((id) => Number.isFinite(id) && id > 0)
}

function readDefaut(text: string | null | undefined) {
  let raw = String(text ?? '')
  const technicien_ids: number[] = []
  const responsable_ids: number[] = []
  const tag = '[[ASSIGNEES:'
  let start = raw.lastIndexOf(tag)
  while (start >= 0) {
    const end = raw.indexOf(']]', start)
    if (end < 0) break
    try {
      const parsed = JSON.parse(raw.slice(start + tag.length, end)) as Record<string, unknown>
      technicien_ids.push(...asIds(parsed.technicien_ids ?? parsed.technician_ids))
      responsable_ids.push(...asIds(parsed.responsable_ids))
    } catch {
      /* le texte visible reste affiché */
    }
    raw = `${raw.slice(0, start)}${raw.slice(end + 2)}`.trim()
    start = raw.lastIndexOf(tag)
  }
  return {
    notes: raw.trim(),
    technicien_ids: [...new Set(technicien_ids)],
    responsable_ids: [...new Set(responsable_ids)],
  }
}

function teamOf(row: Pick<GarageCar, 'defaut' | 'technicien_id' | 'responsable_id'>, users: AppUser[]) {
  const parsed = readDefaut(row.defaut)
  const tech = parsed.technicien_ids.length
    ? parsed.technicien_ids
    : row.technicien_id != null
      ? [row.technicien_id]
      : []
  const ids = tech.length
    ? tech
    : parsed.responsable_ids.length
      ? parsed.responsable_ids
      : row.responsable_id != null
        ? [row.responsable_id]
        : []
  const names = ids
    .map((id) => users.find((user) => user.id === id)?.nom_complet)
    .filter((name): name is string => Boolean(name))
  return names.join(', ')
}

function isEtat(value: string | null | undefined): value is EtatVehicule {
  return Boolean(value && value in ETAT_CONFIG)
}

function labelOf(etat: string | null) {
  if (isEtat(etat)) return ETAT_CONFIG[etat].label
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
  const [query, setQuery] = useState('')
  const [etatFilter, setEtatFilter] = useState<EtatFilter>('tous')
  const [users, setUsers] = useState<AppUser[]>([])
  const [showDate, setShowDate] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const garageY = useRef(0)
  const validatedY = useRef(0)

  useEffect(() => {
    let cancelled = false
    void fetchUsers(accessToken)
      .then((list) => {
        if (!cancelled) setUsers(list)
      })
      .catch(() => {
        if (!cancelled) setUsers([])
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

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

  const isToday = date === today() && period === 'jour'
  const isVeille = period === 'jour' && date === shiftDate(today(), -1)
  const garage = data?.garage ?? []
  const counts = useMemo(() => {
    const map = Object.fromEntries(ETAT_ORDER.map((etat) => [etat, 0])) as Record<EtatVehicule, number>
    for (const row of garage) {
      if (isEtat(row.etat)) map[row.etat] += 1
    }
    return map
  }, [garage])

  const visibleGarage = useMemo(() => {
    const q = query.trim().toLowerCase()
    return garage.filter((row) => {
      if (etatFilter === 'parts' && !(row.etat === 'mauve' && row.stayDays >= 5)) return false
      if (etatFilter !== 'tous' && etatFilter !== 'parts' && row.etat !== etatFilter) return false
      if (!q) return true
      return `${row.modele} ${row.immatriculation}`.toLowerCase().includes(q)
    })
  }, [garage, etatFilter, query])

  const groups = useMemo(() => {
    const known = ETAT_ORDER.map((etat) => ({
      etat,
      rows: visibleGarage.filter((row) => row.etat === etat),
    })).filter((group) => group.rows.length > 0)
    const extra = visibleGarage.filter((row) => !ETAT_ORDER.includes(row.etat as EtatVehicule))
    return extra.length ? [...known, { etat: extra[0].etat as EtatVehicule, rows: extra }] : known
  }, [visibleGarage])

  const periodLabel = !data
    ? longDate(date)
    : data.period === 'semaine'
      ? `Semaine du ${shortDate(data.from)} au ${shortDate(data.to)}`
      : isToday
        ? `Aujourd’hui · ${longDate(data.to)}`
        : longDate(data.to)

  const garageTitle = !data
    ? 'Au garage'
    : data.period === 'semaine' && data.to === today()
      ? 'Au garage maintenant'
      : data.to === today()
        ? 'Au garage'
        : `Au garage le ${shortDate(data.to)}`

  const validatedTitle = data?.period === 'semaine'
    ? 'Validées sur la période'
    : isToday
      ? 'Validées aujourd’hui'
      : 'Validées ce jour'

  const onPickDate = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDate(false)
    if (!selected) return
    const pad = (n: number) => String(n).padStart(2, '0')
    const value = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}`
    setPeriod('jour')
    setDate(value > today() ? today() : value)
  }

  const scrollTo = (y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true })

  return (
    <ScrollView ref={scrollRef} style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>Direction</Text>
      <Text style={styles.title}>Suivi atelier</Text>
      <Text style={styles.subtitle}>{periodLabel}</Text>

      <View style={styles.toolbar}>
        <View style={styles.segment}>
          <Pressable style={[styles.segmentBtn, isToday && styles.segmentBtnOn]} onPress={() => { setPeriod('jour'); setDate(today()) }}>
            <Text style={[styles.segmentText, isToday && styles.segmentTextOn]}>Aujourd’hui</Text>
          </Pressable>
          <Pressable style={[styles.segmentBtn, isVeille && styles.segmentBtnOn]} onPress={() => { setPeriod('jour'); setDate(shiftDate(today(), -1)) }}>
            <Text style={[styles.segmentText, isVeille && styles.segmentTextOn]}>Veille</Text>
          </Pressable>
          <Pressable style={[styles.segmentBtn, period === 'semaine' && styles.segmentBtnOn]} onPress={() => setPeriod((current) => (current === 'semaine' ? 'jour' : 'semaine'))}>
            <Text style={[styles.segmentText, period === 'semaine' && styles.segmentTextOn]}>Semaine</Text>
          </Pressable>
        </View>
        <Pressable style={styles.calendarBtn} onPress={() => setShowDate(true)}>
          <Ionicons name="calendar-outline" size={16} color={theme.text} />
          <Text style={styles.calendarText}>{shortDate(date)}</Text>
        </Pressable>
      </View>
      {showDate ? (
        <DateTimePicker
          value={new Date(`${date}T12:00:00`)}
          mode="date"
          maximumDate={new Date()}
          display="default"
          onChange={onPickDate}
        />
      ) : null}

      <View style={styles.kpiPanel}>
        <Metric
          label="Au garage"
          value={loading ? '—' : String(data?.metrics.inGarage ?? 0)}
          hint={garageTitle === 'Au garage maintenant' ? 'en ce moment' : 'à cette date'}
          bar="#111827"
          selected={etatFilter === 'tous'}
          onPress={() => { setEtatFilter('tous'); scrollTo(garageY.current) }}
        />
        <View style={styles.kpiDivider} />
        <Metric
          label="Validées"
          value={loading ? '—' : String(data?.metrics.validated ?? 0)}
          hint={period === 'semaine' ? 'la semaine' : 'la journée'}
          bar="#22c55e"
          valueColor="#047857"
          onPress={() => scrollTo(validatedY.current)}
        />
        <View style={styles.kpiDivider} />
        <Metric
          label="Att. pièces"
          value={loading ? '—' : String(data?.metrics.waitingParts ?? 0)}
          hint="5 jours ou plus"
          bar="#f97316"
          valueColor={(data?.metrics.waitingParts ?? 0) > 0 ? '#ea580c' : theme.text}
          selected={etatFilter === 'parts'}
          onPress={() => { setEtatFilter('parts'); scrollTo(garageY.current) }}
        />
      </View>

      <View style={styles.panel} onLayout={(event) => { garageY.current = event.nativeEvent.layout.y }}>
        <View style={styles.panelHead}>
          <View style={{ flex: 1 }}>
            <SectionHead
              title={garageTitle}
              hint={loading ? 'Chargement…' : `${visibleGarage.length} voiture${visibleGarage.length > 1 ? 's' : ''}`}
              color="#111827"
            />
          </View>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={theme.textSubtle} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une voiture"
            placeholderTextColor={theme.textSubtle}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={`Tous ${garage.length}`} active={etatFilter === 'tous'} onPress={() => setEtatFilter('tous')} />
          {ETAT_ORDER.filter((etat) => counts[etat] > 0).map((etat) => (
            <Chip
              key={etat}
              label={`${ETAT_CONFIG[etat].label} ${counts[etat]}`}
              active={etatFilter === etat}
              color={ETAT_CONFIG[etat].color}
              onPress={() => setEtatFilter(etatFilter === etat ? 'tous' : etat)}
            />
          ))}
        </ScrollView>
        {loading ? <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} /> : null}
        {!loading && visibleGarage.length === 0 ? (
          <Empty title="Aucune voiture" hint="Aucune voiture ne correspond à ce filtre." />
        ) : null}
        {groups.map((group) => (
          <View key={group.etat}>
            <Text style={[styles.groupLabel, { color: ETAT_CONFIG[group.etat]?.color ?? theme.textMuted }]}>
              {ETAT_CONFIG[group.etat]?.label ?? group.etat}
            </Text>
            {group.rows.map((row) => {
              const stuck = row.etat === 'mauve' && row.stayDays >= 5
              const problem = readDefaut(row.defaut).notes
              const people = teamOf(row, users)
              return (
                <Pressable key={row.id} style={styles.car} onPress={() => onOpenVehicle(row.id)}>
                  <View style={[styles.carBar, { backgroundColor: isEtat(row.etat) ? ETAT_CONFIG[row.etat].color : theme.border }]} />
                  <View style={styles.carBody}>
                    <View style={styles.carTop}>
                      <Text style={styles.model} numberOfLines={1}>{row.modele || 'Sans modèle'}</Text>
                      <Text style={[styles.stay, stuck && styles.stayStuck]}>{row.stayDays} j</Text>
                    </View>
                    <View style={styles.carMeta}>
                      <Text style={styles.plate}>{row.immatriculation || '—'}</Text>
                      <EtatPill etat={row.etat} />
                    </View>
                    <Text style={styles.fact} numberOfLines={1}>{people || 'Sans équipe'}</Text>
                    <Text style={styles.problem} numberOfLines={2}>{problem || 'Pas de problème noté'}</Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>

      <View style={styles.panel} onLayout={(event) => { validatedY.current = event.nativeEvent.layout.y }}>
        <SectionHead title={validatedTitle} hint="Voitures sorties de l’atelier" color="#047857" />
        {!loading && (data?.validated.length ?? 0) === 0 ? (
          <Empty title="Aucune validation" hint="Rien n’a été validé sur cette période." />
        ) : null}
        {(data?.validated ?? []).map((row) => (
          <Pressable key={row.id} style={styles.validated} onPress={() => onOpenVehicle(row.id)}>
            <View style={styles.carTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.model}>{row.modele || 'Sans modèle'}</Text>
                <Text style={styles.plate}>{row.immatriculation || '—'}</Text>
              </View>
              <Text style={styles.validatedDays}>{row.stayDays} j</Text>
            </View>
            <Text style={styles.problem} numberOfLines={2}>{readDefaut(row.defaut).notes || 'Séjour terminé'}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        <SectionHead title="Mouvements" hint="États changés et notes de réunion" color="#ea580c" />
        {!loading && (data?.activity.length ?? 0) === 0 ? (
          <Empty title="Aucun mouvement" hint="Pas de changement sur cette période." />
        ) : null}
        {(data?.activity ?? []).map((item) => {
          const when = data?.period === 'semaine' ? `${shortDate(item.at.slice(0, 10))} ${clock(item.at)}` : clock(item.at)
          return (
            <Pressable key={item.id} style={styles.timeline} onPress={() => item.vehiculeId && onOpenVehicle(item.vehiculeId)}>
              <View style={styles.rail}>
                <View style={styles.railLine} />
                <View style={[styles.dot, item.kind === 'note' && styles.dotNote]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.when}>{when || '—'}</Text>
                <Text style={styles.model}>{item.modele || 'Véhicule'}</Text>
                {item.immatriculation ? <Text style={styles.plate}>{item.immatriculation}</Text> : null}
                {item.kind === 'note' ? (
                  <Text style={styles.problem} numberOfLines={3}>{item.detail}</Text>
                ) : (
                  <View style={styles.transition}>
                    {isEtat(item.etatFrom) ? <EtatPill etat={item.etatFrom} /> : null}
                    <Text style={styles.arrow}>→</Text>
                    {isEtat(item.etatTo) ? <EtatPill etat={item.etatTo} /> : null}
                  </View>
                )}
                {item.auteur ? <Text style={styles.when}>{item.auteur}</Text> : null}
              </View>
            </Pressable>
          )
        })}
        {data?.truncated ? <Text style={styles.panelHint}>250 mouvements les plus récents.</Text> : null}
      </View>
    </ScrollView>
  )
}

function Metric({
  label,
  value,
  hint,
  bar,
  valueColor,
  selected,
  onPress,
}: {
  label: string
  value: string
  hint: string
  bar: string
  valueColor?: string
  selected?: boolean
  onPress: () => void
}) {
  return (
    <Pressable style={[styles.metric, selected && styles.metricOn]} onPress={onPress}>
      <View style={[styles.metricBar, { backgroundColor: bar }]} />
      <Text style={[styles.metricValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricHint} numberOfLines={2}>{hint}</Text>
    </Pressable>
  )
}

function Chip({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  const bg = active ? (color || theme.text) : '#fff'
  const fg = active ? '#fff' : (color || theme.textMuted)
  const border = color || (active ? theme.text : theme.border)
  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

function EtatPill({ etat }: { etat: string }) {
  const color = isEtat(etat) ? ETAT_CONFIG[etat].color : theme.textMuted
  return (
    <View style={[styles.pill, { backgroundColor: `${color}18`, borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{labelOf(etat)}</Text>
    </View>
  )
}

function SectionHead({ title, hint, color }: { title: string; hint: string; color: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.panelTitle, { color }]}>{title}</Text>
      <View style={[styles.sectionLine, { backgroundColor: color }]} />
      <Text style={[styles.panelHint, { color }]}>{hint}</Text>
    </View>
  )
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.panelHint}>{hint}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: theme.textSubtle, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '700', color: theme.text, letterSpacing: -0.4, marginTop: 2 },
  subtitle: { marginTop: 4, fontSize: 14, color: theme.textMuted },
  toolbar: { marginTop: 16, gap: 8 },
  segment: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 4,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...theme.shadow.sm,
  },
  segmentBtn: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 8 },
  segmentBtnOn: { backgroundColor: theme.text },
  segmentText: { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  segmentTextOn: { color: '#fff' },
  calendarBtn: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  calendarText: { fontWeight: '600', color: theme.text, fontSize: 13 },
  kpiPanel: {
    marginTop: 14, flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', overflow: 'hidden', ...theme.shadow.sm,
  },
  kpiDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.08)' },
  metric: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center' },
  metricOn: { backgroundColor: '#f9fafb' },
  metricBar: { width: 22, height: 3, borderRadius: 99, marginBottom: 8 },
  metricValue: { fontSize: 24, fontWeight: '700', color: theme.text, letterSpacing: -0.4 },
  metricLabel: { marginTop: 2, fontSize: 11, fontWeight: '600', color: theme.text, textAlign: 'center' },
  metricHint: { marginTop: 2, fontSize: 10, color: theme.textSubtle, textAlign: 'center' },
  panel: {
    marginTop: 14, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', ...theme.shadow.sm,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center' },
  sectionHead: { marginBottom: 4 },
  sectionLine: { width: 36, height: 3, borderRadius: 99, marginTop: 6, marginBottom: 4 },
  panelTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  panelHint: { fontSize: 13, fontWeight: '600' },
  searchBox: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.text, paddingVertical: 0 },
  chips: { gap: 8, paddingVertical: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 11, fontWeight: '700' },
  groupLabel: { marginTop: 10, marginBottom: 8, fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },
  car: {
    flexDirection: 'row', backgroundColor: theme.surfaceMuted, borderRadius: 14,
    marginBottom: 8, overflow: 'hidden',
  },
  carBar: { width: 4 },
  carBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 11 },
  carTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  carMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  model: { fontSize: 15, fontWeight: '700', color: theme.text },
  plate: { marginTop: 2, fontSize: 12, color: theme.textMuted, fontVariant: ['tabular-nums'] },
  facts: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  stay: { fontSize: 13, fontWeight: '700', color: theme.text },
  stayStuck: { color: '#ea580c' },
  fact: { flex: 1, fontSize: 13, color: theme.textMuted },
  problem: { marginTop: 4, fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '700' },
  validated: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border, paddingVertical: 12 },
  validatedDays: { fontSize: 12, fontWeight: '700', color: '#047857' },
  timeline: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  rail: { width: 14, alignItems: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#e5e7eb' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#111827', marginTop: 5, borderWidth: 2, borderColor: '#fff' },
  dotNote: { backgroundColor: theme.primary },
  when: { fontSize: 11, color: theme.textSubtle, fontWeight: '600' },
  transition: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  arrow: { color: theme.textSubtle, fontSize: 12 },
  empty: { paddingVertical: 18, alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
})

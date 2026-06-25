import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../theme/appTheme'
import { ETAT_CONFIG, type Vehicule } from '../../types/vehicule'

export type VehiclePickerValue = {
  vehicleId: number | null
  vehicleLabel: string
  isOther: boolean
}

type Props = {
  vehicules: Vehicule[]
  value: VehiclePickerValue
  onChange: (value: VehiclePickerValue) => void
}

function vehicleLabel(v: Vehicule): string {
  return `${v.modele} (${v.immatriculation})`
}

export default function CalendarVehiclePicker({ vehicules, value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = useMemo(
    () => (value.vehicleId != null ? vehicules.find((v) => v.id === value.vehicleId) : null),
    [vehicules, value.vehicleId]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vehicules
    return vehicules.filter(
      (v) =>
        v.modele.toLowerCase().includes(q) ||
        v.immatriculation.toLowerCase().includes(q) ||
        (ETAT_CONFIG[v.etat_actuel]?.label ?? '').toLowerCase().includes(q)
    )
  }, [vehicules, search])

  const collapsedTitle = value.isOther
    ? value.vehicleLabel.trim() || 'Autre véhicule'
    : selected
      ? selected.modele
      : value.vehicleLabel.trim() || 'Choisir un véhicule'

  const collapsedMeta = value.isOther
    ? 'Saisie libre'
    : selected
      ? selected.immatriculation
      : vehicules.length > 0
        ? `${vehicules.length} véhicule${vehicules.length > 1 ? 's' : ''} au garage`
        : 'Aucun véhicule enregistré'

  const pickVehicle = (v: Vehicule) => {
    onChange({
      vehicleId: v.id,
      vehicleLabel: vehicleLabel(v),
      isOther: false,
    })
    setOpen(false)
    setSearch('')
  }

  const pickOther = () => {
    onChange({
      vehicleId: null,
      vehicleLabel: value.isOther ? value.vehicleLabel : '',
      isOther: true,
    })
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[styles.accordionHead, open && styles.accordionHeadOpen]}
      >
        <View style={[styles.iconWrap, value.isOther && styles.iconWrapOther]}>
          <Ionicons
            name={value.isOther ? 'create-outline' : selected?.type === 'moto' ? 'bicycle' : 'car'}
            size={20}
            color={value.isOther ? theme.primaryDark : theme.primaryDark}
          />
        </View>
        <View style={styles.accordionBody}>
          <Text style={styles.accordionLabel}>Véhicule</Text>
          <Text style={styles.accordionValue} numberOfLines={1}>
            {collapsedTitle}
          </Text>
          <Text style={styles.accordionMeta} numberOfLines={1}>
            {collapsedMeta}
          </Text>
        </View>
        {!value.isOther && selected ? (
          <View style={[styles.etatDot, { backgroundColor: ETAT_CONFIG[selected.etat_actuel]?.color ?? theme.textMuted }]} />
        ) : null}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textMuted}
        />
      </Pressable>

      {open ? (
        <View style={styles.accordionPanel}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={theme.primary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Modèle, immatriculation, état…"
              placeholderTextColor={theme.textSubtle}
              autoFocus
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.textSubtle} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={pickOther}
            style={[styles.otherRow, value.isOther && styles.otherRowOn]}
          >
            <View style={[styles.otherIcon, value.isOther && styles.otherIconOn]}>
              <Ionicons name="add-circle-outline" size={20} color={value.isOther ? '#fff' : theme.primary} />
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, value.isOther && styles.rowTitleOn]}>
                Autre véhicule
              </Text>
              <Text style={[styles.rowSub, value.isOther && styles.rowSubOn]}>
                Modèle ou immatriculation non listée
              </Text>
            </View>
            <View style={[styles.radio, value.isOther && styles.radioOn]}>
              {value.isOther ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>

          {value.isOther ? (
            <TextInput
              style={styles.otherInput}
              value={value.vehicleLabel}
              onChangeText={(vehicleLabel) =>
                onChange({ ...value, vehicleLabel, isOther: true, vehicleId: null })
              }
              placeholder="Ex. Peugeot 308 — 12345-A-6"
              placeholderTextColor={theme.textSubtle}
              autoFocus
            />
          ) : null}

          <ScrollView
            style={styles.listBox}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <Text style={styles.empty}>
                {search.trim() ? 'Aucun véhicule pour cette recherche' : 'Aucun véhicule'}
              </Text>
            ) : (
              filtered.map((v) => {
                const active = !value.isOther && value.vehicleId === v.id
                const etat = ETAT_CONFIG[v.etat_actuel]
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => pickVehicle(v)}
                    style={[styles.row, active && styles.rowOn]}
                  >
                    <View style={[styles.vehIcon, active && styles.vehIconOn]}>
                      <Ionicons
                        name={v.type === 'moto' ? 'bicycle' : 'car'}
                        size={18}
                        color={active ? '#fff' : theme.textSecondary}
                      />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowTitle, active && styles.rowTitleOn]} numberOfLines={1}>
                        {v.modele}
                      </Text>
                      <Text style={[styles.rowSub, active && styles.rowSubOn]} numberOfLines={1}>
                        {v.immatriculation}
                      </Text>
                      {etat ? (
                        <View style={styles.etatBadge}>
                          <View style={[styles.etatPill, { backgroundColor: etat.color }]} />
                          <Text style={styles.etatText}>{etat.label}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.radio, active && styles.radioOn]}>
                      {active ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                )
              })
            )}
          </ScrollView>
        </View>
      ) : null}

      {!open && value.isOther ? (
        <TextInput
          style={styles.collapsedOtherInput}
          value={value.vehicleLabel}
          onChangeText={(vehicleLabel) =>
            onChange({ ...value, vehicleLabel, isOther: true, vehicleId: null })
          }
          placeholder="Modèle ou immatriculation"
          placeholderTextColor={theme.textSubtle}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  accordionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  accordionHeadOpen: {
    borderColor: '#fed7aa',
    backgroundColor: theme.primarySoft,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapOther: { backgroundColor: '#fffbeb' },
  accordionBody: { flex: 1, minWidth: 0 },
  accordionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  accordionValue: { fontSize: 15, fontWeight: '700', color: theme.text, marginTop: 2 },
  accordionMeta: { fontSize: 11, color: theme.textSubtle, marginTop: 2 },
  etatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accordionPanel: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#fed7aa',
    backgroundColor: theme.primarySoft,
    borderBottomLeftRadius: theme.radius.sm,
    borderBottomRightRadius: theme.radius.sm,
    padding: 10,
    paddingTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.text, padding: 0 },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    backgroundColor: theme.surface,
    marginBottom: 8,
  },
  otherRowOn: {
    borderColor: theme.primary,
    borderStyle: 'solid',
    backgroundColor: '#fffbeb',
  },
  otherIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherIconOn: { backgroundColor: theme.primary },
  otherInput: {
    borderWidth: 1,
    borderColor: theme.primary,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.surface,
    marginBottom: 8,
  },
  collapsedOtherInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  listBox: { maxHeight: 200 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.borderLight,
    backgroundColor: theme.surface,
    marginBottom: 6,
  },
  rowOn: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffbeb',
  },
  vehIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehIconOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: theme.text },
  rowTitleOn: { color: theme.primaryDark },
  rowSub: { fontSize: 12, color: theme.textMuted, marginTop: 1 },
  rowSubOn: { color: theme.primaryDark },
  etatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  etatPill: { width: 6, height: 6, borderRadius: 3 },
  etatText: { fontSize: 9, fontWeight: '800', color: theme.textMuted, letterSpacing: 0.3 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: theme.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.primary,
  },
  empty: {
    textAlign: 'center',
    color: theme.textMuted,
    fontSize: 13,
    paddingVertical: 16,
    fontStyle: 'italic',
  },
})

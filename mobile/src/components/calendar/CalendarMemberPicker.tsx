import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { AppUser } from '../../lib/vehiculeApi'
import { theme } from '../../theme/appTheme'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function roleLabel(role: string): string {
  if (role === 'responsable') return 'Responsable'
  return 'Technicien'
}

type MemberRow = {
  name: string
  role: string
}

type Props = {
  members: MemberRow[]
  principal: string
  extraMembers: string[]
  onPrincipalChange: (name: string) => void
  onExtraToggle: (name: string) => void
  showExtra?: boolean
}

function MemberAvatar({
  name,
  variant = 'default',
}: {
  name: string
  variant?: 'default' | 'primary' | 'extra'
}) {
  return (
    <View
      style={[
        styles.avatar,
        variant === 'primary' && styles.avatarOn,
        variant === 'extra' && styles.avatarExtra,
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          (variant === 'primary' || variant === 'extra') && styles.avatarTextOn,
        ]}
      >
        {initials(name)}
      </Text>
    </View>
  )
}

export default function CalendarMemberPicker({
  members,
  principal,
  extraMembers,
  onPrincipalChange,
  onExtraToggle,
  showExtra = true,
}: Props) {
  const [principalOpen, setPrincipalOpen] = useState(false)
  const [extraOpen, setExtraOpen] = useState(false)
  const [principalSearch, setPrincipalSearch] = useState('')
  const [extraSearch, setExtraSearch] = useState('')

  const principalRow = useMemo(
    () => members.find((m) => m.name === principal) ?? members[0],
    [members, principal]
  )

  const filterMembers = (list: MemberRow[], q: string) => {
    const query = q.trim().toLowerCase()
    if (!query) return list
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        roleLabel(m.role).toLowerCase().includes(query)
    )
  }

  const principalFiltered = useMemo(
    () => filterMembers(members, principalSearch),
    [members, principalSearch]
  )

  const extraCandidates = useMemo(
    () => members.filter((m) => m.name !== principal),
    [members, principal]
  )

  const extraFiltered = useMemo(
    () => filterMembers(extraCandidates, extraSearch),
    [extraCandidates, extraSearch]
  )

  const openPrincipal = () => {
    setExtraOpen(false)
    setPrincipalOpen((o) => !o)
  }

  const openExtra = () => {
    setPrincipalOpen(false)
    setExtraOpen((o) => !o)
  }

  const pickPrincipal = (name: string) => {
    onPrincipalChange(name)
    setPrincipalOpen(false)
    setPrincipalSearch('')
  }

  return (
    <View style={styles.wrap}>
      {/* Membre principal — replié */}
      <Pressable
        onPress={openPrincipal}
        style={[styles.accordionHead, principalOpen && styles.accordionHeadOpen]}
      >
        <MemberAvatar name={principalRow?.name ?? principal} variant="primary" />
        <View style={styles.accordionBody}>
          <Text style={styles.accordionLabel}>Membre principal</Text>
          <Text style={styles.accordionValue} numberOfLines={1}>
            {principal || 'Choisir un membre'}
          </Text>
          {principalRow ? (
            <Text style={styles.accordionMeta}>{roleLabel(principalRow.role)}</Text>
          ) : null}
        </View>
        <Ionicons
          name={principalOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.textMuted}
        />
      </Pressable>

      {principalOpen ? (
        <View style={styles.accordionPanel}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color={theme.primary} />
            <TextInput
              style={styles.searchInput}
              value={principalSearch}
              onChangeText={setPrincipalSearch}
              placeholder="Rechercher…"
              placeholderTextColor={theme.textSubtle}
              autoFocus
            />
            {principalSearch.length > 0 ? (
              <Pressable onPress={() => setPrincipalSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.textSubtle} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView
            style={styles.listBox}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {principalFiltered.length === 0 ? (
              <Text style={styles.empty}>Aucun membre trouvé</Text>
            ) : (
              principalFiltered.map((m) => {
                const selected = principal === m.name
                return (
                  <Pressable
                    key={`principal-${m.name}`}
                    onPress={() => pickPrincipal(m.name)}
                    style={[styles.row, selected && styles.rowPrincipal]}
                  >
                    <MemberAvatar name={m.name} variant={selected ? 'primary' : 'default'} />
                    <View style={styles.rowBody}>
                      <Text style={[styles.rowName, selected && styles.rowNameOn]} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <View style={[styles.roleBadge, selected && styles.roleBadgeOn]}>
                        <Text style={[styles.roleText, selected && styles.roleTextOn]}>
                          {roleLabel(m.role)}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.radio, selected && styles.radioOn]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                )
              })
            )}
          </ScrollView>
        </View>
      ) : null}

      {/* Équipe supplémentaire — replié */}
      {showExtra && members.length > 1 ? (
        <>
          <Pressable
            onPress={openExtra}
            style={[styles.accordionHead, styles.accordionGap, extraOpen && styles.accordionHeadOpen]}
          >
            <View style={styles.extraIconWrap}>
              <Ionicons name="people" size={20} color={theme.primaryDark} />
            </View>
            <View style={styles.accordionBody}>
              <Text style={styles.accordionLabel}>Équipe supplémentaire</Text>
              <Text style={styles.accordionValue} numberOfLines={1}>
                {extraMembers.length === 0
                  ? 'Aucun — optionnel'
                  : extraMembers.join(', ')}
              </Text>
              {extraMembers.length > 0 ? (
                <Text style={styles.accordionMeta}>
                  {extraMembers.length} membre{extraMembers.length > 1 ? 's' : ''} en plus
                </Text>
              ) : (
                <Text style={styles.accordionMeta}>Même travail, autres membres</Text>
              )}
            </View>
            <Ionicons
              name={extraOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.textMuted}
            />
          </Pressable>

          {extraOpen ? (
            <View style={styles.accordionPanel}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color={theme.primary} />
                <TextInput
                  style={styles.searchInput}
                  value={extraSearch}
                  onChangeText={setExtraSearch}
                  placeholder="Rechercher…"
                  placeholderTextColor={theme.textSubtle}
                  autoFocus
                />
                {extraSearch.length > 0 ? (
                  <Pressable onPress={() => setExtraSearch('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={theme.textSubtle} />
                  </Pressable>
                ) : null}
              </View>
              {extraFiltered.length === 0 ? (
                <Text style={styles.emptyInline}>
                  {extraSearch.trim()
                    ? 'Aucun autre membre pour cette recherche'
                    : 'Aucun autre membre disponible'}
                </Text>
              ) : (
                <View style={styles.extraList}>
                  {extraFiltered.map((m) => {
                    const checked = extraMembers.includes(m.name)
                    return (
                      <Pressable
                        key={`extra-${m.name}`}
                        onPress={() => onExtraToggle(m.name)}
                        style={[styles.row, checked && styles.rowExtra]}
                      >
                        <MemberAvatar name={m.name} variant={checked ? 'extra' : 'default'} />
                        <View style={styles.rowBody}>
                          <Text style={styles.rowName} numberOfLines={1}>
                            {m.name}
                          </Text>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{roleLabel(m.role)}</Text>
                          </View>
                        </View>
                        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                          {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

export function buildMemberRows(users: AppUser[], memberNames: string[]): MemberRow[] {
  const byName = new Map(users.map((u) => [u.nom_complet.trim().toLowerCase(), u]))
  return memberNames.map((name) => {
    const u = byName.get(name.toLowerCase())
    return { name, role: u?.role ?? 'technicien' }
  })
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
  accordionGap: { marginTop: 10 },
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
  extraIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primarySoft,
    borderWidth: 1,
    borderColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
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
  listBox: { maxHeight: 180 },
  extraList: { gap: 6 },
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
  rowPrincipal: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffbeb',
  },
  rowExtra: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffbeb',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  avatarExtra: { backgroundColor: theme.primaryDark, borderColor: theme.primaryDark },
  avatarText: { fontSize: 13, fontWeight: '800', color: theme.textSecondary },
  avatarTextOn: { color: '#fff' },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14, fontWeight: '700', color: theme.text },
  rowNameOn: { color: theme.primaryDark },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.bg,
  },
  roleBadgeOn: { backgroundColor: 'rgba(249,115,22,0.15)' },
  roleText: { fontSize: 10, fontWeight: '700', color: theme.textMuted },
  roleTextOn: { color: theme.primaryDark },
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
  checkboxOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  empty: { textAlign: 'center', color: theme.textMuted, fontSize: 13, paddingVertical: 16 },
  emptyInline: {
    fontSize: 12,
    color: theme.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
})

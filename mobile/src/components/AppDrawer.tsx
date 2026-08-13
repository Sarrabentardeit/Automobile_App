import { useEffect, useState } from 'react'
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { StoredUser } from '../lib/authStorage'
import { getSheetBottomInset, getStatusBarInset } from '../lib/safeArea'
import {
  MENU_STRUCTURE,
  categoryMenuItems,
  hasMenuAccess,
  initialOpenMenuSections,
  type MenuRouteId,
} from '../navigation/menuConfig'
import { ROLE_LABELS, mapRole, type Permissions } from '../types/permissions'
import { mediaUrl } from '../lib/vehiculeApi'

type Props = {
  visible: boolean
  user: StoredUser
  permissions: Permissions
  currentRoute: MenuRouteId
  onClose: () => void
  onNavigate: (route: MenuRouteId) => void
  onLogout: () => void
  onOpenSearch?: () => void
  onEditProfile?: () => void
}

export default function AppDrawer({
  visible,
  user,
  permissions,
  currentRoute,
  onClose,
  onNavigate,
  onLogout,
  onOpenSearch,
  onEditProfile,
}: Props) {
  const role = mapRole(user.role)
  const topInset = getStatusBarInset()
  const bottomInset = getSheetBottomInset()
  const [openSections, setOpenSections] = useState(() =>
    initialOpenMenuSections(currentRoute)
  )

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev }
      let changed = false
      for (const cat of MENU_STRUCTURE) {
        if (cat.collapsible && cat.matchRoutes?.includes(currentRoute) && !next[cat.id]) {
          next[cat.id] = true
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [currentRoute])

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const confirmLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: () => {
          onClose()
          onLogout()
        },
      },
    ])
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View
          style={[styles.drawer, { paddingTop: topInset, paddingBottom: bottomInset }]}
          pointerEvents="auto"
        >
          <View style={styles.drawerHeader}>
            <Image source={require('../../assets/logo.jpg')} style={styles.logo} />
            <Text style={styles.brand}>EL MECANO</Text>
          </View>

          <Pressable
            style={styles.userBlock}
            onPress={() => {
              if (!onEditProfile) return
              onClose()
              onEditProfile()
            }}
            disabled={!onEditProfile}
          >
            {user.avatarUrl ? (
              <Image source={{ uri: mediaUrl(user.avatarUrl) }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.fullName}
              </Text>
              <Text style={styles.userRole}>{ROLE_LABELS[role]}</Text>
              {onEditProfile ? (
                <Text style={styles.editHint}>Modifier le profil</Text>
              ) : null}
            </View>
            {onEditProfile ? (
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            ) : null}
          </Pressable>

          {onOpenSearch ? (
            <Pressable
              style={styles.searchBtn}
              onPress={onOpenSearch}
              accessibilityLabel="Recherche globale"
            >
              <Ionicons name="search" size={18} color="#fed7aa" />
              <Text style={styles.searchBtnText}>Recherche (immat, client…)</Text>
            </Pressable>
          ) : null}

          <ScrollView
            style={styles.nav}
            contentContainerStyle={styles.navContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {MENU_STRUCTURE.map((category) => {
              const flat = categoryMenuItems(category).filter((item) =>
                hasMenuAccess(permissions, role, item)
              )
              if (flat.length === 0) return null

              const sectionActive = Boolean(category.matchRoutes?.includes(currentRoute))
              const isOpen = !category.collapsible || openSections[category.id]

              if (category.collapsible) {
                const groups = category.groups
                  ?.map((g) => ({
                    ...g,
                    items: g.items.filter((item) => hasMenuAccess(permissions, role, item)),
                  }))
                  .filter((g) => g.items.length > 0)

                return (
                  <View key={category.id} style={styles.category}>
                    <Pressable
                      onPress={() => toggleSection(category.id)}
                      style={[styles.sectionToggle, sectionActive && styles.sectionToggleActive]}
                    >
                      <Ionicons
                        name={category.icon ?? 'folder-outline'}
                        size={18}
                        color="#fb923c"
                      />
                      <Text style={styles.sectionToggleText}>{category.label}</Text>
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#9ca3af"
                      />
                    </Pressable>
                    {isOpen ? (
                      <View style={styles.sectionBody}>
                        {groups?.length
                          ? groups.map((group) => (
                              <View key={group.title} style={styles.financeGroup}>
                                <Text style={styles.groupTitle}>{group.title}</Text>
                                {group.items.map((item) => {
                                  const active = currentRoute === item.id
                                  return (
                                    <Pressable
                                      key={item.id}
                                      onPress={() => {
                                        onNavigate(item.id)
                                        onClose()
                                      }}
                                      style={[
                                        styles.navItem,
                                        styles.navItemNested,
                                        active && styles.navItemActive,
                                      ]}
                                    >
                                      <Ionicons
                                        name={item.icon}
                                        size={16}
                                        color={active ? '#fff' : '#9ca3af'}
                                      />
                                      <Text
                                        style={[styles.navText, active && styles.navTextActive]}
                                        numberOfLines={1}
                                      >
                                        {item.name}
                                      </Text>
                                    </Pressable>
                                  )
                                })}
                              </View>
                            ))
                          : flat.map((item) => {
                              const active = currentRoute === item.id
                              return (
                                <Pressable
                                  key={item.id}
                                  onPress={() => {
                                    onNavigate(item.id)
                                    onClose()
                                  }}
                                  style={[
                                    styles.navItem,
                                    styles.navItemNested,
                                    active && styles.navItemActive,
                                  ]}
                                >
                                  <Ionicons
                                    name={item.icon}
                                    size={16}
                                    color={active ? '#fff' : '#9ca3af'}
                                  />
                                  <Text
                                    style={[styles.navText, active && styles.navTextActive]}
                                    numberOfLines={1}
                                  >
                                    {item.name}
                                  </Text>
                                  {!item.implemented ? (
                                    <Text style={styles.soonBadge}>bientôt</Text>
                                  ) : null}
                                </Pressable>
                              )
                            })}
                      </View>
                    ) : null}
                  </View>
                )
              }

              return (
                <View key={category.id} style={[styles.category, styles.pinnedCategory]}>
                  {flat.map((item) => {
                    const active = currentRoute === item.id
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          onNavigate(item.id)
                          onClose()
                        }}
                        style={[styles.navItem, active && styles.navItemActive]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={active ? '#fff' : '#9ca3af'}
                        />
                        <Text
                          style={[styles.navText, active && styles.navTextActive]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {!item.implemented ? (
                          <Text style={styles.soonBadge}>bientôt</Text>
                        ) : null}
                      </Pressable>
                    )
                  })}
                </View>
              )
            })}
          </ScrollView>

          <View style={styles.logoutBar}>
            <Pressable
              style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
              onPress={confirmLogout}
              accessibilityRole="button"
              accessibilityLabel="Déconnexion"
            >
              <Ionicons name="log-out-outline" size={20} color="#fecaca" />
              <Text style={styles.logoutText}>Déconnexion</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 0,
    elevation: 0,
  },
  drawer: {
    width: 280,
    maxWidth: '86%',
    height: '100%',
    backgroundColor: '#030712',
    zIndex: 2,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    flexDirection: 'column',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  logo: { width: 40, height: 40, borderRadius: 10 },
  brand: { fontSize: 17, fontWeight: '800', color: '#f9fafb', letterSpacing: 0.5 },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  editHint: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: '#f9fafb', fontSize: 14, fontWeight: '600' },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(254,215,170,0.35)',
    flexShrink: 0,
  },
  searchBtnText: { color: '#fed7aa', fontSize: 13, fontWeight: '700', flex: 1 },
  userRole: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  nav: { flex: 1, minHeight: 0, paddingHorizontal: 10 },
  navContent: { paddingVertical: 8, paddingBottom: 16 },
  category: { marginBottom: 16 },
  pinnedCategory: {
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sectionToggleActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionToggleText: {
    flex: 1,
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionBody: {
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    marginBottom: 6,
  },
  financeGroup: {
    marginBottom: 6,
  },
  groupTitle: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  navItemNested: {
    paddingVertical: 9,
  },
  navItemActive: {
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  navText: {
    flex: 1,
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  navTextActive: { color: '#fff', fontWeight: '600' },
  soonBadge: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  logoutBar: {
    flexShrink: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#0a0f1a',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  logoutPressed: { opacity: 0.85 },
  logoutText: { color: '#fecaca', fontSize: 15, fontWeight: '700' },
})

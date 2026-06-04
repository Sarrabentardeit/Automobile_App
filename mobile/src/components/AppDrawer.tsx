import {
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
import {
  MENU_STRUCTURE,
  hasMenuAccess,
  type MenuRouteId,
} from '../navigation/menuConfig'
import { ROLE_LABELS, mapRole, type Permissions } from '../types/permissions'

type Props = {
  visible: boolean
  user: StoredUser
  permissions: Permissions
  currentRoute: MenuRouteId
  onClose: () => void
  onNavigate: (route: MenuRouteId) => void
  onLogout: () => void
}

export default function AppDrawer({
  visible,
  user,
  permissions,
  currentRoute,
  onClose,
  onNavigate,
  onLogout,
}: Props) {
  const role = mapRole(user.role)

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
        <View style={styles.drawer} pointerEvents="auto">
          <View style={styles.drawerHeader}>
            <Image source={require('../../assets/logo.jpg')} style={styles.logo} />
            <Text style={styles.brand}>EL MECANO</Text>
          </View>

          <View style={styles.userBlock}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.fullName}
              </Text>
              <Text style={styles.userRole}>{ROLE_LABELS[role]}</Text>
            </View>
          </View>

          <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
            {MENU_STRUCTURE.map((category) => {
              const items = category.items.filter((item) =>
                hasMenuAccess(permissions, role, item)
              )
              if (items.length === 0) return null

              return (
                <View key={category.label ?? 'main'} style={styles.category}>
                  {category.label ? (
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                  ) : null}
                  {items.map((item) => {
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

          <Pressable style={styles.logoutBtn} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={18} color="#f87171" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </Pressable>
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
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
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
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: '#f9fafb', fontSize: 14, fontWeight: '600' },
  userRole: {
    color: '#fb923c',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  nav: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  category: { marginBottom: 16 },
  categoryLabel: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 10,
    marginBottom: 6,
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  logoutText: { color: '#f87171', fontSize: 14, fontWeight: '600' },
})

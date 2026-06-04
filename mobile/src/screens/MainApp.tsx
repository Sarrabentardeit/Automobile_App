import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import AppDrawer from '../components/AppDrawer'
import NotificationsBell from '../components/NotificationsBell'
import { getStatusBarInset } from '../lib/safeArea'
import { normalizeStoredUser, type StoredUser } from '../lib/authStorage'
import {
  getDefaultRoute,
  getMenuTitle,
  type MenuRouteId,
} from '../navigation/menuConfig'
import { mapRole, type Permissions } from '../types/permissions'
import VehiculeFormModal from '../components/VehiculeFormModal'
import PlaceholderScreen from './PlaceholderScreen'
import VehiculeDetailScreen from './VehiculeDetailScreen'
import type { VehiculeOpenOptions } from '../navigation/vehiculeNav'
import ClientsListScreen from './ClientsListScreen'
import ContactsImportantsScreen from './ContactsImportantsScreen'
import EquipeMembresScreen from './EquipeMembresScreen'
import ProduitsListScreen from './ProduitsListScreen'
import ReclamationsScreen from './ReclamationsScreen'
import StockGeneralScreen from './StockGeneralScreen'
import VehiculesListScreen from './VehiculesListScreen'

type Props = {
  user: StoredUser
  accessToken: string
  onLogout: () => void
}

type NavState =
  | { type: 'menu'; route: MenuRouteId }
  | {
      type: 'vehicule_detail'
      route: MenuRouteId
      vehiculeId: number
      initialTab?: VehiculeOpenOptions['initialTab']
    }

export default function MainApp({ user: rawUser, accessToken, onLogout }: Props) {
  const user = normalizeStoredUser(rawUser)
  const permissions = user.permissions

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showAddVehicule, setShowAddVehicule] = useState(false)
  const [listRefreshKey, setListRefreshKey] = useState(0)
  const [clientsRefreshKey, setClientsRefreshKey] = useState(0)
  const [nav, setNav] = useState<NavState>(() => ({
    type: 'menu',
    route: getDefaultRoute(permissions, mapRole(user.role)),
  }))

  const currentRoute = nav.route
  const title = getMenuTitle(currentRoute)

  const goTo = (route: MenuRouteId) => {
    setNav({ type: 'menu', route })
  }

  const showShell = nav.type === 'menu'
  const statusBarInset = getStatusBarInset()

  const content = () => {
    if (nav.type === 'vehicule_detail') {
      return (
        <VehiculeDetailScreen
          vehiculeId={nav.vehiculeId}
          accessToken={accessToken}
          user={user}
          archives={nav.route === 'vehicules_archives'}
          initialTab={nav.initialTab}
          onBack={() => setNav({ type: 'menu', route: nav.route })}
          onOpenVehicule={(id) =>
            setNav({
              type: 'vehicule_detail',
              route: nav.route,
              vehiculeId: id,
            })
          }
        />
      )
    }

    switch (nav.route) {
      case 'vehicules':
        return (
          <VehiculesListScreen
            accessToken={accessToken}
            user={user}
            refreshKey={listRefreshKey}
            archives={false}
            onOpenVehicule={(id, opts) =>
              setNav({
                type: 'vehicule_detail',
                route: 'vehicules',
                vehiculeId: id,
                initialTab: opts?.initialTab,
              })
            }
            onAddVehicule={
              permissions.canAddVehicule ? () => setShowAddVehicule(true) : undefined
            }
            onListChanged={() => setListRefreshKey((k) => k + 1)}
          />
        )
      case 'vehicules_archives':
        return (
          <VehiculesListScreen
            accessToken={accessToken}
            user={user}
            archives
            refreshKey={listRefreshKey}
            onOpenVehicule={(id, opts) =>
              setNav({
                type: 'vehicule_detail',
                route: 'vehicules_archives',
                vehiculeId: id,
                initialTab: opts?.initialTab,
              })
            }
            onListChanged={() => setListRefreshKey((k) => k + 1)}
          />
        )
      case 'clients':
        return (
          <ClientsListScreen
            accessToken={accessToken}
            refreshKey={clientsRefreshKey}
            drawerOpen={drawerOpen}
          />
        )
      case 'reclamation':
        return (
          <ReclamationsScreen accessToken={accessToken} drawerOpen={drawerOpen} />
        )
      case 'equipe_membres':
        return (
          <EquipeMembresScreen
            accessToken={accessToken}
            canManageUsers={!!permissions.canManageUsers}
            drawerOpen={drawerOpen}
          />
        )
      case 'contacts':
        return (
          <ContactsImportantsScreen
            accessToken={accessToken}
            drawerOpen={drawerOpen}
          />
        )
      case 'stock':
        return (
          <StockGeneralScreen
            accessToken={accessToken}
            canViewInventory={!!permissions.canViewInventory}
            drawerOpen={drawerOpen}
          />
        )
      case 'produits':
        return (
          <ProduitsListScreen
            accessToken={accessToken}
            canViewInventory={!!permissions.canViewInventory}
            drawerOpen={drawerOpen}
          />
        )
      default:
        return <PlaceholderScreen title={title} />
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style={showShell ? 'light' : 'dark'} />

      {showShell ? (
        <View style={[styles.header, { paddingTop: statusBarInset }]}>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.menuBtn}
              onPress={() => setDrawerOpen(true)}
              hitSlop={8}
            >
              <Ionicons name="menu" size={26} color="#f9fafb" />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <NotificationsBell
              accessToken={accessToken}
              userId={user.id}
              onOpenVehicule={(vehiculeId) => {
                setDrawerOpen(false)
                setNav({
                  type: 'vehicule_detail',
                  route: 'vehicules',
                  vehiculeId,
                })
              }}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.body}>{content()}</View>

      <VehiculeFormModal
        visible={showAddVehicule}
        vehicule={null}
        accessToken={accessToken}
        onClose={() => setShowAddVehicule(false)}
        onSaved={(v) => {
          setListRefreshKey((k) => k + 1)
          setShowAddVehicule(false)
          setNav({ type: 'vehicule_detail', route: 'vehicules', vehiculeId: v.id })
        }}
      />

      <AppDrawer
        visible={drawerOpen}
        user={user}
        permissions={permissions}
        currentRoute={currentRoute}
        onClose={() => setDrawerOpen(false)}
        onNavigate={goTo}
        onLogout={onLogout}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: '#030712',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 12,
    minHeight: 48,
  },
  menuBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#f9fafb',
  },
  body: { flex: 1 },
})

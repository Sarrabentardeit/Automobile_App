import { useCallback, useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import AppDrawer from '../components/AppDrawer'
import GlobalSearchModal from '../components/GlobalSearchModal'
import ProfileEditModal from '../components/ProfileEditModal'
import NotificationsBell, {
  type NotificationNavigateTarget,
} from '../components/NotificationsBell'
import { getStatusBarInset } from '../lib/safeArea'
import {
  normalizeStoredUser,
  updateStoredUser,
  type StoredUser,
} from '../lib/authStorage'
import { playMessageSound, playNotificationSound } from '../lib/appSounds'
import {
  claimNotificationResponseId,
  pushPayloadToNavTarget,
  registerExpoPushToken,
} from '../lib/pushNotifications'
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
import type { EtatVehicule } from '../types/vehicule'
import ClientsListScreen from './ClientsListScreen'
import ContactsImportantsScreen from './ContactsImportantsScreen'
import EquipeMembresScreen from './EquipeMembresScreen'
import ChatScreen from './ChatScreen'
import ProduitsListScreen from './ProduitsListScreen'
import ClientsDettesScreen from './ClientsDettesScreen'
import FournisseursScreen from './FournisseursScreen'
import ChecklistsScreen from './ChecklistsScreen'
import ChecklistTemplatesScreen from './ChecklistTemplatesScreen'
import CalendarScreen from './CalendarScreen'
import DashboardScreen from './DashboardScreen'
import DemandesDevisScreen from './DemandesDevisScreen'
import FactureAchatScreen from './FactureAchatScreen'
import FactureVenteScreen from './FactureVenteScreen'
import PaiementsAchatScreen from './PaiementsAchatScreen'
import PaiementsVenteScreen from './PaiementsVenteScreen'
import CaisseScreen from './CaisseScreen'
import TransactionsFournisseursScreen from './TransactionsFournisseursScreen'
import MoneyScreen from './MoneyScreen'
import DocumentsScreen from './DocumentsScreen'
import StatistiquesScreen from './StatistiquesScreen'
import UtilisateursScreen from './UtilisateursScreen'
import OutilsAhmedScreen from './OutilsAhmedScreen'
import ReclamationsScreen from './ReclamationsScreen'
import StockGeneralScreen from './StockGeneralScreen'
import VehiculesListScreen from './VehiculesListScreen'

type Props = {
  user: StoredUser
  accessToken: string
  onLogout: () => void
  onUserUpdated?: (user: StoredUser) => void
}

type NavState =
  | {
      type: 'menu'
      route: MenuRouteId
      vehiculesEtat?: EtatVehicule
      conversationId?: number
      detteId?: number
    }
  | {
      type: 'vehicule_detail'
      route: MenuRouteId
      vehiculeId: number
      initialTab?: VehiculeOpenOptions['initialTab']
    }

export default function MainApp({
  user: rawUser,
  accessToken,
  onLogout,
  onUserUpdated,
}: Props) {
  const [user, setUser] = useState(() => normalizeStoredUser(rawUser))
  const permissions = user.permissions

  useEffect(() => {
    setUser(normalizeStoredUser(rawUser))
  }, [rawUser])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showAddVehicule, setShowAddVehicule] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
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

  const goToVehiculesEtat = (etat: EtatVehicule) => {
    setNav({ type: 'menu', route: 'vehicules', vehiculesEtat: etat })
  }

  const navigateFromNotification = useCallback((target: NotificationNavigateTarget) => {
    setDrawerOpen(false)
    if (target.kind === 'vehicule') {
      setNav({
        type: 'vehicule_detail',
        route: 'vehicules',
        vehiculeId: target.vehiculeId,
      })
      return
    }
    if (target.kind === 'chat') {
      setNav({
        type: 'menu',
        route: 'chat',
        conversationId: target.conversationId,
      })
      return
    }
    if (target.kind === 'dette') {
      setNav({
        type: 'menu',
        route: 'clients_dettes',
        detteId: target.detteId,
      })
      return
    }
    setNav({ type: 'menu', route: target.route })
  }, [])

  useEffect(() => {
    void registerExpoPushToken(accessToken).catch(() => undefined)
  }, [accessToken])

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      if (!claimNotificationResponseId(response.notification.request.identifier)) return
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined
      const target = pushPayloadToNavTarget(data)
      if (target) navigateFromNotification(target)
    }
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse)
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response)
    })
    return () => sub.remove()
  }, [navigateFromNotification])

  /** Son in-app à l’arrivée d’une push (app ouverte). */
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown> | undefined
      const type = String(data?.type ?? '').toLowerCase()
      if (type.includes('chat') || data?.conversationId != null) {
        playMessageSound()
      } else {
        playNotificationSound()
      }
    })
    return () => sub.remove()
  }, [])

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
          onNavigateRoute={(route) => setNav({ type: 'menu', route })}
          onNavigateNotification={navigateFromNotification}
        />
      )
    }

    switch (nav.route) {
      case 'dashboard':
        return (
          <DashboardScreen
            accessToken={accessToken}
            userId={user.id}
            userName={user.fullName}
            userRole={user.role}
            permissions={permissions}
            onNavigate={goTo}
            onOpenVehicule={(id) =>
              setNav({ type: 'vehicule_detail', route: 'vehicules', vehiculeId: id })
            }
            onOpenVehiculesEtat={goToVehiculesEtat}
          />
        )
      case 'vehicules':
        return (
          <VehiculesListScreen
            accessToken={accessToken}
            user={user}
            refreshKey={listRefreshKey}
            archives={false}
            initialFiltreEtat={nav.type === 'menu' ? nav.vehiculesEtat : undefined}
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
      case 'chat':
        return (
          <ChatScreen
            accessToken={accessToken}
            userId={user.id}
            initialConversationId={
              nav.type === 'menu' ? nav.conversationId ?? null : null
            }
          />
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
      case 'clients_dettes':
        return (
          <ClientsDettesScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
            initialDetteId={nav.type === 'menu' ? nav.detteId ?? null : null}
          />
        )
      case 'fournisseurs':
        return (
          <FournisseursScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
          />
        )
      case 'devis':
        return (
          <DemandesDevisScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
          />
        )
      case 'facturation_vente':
        return (
          <FactureVenteScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
          />
        )
      case 'paiements_vente':
        return (
          <PaiementsVenteScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
          />
        )
      case 'facturation_achat':
        return (
          <FactureAchatScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
          />
        )
      case 'paiements_achat':
        return (
          <PaiementsAchatScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
          />
        )
      case 'caisse':
        return (
          <CaisseScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
          />
        )
      case 'fournisseurs_transactions':
        return (
          <TransactionsFournisseursScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
          />
        )
      case 'money':
        return (
          <MoneyScreen
            accessToken={accessToken}
            canViewFinance={!!permissions.canViewFinance}
            drawerOpen={drawerOpen}
          />
        )
      case 'documents':
        return (
          <DocumentsScreen
            accessToken={accessToken}
            drawerOpen={drawerOpen}
          />
        )
      case 'admin':
        return (
          <StatistiquesScreen
            accessToken={accessToken}
            canManageUsers={!!permissions.canManageUsers}
            drawerOpen={drawerOpen}
            onNavigate={goTo}
          />
        )
      case 'utilisateurs':
        return (
          <UtilisateursScreen
            accessToken={accessToken}
            canManageUsers={!!permissions.canManageUsers}
            isAdmin={mapRole(user.role) === 'admin'}
            currentUserId={user.id}
            drawerOpen={drawerOpen}
          />
        )
      case 'outils_ahmed':
        return (
          <OutilsAhmedScreen
            accessToken={accessToken}
            canViewEquipeOutils={!!permissions.canViewEquipeOutils}
            drawerOpen={drawerOpen}
          />
        )
      case 'calendar':
        return (
          <CalendarScreen
            accessToken={accessToken}
            userRole={user.role}
            drawerOpen={drawerOpen}
          />
        )
      case 'checklists':
        return (
          <ChecklistsScreen
            accessToken={accessToken}
            userRole={user.role}
            drawerOpen={drawerOpen}
          />
        )
      case 'checklists_modeles':
        return (
          <ChecklistTemplatesScreen accessToken={accessToken} userRole={user.role} />
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
            <Pressable
              style={styles.menuBtn}
              onPress={() => setShowSearch(true)}
              hitSlop={8}
              accessibilityLabel="Recherche globale"
            >
              <Ionicons name="search" size={22} color="#f9fafb" />
            </Pressable>
            <NotificationsBell
              accessToken={accessToken}
              onNavigate={navigateFromNotification}
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

      <GlobalSearchModal
        visible={showSearch}
        accessToken={accessToken}
        onClose={() => setShowSearch(false)}
        onOpenVehicule={(id) => {
          setNav({ type: 'vehicule_detail', route: 'vehicules', vehiculeId: id })
        }}
        onOpenClients={() => goTo('clients')}
      />

      <AppDrawer
        visible={drawerOpen}
        user={user}
        permissions={permissions}
        currentRoute={currentRoute}
        onClose={() => setDrawerOpen(false)}
        onNavigate={goTo}
        onLogout={onLogout}
        onEditProfile={() => setShowProfile(true)}
      />

      <ProfileEditModal
        visible={showProfile}
        accessToken={accessToken}
        fullName={user.fullName}
        telephone={user.telephone}
        avatarUrl={user.avatarUrl}
        onClose={() => setShowProfile(false)}
        onSaved={(data) => {
          const next = normalizeStoredUser({
            ...user,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl,
          })
          setUser(next)
          void updateStoredUser(next)
          onUserUpdated?.(next)
        }}
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

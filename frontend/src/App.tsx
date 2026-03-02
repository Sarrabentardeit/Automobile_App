import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { VehiculesProvider } from '@/contexts/VehiculesContext'
import { TeamMembersProvider } from '@/contexts/TeamMembersContext'
import { FournisseursProvider } from '@/contexts/FournisseursContext'
import { TransactionsFournisseursProvider } from '@/contexts/TransactionsFournisseursContext'
import { StockGeneralProvider } from '@/contexts/StockGeneralContext'
import { OutilsProvider } from '@/contexts/OutilsContext'
import { ClientsProvider } from '@/contexts/ClientsContext'
import { ClientsDettesProvider } from '@/contexts/ClientsDettesContext'
import { ContactsImportantsProvider } from '@/contexts/ContactsImportantsContext'
import { DemandesDevisProvider } from '@/contexts/DemandesDevisContext'
import { ReclamationsProvider } from '@/contexts/ReclamationsContext'
import { HuileProvider } from '@/contexts/HuileContext'
import { CalendarProvider } from '@/contexts/CalendarContext'
import { MoneyProvider } from '@/contexts/MoneyContext'
import { CaisseProvider } from '@/contexts/CaisseContext'
import { FacturationProvider } from '@/contexts/FacturationContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { NotificationsProvider } from '@/contexts/NotificationsContext'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import VehiculesPage from '@/pages/VehiculesPage'
import VehiculeDetailPage from '@/pages/VehiculeDetailPage'
import UtilisateursPage from '@/pages/UtilisateursPage'
import CaissePage from '@/pages/CaissePage'
import EquipeMembresPage from '@/pages/EquipeMembresPage'
import MoneyPage from '@/pages/MoneyPage'
import CalendarPage from '@/pages/CalendarPage'
import ReclamationPage from '@/pages/ReclamationPage'
import HuilePage from '@/pages/HuilePage'
import ClientsPage from '@/pages/ClientsPage'
import ClientsDettesPage from '@/pages/ClientsDettesPage'
import ContactsImportantsPage from '@/pages/ContactsImportantsPage'
import DemandeDevisPage from '@/pages/DemandeDevisPage'
import FournisseursPage from '@/pages/FournisseursPage'
import TransactionsFournisseursPage from '@/pages/TransactionsFournisseursPage'
import StockGeneralPage from '@/pages/StockGeneralPage'
import OutilsMohamedPage from '@/pages/OutilsMohamedPage'
import OutilsAhmedPage from '@/pages/OutilsAhmedPage'
import AdminEspacePage from '@/pages/AdminEspacePage'
import FacturationPage from '@/pages/FacturationPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <AuthProvider>
      <NotificationsProvider>
        <VehiculesProvider>
          <TeamMembersProvider>
            <FournisseursProvider>
              <TransactionsFournisseursProvider>
              <StockGeneralProvider>
              <OutilsProvider>
              <ClientsProvider>
              <ClientsDettesProvider>
              <ContactsImportantsProvider>
              <DemandesDevisProvider>
              <ReclamationsProvider>
              <HuileProvider>
              <CalendarProvider>
              <MoneyProvider>
              <CaisseProvider>
              <FacturationProvider>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin" element={<AdminEspacePage />} />
              <Route path="/facturation" element={<FacturationPage />} />
              <Route path="/vehicules" element={<VehiculesPage />} />
              <Route path="/vehicules/:id" element={<VehiculeDetailPage />} />
              <Route path="/utilisateurs" element={<UtilisateursPage />} />
              <Route path="/caisse" element={<CaissePage />} />
              <Route path="/equipe/membres" element={<EquipeMembresPage />} />
              <Route path="/money" element={<MoneyPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/reclamation" element={<ReclamationPage />} />
              <Route path="/huile" element={<HuilePage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/dettes" element={<ClientsDettesPage />} />
              <Route path="/contacts-importants" element={<ContactsImportantsPage />} />
              <Route path="/devis" element={<DemandeDevisPage />} />
              <Route path="/fournisseurs" element={<FournisseursPage />} />
              <Route path="/fournisseurs/transactions" element={<TransactionsFournisseursPage />} />
              <Route path="/stock-general" element={<StockGeneralPage />} />
              <Route path="/outils/mohamed" element={<OutilsMohamedPage />} />
              <Route path="/outils/ahmed" element={<OutilsAhmedPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
              </FacturationProvider>
              </CaisseProvider>
              </MoneyProvider>
              </CalendarProvider>
              </HuileProvider>
              </ReclamationsProvider>
              </DemandesDevisProvider>
              </ContactsImportantsProvider>
              </ClientsDettesProvider>
              </ClientsProvider>
              </OutilsProvider>
              </StockGeneralProvider>
              </TransactionsFournisseursProvider>
            </FournisseursProvider>
          </TeamMembersProvider>
        </VehiculesProvider>
      </NotificationsProvider>
      </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { UsersProvider } from '@/contexts/UsersContext'
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
import { CalendarProvider } from '@/contexts/CalendarContext'
import { MoneyProvider } from '@/contexts/MoneyContext'
import { CaisseProvider } from '@/contexts/CaisseContext'
import { ChargesProvider } from '@/contexts/ChargesContext'
import { FacturationProvider } from '@/contexts/FacturationContext'
import { AchatsProvider } from '@/contexts/AchatsContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { NotificationsProvider } from '@/contexts/NotificationsContext'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import VehiculesPage from '@/pages/VehiculesPage'
import VehiculesArchivesPage from '@/pages/VehiculesArchivesPage'
import VehiculeDetailPage from '@/pages/VehiculeDetailPage'
import UtilisateursPage from '@/pages/UtilisateursPage'
import CaissePage from '@/pages/CaissePage'
import EquipeMembresPage from '@/pages/EquipeMembresPage'
import MoneyPage from '@/pages/MoneyPage'
import CalendarPage from '@/pages/CalendarPage'
import ReclamationPage from '@/pages/ReclamationPage'
import ProduitsPage from '@/pages/ProduitsPage'
import ClientsPage from '@/pages/ClientsPage'
import ClientsDettesPage from '@/pages/ClientsDettesPage'
import ContactsImportantsPage from '@/pages/ContactsImportantsPage'
import DemandeDevisPage from '@/pages/DemandeDevisPage'
import FournisseursPage from '@/pages/FournisseursPage'
import TransactionsFournisseursPage from '@/pages/TransactionsFournisseursPage'
import StockGeneralPage from '@/pages/StockGeneralPage'
import OutilsAhmedPage from '@/pages/OutilsAhmedPage'
import AdminEspacePage from '@/pages/AdminEspacePage'
import FacturationPage from '@/pages/FacturationPage'
import FacturationPaiementsPartielsPage from '@/pages/FacturationPaiementsPartielsPage'
import AchatsPage from '@/pages/AchatsPage'
import PaiementPartielAchatPage from '@/pages/PaiementPartielAchatPage'
import ChecklistsPage from '@/pages/ChecklistsPage'
import ChecklistsHistoryPage from '@/pages/ChecklistsHistoryPage'
import ChecklistTemplatesPage from '@/pages/ChecklistTemplatesPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <AuthProvider>
      <UsersProvider>
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
              <CalendarProvider>
              <MoneyProvider>
              <ChargesProvider>
              <CaisseProvider>
              <FacturationProvider>
              <AchatsProvider>
            <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/admin" element={<AdminEspacePage />} />
              <Route path="/facturation-vente" element={<FacturationPage />} />
              <Route path="/facturation-vente/paiements-partiels" element={<FacturationPaiementsPartielsPage />} />
              <Route path="/facturation" element={<Navigate to="/facturation-vente" replace />} />
              <Route path="/facturation-achat" element={<AchatsPage />} />
              <Route path="/facturation-achat/paiements-partiels" element={<PaiementPartielAchatPage />} />
              <Route path="/achats" element={<Navigate to="/facturation-achat" replace />} />
              <Route path="/vehicules" element={<VehiculesPage />} />
              <Route path="/vehicules/marque/:brand" element={<VehiculesPage />} />
              <Route path="/vehicules/archives" element={<VehiculesArchivesPage />} />
              <Route path="/vehicules/:id" element={<VehiculeDetailPage />} />
              <Route path="/utilisateurs" element={<UtilisateursPage />} />
              <Route path="/caisse" element={<CaissePage />} />
              <Route path="/equipe/membres" element={<EquipeMembresPage />} />
              <Route path="/money" element={<MoneyPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/reclamation" element={<ReclamationPage />} />
              <Route path="/produits" element={<ProduitsPage />} />
              <Route path="/huile" element={<Navigate to="/produits" replace />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/dettes" element={<ClientsDettesPage />} />
              <Route path="/contacts-importants" element={<ContactsImportantsPage />} />
              <Route path="/devis" element={<DemandeDevisPage />} />
              <Route path="/fournisseurs" element={<FournisseursPage />} />
              <Route path="/fournisseurs/transactions" element={<TransactionsFournisseursPage />} />
              <Route path="/stock-general" element={<StockGeneralPage />} />
              <Route path="/outils/mohamed" element={<Navigate to="/outils/ahmed" replace />} />
              <Route path="/outils/ahmed" element={<OutilsAhmedPage />} />
              <Route path="/checklists" element={<ChecklistsPage />} />
              <Route path="/checklists/history" element={<ChecklistsHistoryPage />} />
              <Route path="/checklists/modeles" element={<ChecklistTemplatesPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
              </AchatsProvider>
              </FacturationProvider>
              </CaisseProvider>
              </ChargesProvider>
              </MoneyProvider>
              </CalendarProvider>
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
      </UsersProvider>
      </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

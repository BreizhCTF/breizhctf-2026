import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser, isAuthenticated } from './lib/auth';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import InmateLayout from './components/Layout/InmateLayout';
import GuardLayout from './components/Layout/GuardLayout';
import Dashboard from './pages/inmate/Dashboard';
import Yard from './pages/inmate/Yard';
import Work from './pages/inmate/Work';
import Store from './pages/inmate/Store';
import Inventory from './pages/inmate/Inventory';
import Cell from './pages/inmate/Cell';
import Visits from './pages/inmate/Visits';
import Parloir from './pages/inmate/Parloir';
import Phone from './pages/inmate/Phone';
import Library from './pages/inmate/Library';
import Incidents from './pages/inmate/Incidents';
import Medical from './pages/inmate/Medical';
import Leave from './pages/inmate/Leave';
import Solitary from './pages/inmate/Solitary';
import Profile from './pages/inmate/Profile';
import Gang from './pages/inmate/Gang';
import BlackMarket from './pages/inmate/BlackMarket';
import Programs from './pages/inmate/Programs';
import InmateTransfers from './pages/inmate/Transfers';
import InmateMail from './pages/inmate/Mail';
import InmateSchedule from './pages/inmate/Schedule';
import GuardDashboard from './pages/guard/Dashboard';
import InmateList from './pages/guard/InmateList';
import GuardVisits from './pages/guard/Visits';
import GuardIncidents from './pages/guard/Incidents';
import GuardMedical from './pages/guard/Medical';
import GuardSolitary from './pages/guard/Solitary';
import GuardPermissions from './pages/guard/Permissions';
import GuardContacts from './pages/guard/Contacts';
import GuardAnnouncements from './pages/guard/Announcements';
import ExternalFeeds from './pages/guard/ExternalFeeds';
import ActiveParloirs from './pages/guard/ActiveParloirs';
import CellSearch from './pages/guard/CellSearch';
import MailInspection from './pages/guard/MailInspection';
import GuardTransfersPage from './pages/guard/Transfers';
import GuardSchedulePage from './pages/guard/Schedule';

function RequireAuth({ children, role }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  const user = getUser();
  if (role === 'guard' && user?.role === 'inmate') return <Navigate to="/" replace />;
  if (role === 'inmate' && user?.role !== 'inmate') return <Navigate to="/administration" replace />;
  return children;
}

export default function App() {
  const user = getUser();
  const isGuard = user?.role === 'guard' || user?.role === 'director';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/"
          element={
            <RequireAuth role="inmate">
              <InmateLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="cour" element={<Yard />} />
          <Route path="travail" element={<Work />} />
          <Route path="boutique" element={<Store />} />
          <Route path="inventaire" element={<Inventory />} />
          <Route path="cellule" element={<Cell />} />
          <Route path="visites" element={<Visits />} />
          <Route path="parloir/:id" element={<Parloir />} />
          <Route path="telephone" element={<Phone />} />
          <Route path="bibliotheque" element={<Library />} />
          <Route path="signalements" element={<Incidents />} />
          <Route path="medical" element={<Medical />} />
          <Route path="permissions" element={<Leave />} />
          <Route path="isolement" element={<Solitary />} />
          <Route path="profil" element={<Profile />} />
          <Route path="gang" element={<Gang />} />
          <Route path="marche-noir" element={<BlackMarket />} />
          <Route path="programmes" element={<Programs />} />
          <Route path="transferts" element={<InmateTransfers />} />
          <Route path="courrier" element={<InmateMail />} />
          <Route path="emploi-du-temps" element={<InmateSchedule />} />
        </Route>

        <Route
          path="/administration"
          element={
            <RequireAuth role="guard">
              <GuardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<GuardDashboard />} />
          <Route path="detenus" element={<InmateList />} />
          <Route path="visites" element={<GuardVisits />} />
          <Route path="parloirs" element={<ActiveParloirs />} />
          <Route path="incidents" element={<GuardIncidents />} />
          <Route path="medical" element={<GuardMedical />} />
          <Route path="isolement" element={<GuardSolitary />} />
          <Route path="permissions" element={<GuardPermissions />} />
          <Route path="contacts" element={<GuardContacts />} />
          <Route path="annonces" element={<GuardAnnouncements />} />
          <Route path="flux" element={<ExternalFeeds />} />
          <Route path="fouilles" element={<CellSearch />} />
          <Route path="courrier" element={<MailInspection />} />
          <Route path="transferts" element={<GuardTransfersPage />} />
          <Route path="emploi-du-temps" element={<GuardSchedulePage />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to={isGuard ? '/administration' : '/'} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

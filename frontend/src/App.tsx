import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ROLE_HOME } from './types';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import RestaurantsPage from './pages/admin/RestaurantsPage';
import CouriersPage from './pages/admin/CouriersPage';
import ShiftsPage from './pages/admin/ShiftsPage';
import AdvancesPage from './pages/admin/AdvancesPage';
import FinanceTransactionsPage from './pages/admin/FinanceTransactionsPage';
import RestaurantAccountsPage from './pages/admin/RestaurantAccountsPage';
import CourierAccountAdminPage from './pages/admin/CourierAccountPage';
import RestaurantPage from './pages/RestaurantPage';
import RestaurantShiftsPage from './pages/restaurant/RestaurantShiftsPage';
import RestaurantAccountPage from './pages/restaurant/RestaurantAccountPage';
import CourierPage from './pages/CourierPage';
import CourierShiftsPage from './pages/courier/CourierShiftsPage';
import CourierAccountPage from './pages/courier/CourierAccountPage';
import DailyReportPage from './pages/admin/DailyReportPage';
import RangeReportPage from './pages/admin/RangeReportPage';
import RestaurantReportPage from './pages/admin/RestaurantReportPage';
import CourierReportPage from './pages/admin/CourierReportPage';
import CourierPaymentsPage from './pages/admin/CourierPaymentsPage';
import SystemGuidePage from './pages/admin/SystemGuidePage';
import ApprovalsPage from './pages/admin/ApprovalsPage';
import LiveMapPage from './pages/admin/LiveMapPage';
import SettingsPage from './pages/admin/SettingsPage';
import UsersPage from './pages/admin/UsersPage';
import MotorcyclesPage from './pages/admin/MotorcyclesPage';
import AccessoriesPage from './pages/admin/AccessoriesPage';
import MarketingVisitsPage from './pages/admin/MarketingVisitsPage';
import PazarlamaPage from './pages/pazarlama/PazarlamaPage';

/** Sends the visitor to their role home, or to /login if signed out. */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted">
        Yükleniyor...
      </div>
    );
  }
  return <Navigate to={user ? ROLE_HOME[user.role] : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'GOZLEMCI']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports/daily"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}><DailyReportPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/reports/range"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}><RangeReportPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/reports/restaurants"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}><RestaurantReportPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/reports/couriers"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}><CourierReportPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/restaurants"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'KURYE_SEFI', 'GOZLEMCI']}>
            <RestaurantsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/couriers"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'KURYE_SEFI', 'GOZLEMCI']}>
            <CouriersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/shifts"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'KURYE_SEFI', 'GOZLEMCI']}>
            <ShiftsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/approvals"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'GOZLEMCI']}>
            <ApprovalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/courier-payments"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}><CourierPaymentsPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/advances"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}>
            <AdvancesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/restaurant-accounts"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'MUHASEBE', 'GOZLEMCI']}>
            <RestaurantAccountsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/finance-transactions"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}>
            <FinanceTransactionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/stock/motorcycles"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}>
            <MotorcyclesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/stock/accessories"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}>
            <AccessoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/marketing"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'GOZLEMCI']}>
            <MarketingVisitsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/couriers/:id/account"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'PARTNER', 'GOZLEMCI']}>
            <CourierAccountAdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/live-map"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'KURYE_SEFI', 'GOZLEMCI']}>
            <LiveMapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'GOZLEMCI']}><UsersPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/settings"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'GOZLEMCI']}><SettingsPage /></ProtectedRoute>}
      />
      <Route
        path="/admin/guide"
        element={<ProtectedRoute allowedRoles={['ADMIN', 'GOZLEMCI']}><SystemGuidePage /></ProtectedRoute>}
      />
      <Route
        path="/pazarlama"
        element={
          <ProtectedRoute allowedRoles={['PAZARLAMACI']}>
            <PazarlamaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/restaurant"
        element={
          <ProtectedRoute allowedRoles={['RESTAURANT']}>
            <RestaurantPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/restaurant/shifts"
        element={
          <ProtectedRoute allowedRoles={['RESTAURANT']}>
            <RestaurantShiftsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/restaurant/account"
        element={
          <ProtectedRoute allowedRoles={['RESTAURANT']}>
            <RestaurantAccountPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courier"
        element={
          <ProtectedRoute allowedRoles={['COURIER']}>
            <CourierPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courier/shifts"
        element={
          <ProtectedRoute allowedRoles={['COURIER']}>
            <CourierShiftsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courier/account"
        element={
          <ProtectedRoute allowedRoles={['COURIER']}>
            <CourierAccountPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

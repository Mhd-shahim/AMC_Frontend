import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import SitesPage from './pages/SitesPage'
import SiteDetailsPage from './pages/SiteDetailsPage'
import MapPage from './pages/MapPage'
import ContractorsPage from './pages/ContractorsPage'
import UsersPage from './pages/UsersPage'
import { isAuthenticated } from './utils/auth'

const RequireAuth = ({ children }) => (
  isAuthenticated() ? children : <Navigate to="/login" replace />
)

const GuestRoute = ({ children }) => (
  isAuthenticated() ? <Navigate to="/dashboard" replace /> : children
)

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="light" />
      <Routes>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="sites/:siteId" element={<SiteDetailsPage />} />
          <Route path="contractors" element={<ContractorsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="map" element={<MapPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App

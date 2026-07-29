import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  const toggleSidebar = () => setSidebarOpen(prev => !prev)

  const hideNavbar = location.pathname === '/map'

  return (
    <div className="dashboard-layout">
      <div
        className={`sidebar-overlay ${!sidebarOpen ? '' : 'show d-lg-none'}`}
        onClick={toggleSidebar}
      ></div>

      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />

      {!hideNavbar && (
        <Navbar sidebarOpen={sidebarOpen} onToggle={toggleSidebar} />
      )}

      <main className={`main-content ${!sidebarOpen ? 'expanded' : ''} ${hideNavbar ? 'no-navbar' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}
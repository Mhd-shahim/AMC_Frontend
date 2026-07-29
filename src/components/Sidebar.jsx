import { NavLink } from 'react-router-dom'
import {
  getStoredUser,
  getUserDisplayName,
  getUserEmail,
  getUserInitials,
} from '../utils/auth'

export default function Sidebar({ isOpen, onClose }) {
  const user = getStoredUser()
  const menuItems = [
    { path: '/dashboard', icon: 'fa-solid fa-home', label: 'Dashboard' },
    { path: '/sites', icon: 'fa-solid fa-folder-open', label: 'Sites' },
    { path: '/contractors', icon: 'fa-solid fa-users-gear', label: 'Contractors' },
    { path: '/map', icon: 'fa-solid fa-map-marked-alt', label: 'Map' },
  ]

  return (
    <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-brand">
        <div className="brand-icon">
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <div>
          <h5>AMC Pro</h5>
          <small>Project Management</small>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-label">Main Menu</div>
        {menuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => window.innerWidth < 992 && onClose()}
          >
            <i className={item.icon}></i>
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="nav-label">Management</div>
        <NavLink
          to="/users"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => window.innerWidth < 992 && onClose()}
        >
          <i className="fa-solid fa-users"></i>
          <span>Team</span>
        </NavLink>
        <div className="nav-item" style={{ opacity: 0.5 }}>
          <i className="fa-solid fa-chart-bar"></i>
          <span>Reports</span>
        </div>
        <div className="nav-item" style={{ opacity: 0.5 }}>
          <i className="fa-solid fa-gear"></i>
          <span>Settings</span>
        </div>
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{getUserInitials(user)}</div>
          <div className="user-info">
            <h6>{getUserDisplayName(user)}</h6>
            <span>{getUserEmail(user)}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

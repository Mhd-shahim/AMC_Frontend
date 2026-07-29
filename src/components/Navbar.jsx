import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  clearAuthSession,
  getStoredUser,
  getUserDisplayName,
  getUserInitials,
  getUserRoleLabel,
} from '../utils/auth'

export default function Navbar({ sidebarOpen, onToggle }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()
  const user = getStoredUser()

  const handleLogout = (e) => {
    e.preventDefault()
    clearAuthSession()
    setShowDropdown(false)
    navigate('/login', { replace: true })
  }

  return (
    <header className={`top-navbar ${!sidebarOpen ? 'expanded' : ''}`}>
      <button className="navbar-toggle" onClick={onToggle}>
        <i className={`fa-solid ${sidebarOpen ? 'fa-bars-staggered' : 'fa-bars'}`}></i>
      </button>

      {/* <div className="navbar-search">
        <i className="fa-solid fa-magnifying-glass"></i>
        <input type="text" placeholder="Search projects, sites, equipment..." />
      </div> */}

      <div className="navbar-actions">
        {/* <button className="navbar-btn">
          <i className="fa-regular fa-bell"></i>
          <span className="badge-dot"></span>
        </button>
        <button className="navbar-btn d-none d-sm-flex">
          <i className="fa-regular fa-envelope"></i>
        </button>
        <button className="navbar-btn d-none d-sm-flex">
          <i className="fa-solid fa-expand"></i>
        </button> */}

        <div className="position-relative">
          <button className="navbar-profile" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="profile-avatar">{getUserInitials(user)}</div>
            <div className="profile-info d-none d-md-block">
              <h6>{getUserDisplayName(user)}</h6>
              <span>{getUserRoleLabel(user)}</span>
            </div>
            <i className="fa-solid fa-chevron-down ms-1 d-none d-md-block" style={{ fontSize: 10, color: '#94a3b8' }}></i>
          </button>

          {showDropdown && (
            <div className="position-absolute end-0 mt-2 bg-white rounded-3 shadow-lg border py-2" style={{ width: 200, zIndex: 9999 }}>
              <a className="d-flex align-items-center gap-2 px-3 py-2 text-decoration-none text-dark" href="#" style={{ fontSize: 13 }}>
                <i className="fa-regular fa-user" style={{ width: 16 }}></i> Profile
              </a>
              <a className="d-flex align-items-center gap-2 px-3 py-2 text-decoration-none text-dark" href="#" style={{ fontSize: 13 }}>
                <i className="fa-solid fa-gear" style={{ width: 16 }}></i> Settings
              </a>
              <hr className="my-1" />
              <a className="d-flex align-items-center gap-2 px-3 py-2 text-decoration-none text-danger" href="#"
                onClick={handleLogout} style={{ fontSize: 13 }}>
                <i className="fa-solid fa-right-from-bracket" style={{ width: 16 }}></i> Logout
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import AuthModal from './AuthModal'

type Props = {
  token: string | null;
  username: string | null;
  isAdmin: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<string>;
  onLogout: () => void;
}

const LoginButton: React.FC<Props> = ({ token, username, isAdmin, onLogin, onRegister, onLogout }) => {
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  return (
    <div className="login-button-container">
      {!token ? (
        <>
          <button className="btn-outline" onClick={() => setOpen(true)}>Sign in</button>
          <AuthModal open={open} onClose={() => setOpen(false)} onLogin={onLogin} onRegister={onRegister} />
        </>
      ) : (
        <div className="user-dropdown" ref={dropdownRef}>
          <button
            className="user-menu-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="User menu"
            aria-expanded={dropdownOpen}
          >
            <div className="user-avatar">{username ? username.slice(0, 2).toUpperCase() : '?'}</div>
            <span className="user-name">{username ?? 'Account'}</span>
            <span className="user-caret">▾</span>
          </button>
          {dropdownOpen && (
            <div className="user-dropdown-menu">
              {isAdmin && (
                <>
                  <NavLink to="/admin/events" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Admin: Events
                  </NavLink>
                  <NavLink to="/admin/orders" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Admin: Orders
                  </NavLink>
                  <NavLink to="/admin/users" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Admin: Users
                  </NavLink>
                  <NavLink to="/admin/coupons" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Admin: Coupons
                  </NavLink>
                  <NavLink to="/admin/support-reports" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Admin: Support Reports
                  </NavLink>
                  <NavLink to="/admin/seat-maps" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Admin: Seat Maps
                  </NavLink>
                  <NavLink to="/admin/batch-upload" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Admin: Batch Upload
                  </NavLink>
                </>
              )}
              <button className="dropdown-item dropdown-logout" onClick={() => { onLogout(); setDropdownOpen(false); }}>
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LoginButton

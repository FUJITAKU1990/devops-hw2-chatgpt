import React from 'react'
import { NavLink } from 'react-router-dom'
import LoginButton from './LoginButton'

 type Props = {
  token: string | null;
  username: string | null;
  isAdmin: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<string>;
  onLogout: () => void;
 }

 const Header: React.FC<Props> = ({ token, username, isAdmin, onLogin, onRegister, onLogout }) => {
  return (
    <header className="site-header">
      <div className="site-branding">
        <a href="/" className="branding-link" aria-label="Tartan Tickets home">
          <div className="branding-icon-wrapper">
            <svg className="branding-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 10.5C21 11.3284 21.6716 12 22.5 12C21.6716 12 21 12.6716 21 13.5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13.5C3 12.6716 2.32843 12 1.5 12C2.32843 12 3 11.3284 3 10.5V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="14.5" y1="3" x2="14.5" y2="21" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2"/>
            </svg>
          </div>
          <div className="branding-text">
            <h1 className="branding-title">Tartan Tickets</h1>
            <div className="branding-subtitle">Carnegie Mellon University</div>
          </div>
        </a>
      </div>

      <nav className="site-nav">
        <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Events</NavLink>
        <NavLink to="/orders" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>My Tickets</NavLink>
        <NavLink to="/help" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Help</NavLink>
      </nav>

      <div className="site-controls">
        <LoginButton token={token} username={username} isAdmin={isAdmin} onLogin={onLogin} onRegister={onRegister} onLogout={onLogout} />
      </div>
    </header>
  )
}

export default Header

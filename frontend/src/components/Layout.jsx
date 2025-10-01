import { Outlet, NavLink } from 'react-router-dom';
import { MessageCircle, Phone } from 'lucide-react';
import './Layout.css';

function Layout() {
  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-content">
          <div className="logo">
            <div className="logo-icon gradient-text">🏥</div>
            <h1 className="logo-text gradient-text">HealthCare AI</h1>
          </div>
          <div className="nav-links">
            <NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <MessageCircle size={20} />
              <span>Chat Assistant</span>
            </NavLink>
            <NavLink to="/voice" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Phone size={20} />
              <span>Voice Agent</span>
            </NavLink>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;

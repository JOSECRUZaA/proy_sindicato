import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CarFront, Map, CalendarCheck, Wallet, FileText, Settings, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div style={{ padding: '0 1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
        <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <CarFront size={20} />
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--secondary)', fontFamily: 'Outfit' }}>SindiAuto</div>
      </div>

      <ul style={{ listStyle: 'none', padding: '0 1rem', flex: 1, overflowY: 'auto' }}>
        <li style={{ marginBottom: '0.5rem' }}>
          <NavLink to="/dashboard" end className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
            <LayoutDashboard size={20} /> <span>Panel General</span>
          </NavLink>
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          <NavLink to="/dashboard/afiliados" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
            <Users size={20} /> <span>Afiliados</span>
          </NavLink>
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          <NavLink to="/dashboard/vehiculos" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
            <CarFront size={20} /> <span>Parque Automotor</span>
          </NavLink>
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          <NavLink to="/dashboard/rutas" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
            <Map size={20} /> <span>Rutas y Operaciones</span>
          </NavLink>
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          <NavLink to="/dashboard/asambleas" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
            <CalendarCheck size={20} /> <span>Asambleas</span>
          </NavLink>
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          <NavLink to="/dashboard/hacienda" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
            <Wallet size={20} /> <span>Hacienda</span>
          </NavLink>
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          <NavLink to="/dashboard/reportes" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
            <FileText size={20} /> <span>Reportes</span>
          </NavLink>
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          <NavLink to="/dashboard/usuarios" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
            <Settings size={20} /> <span>Gestión de Usuarios</span>
          </NavLink>
        </li>
      </ul>

      <ul style={{ listStyle: 'none', padding: '0 1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
        <li style={{ marginBottom: '0.5rem' }}>
          <a href="#" style={navLinkStyle}>
            <Settings size={20} /> <span>Configuración</span>
          </a>
        </li>
        <li style={{ marginBottom: '0.5rem' }}>
          <button onClick={handleLogout} style={{ ...navLinkStyle, background: 'none', border: 'none', width: '100%', cursor: 'pointer', color: '#ef4444' }}>
            <LogOut size={20} /> <span>Cerrar Sesión</span>
          </button>
        </li>
      </ul>
    </aside>
  );
};

// Quick inline style for sidebar links to avoid editing index.css again
const navLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.875rem 1rem',
  color: 'var(--text-muted)',
  textDecoration: 'none',
  borderRadius: '0.5rem',
  transition: 'all 0.2s',
  fontWeight: '500',
  fontSize: '0.95rem'
};

export default Sidebar;

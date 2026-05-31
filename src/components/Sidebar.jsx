import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, CarFront, Map, CalendarCheck, Wallet, FileText, Settings, LogOut, Receipt, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error durante signOut:", err);
    }
    localStorage.clear(); // Limpiar tokens residuales de Supabase
    sessionStorage.clear(); // Limpiar sesión actual
    window.location.href = '/login'; // Redirección dura para reiniciar todo el estado de React en memoria
  };

  const userRol = profile?.rol || '';
  const isAdministrador = userRol.includes('Administrador');
  const isSecretario = userRol === 'Secretario';
  const isTesorero = userRol === 'Tesorero';
  const isControlador = userRol === 'Controlador';
  const isAfiliado = userRol === 'Afiliado' || userRol === 'Consulta';

  return (
    <aside className="sidebar">
      <div style={{ padding: '0 1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
        <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <CarFront size={20} />
        </div>
        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--secondary)', fontFamily: 'Outfit' }}>SindiAuto</div>
      </div>

      <ul style={{ listStyle: 'none', padding: '0 1rem', flex: 1, overflowY: 'auto' }}>
        
        {/* PANEL GENERAL - Solo Administrador */}
        {isAdministrador && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard" end className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <LayoutDashboard size={20} /> <span>Panel General</span>
            </NavLink>
          </li>
        )}

        {/* AFILIADOS - Administrador y Secretario */}
        {(isAdministrador || isSecretario) && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard/afiliados" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <Users size={20} /> <span>Afiliados</span>
            </NavLink>
          </li>
        )}

        {/* PARQUE AUTOMOTOR - Solo Administrador */}
        {isAdministrador && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard/vehiculos" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <CarFront size={20} /> <span>Parque Automotor</span>
            </NavLink>
          </li>
        )}

        {/* RUTAS Y OPERACIONES - Solo Administrador */}
        {isAdministrador && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard/rutas" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <Map size={20} /> <span>Rutas y Operaciones</span>
            </NavLink>
          </li>
        )}

        {/* ASAMBLEAS - Administrador y Secretario */}
        {(isAdministrador || isSecretario) && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard/asambleas" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <CalendarCheck size={20} /> <span>Asambleas</span>
            </NavLink>
          </li>
        )}

        {/* HACIENDA (Cobro de cuotas y multas) - Administrador y Tesorero */}
        {(isAdministrador || isTesorero) && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard/hacienda" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <Wallet size={20} /> <span>Hacienda</span>
            </NavLink>
          </li>
        )}

        {/* REPORTES - Administrador, Secretario y Tesorero */}
        {(isAdministrador || isSecretario || isTesorero) && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard/reportes" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <FileText size={20} /> <span>Reportes</span>
            </NavLink>
          </li>
        )}

        {/* CONTROL DE MULTAS - Administrador, Secretario y Controlador */}
        {(isAdministrador || isSecretario || isControlador) && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard/controlador" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <Receipt size={20} /> <span>Control de Multas</span>
            </NavLink>
          </li>
        )}

        {/* PORTAL AFILIADO - Solo Afiliado */}
        {isAfiliado && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard/mi-panel" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <User size={20} /> <span>Mi Panel Personal</span>
            </NavLink>
          </li>
        )}

        {/* GESTIÓN DE USUARIOS - Solo Administrador */}
        {isAdministrador && (
          <li style={{ marginBottom: '0.5rem' }}>
            <NavLink to="/dashboard/usuarios" className={({ isActive }) => `nav-link-sidebar ${isActive ? 'active' : ''}`} style={navLinkStyle}>
              <Settings size={20} /> <span>Gestión de Usuarios</span>
            </NavLink>
          </li>
        )}
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

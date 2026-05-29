import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const DashboardView = () => {
  const { profile } = useAuth();

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Global Header para todas las páginas del Dashboard */}
        <header className="header animate-fade" style={{ marginBottom: '2rem' }}>
          <div>
            {/* El título principal se maneja en cada página, aquí podemos poner algo sutil */}
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>
              Sindicato de Minibuses - Sistema Web Integrado
            </div>
          </div>
          <div className="user-profile">
            <div className="avatar">
              {profile?.nombreCompleto ? profile.nombreCompleto.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--secondary)' }}>
                {profile?.nombreCompleto || 'Cargando...'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
                {profile?.rol || 'Rol no asignado'}
              </div>
            </div>
          </div>
        </header>

        {/* El contenido de la ruta específica (Afiliados, Dashboard, etc.) se renderiza aquí */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardView;

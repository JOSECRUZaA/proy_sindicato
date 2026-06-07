import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const DashboardView = () => {
  const { user, profile, loading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
      return;
    }
    if (profile && (location.pathname === '/dashboard' || location.pathname === '/dashboard/')) {
      const rol = profile.rol || '';
      if (rol === 'Controlador') {
        navigate('/dashboard/controlador', { replace: true });
      } else if (rol === 'Afiliado' || rol === 'Consulta') {
        navigate('/dashboard/mi-panel', { replace: true });
      }
    }
  }, [user, profile, loading, location.pathname, navigate]);

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Header global */}
        <header className="header animate-fade" style={{ marginBottom: '2rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>
              Sindicato de Minibuses - Sistema Web Integrado
            </div>
          </div>
          <div className="user-profile">
            <div className="avatar">
              {profile?.nombreCompleto
                ? profile.nombreCompleto.substring(0, 2).toUpperCase()
                : 'US'}
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--secondary)' }}>
                {profile?.nombreCompleto || '—'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>
                {profile?.rol || 'Cargando...'}
              </div>
            </div>
          </div>
        </header>

        {/* Contenido de la ruta activa */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Outlet />
        </div>

      </main>
    </div>
  );
};

export default DashboardView;

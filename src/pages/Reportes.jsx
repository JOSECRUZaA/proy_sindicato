import React from 'react';
import { BarChart3, Users, Car, TrendingUp } from 'lucide-react';

const Reportes = () => {
  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Centro de Reportes</h1>
        <p className="page-subtitle">Métricas, estadísticas y balances del sindicato.</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="feature-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: '#e0e7ff', padding: '1rem', borderRadius: '12px', color: 'var(--primary)' }}><Users size={28} /></div>
          <div><p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Afiliados Activos</p><h3 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>+150</h3></div>
        </div>
        <div className="feature-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '12px', color: '#16a34a' }}><Car size={28} /></div>
          <div><p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Parque Automotor</p><h3 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>84</h3></div>
        </div>
        <div className="feature-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
          <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '12px', color: '#d97706' }}><TrendingUp size={28} /></div>
          <div><p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Recaudación Mensual</p><h3 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-main)' }}>Bs. 4.5K</h3></div>
        </div>
      </div>

      <div className="table-container" style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <BarChart3 size={64} style={{ color: 'var(--primary-light)', marginBottom: '1rem' }} />
        <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>Motor Analítico en Construcción</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '500px' }}>
          Estamos integrando el módulo de visualización de datos estadísticos. Próximamente podrás exportar PDF y Excel de balances financieros, historial de rutas y control de asistencias a asambleas.
        </p>
      </div>
    </div>
  );
};

export default Reportes;

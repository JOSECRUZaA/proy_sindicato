import React, { useState, useEffect } from 'react';
import { Users, CarFront, AlertCircle, TrendingUp, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAfiliados: 0,
    vehiculosActivos: 0,
    cuotasPendientes: 0,
    recaudacionMes: 0
  });
  const [recentAfiliados, setRecentAfiliados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const date = new Date();
      const currentMonth = date.getMonth() + 1;
      const currentYear = date.getFullYear();

      const [
        resAfiliados,
        resVehiculos,
        resCuotas,
        resPagos,
        resRecientes
      ] = await Promise.all([
        supabase.from('perfiles').select('*', { count: 'exact', head: true }).not('numero_afiliado', 'is', null),
        supabase.from('vehiculos').select('*', { count: 'exact', head: true }).eq('estado', 'Operativo'),
        supabase.from('obligaciones_financieras').select('*', { count: 'exact', head: true }).eq('estado', 'Pendiente').eq('tipo_obligacion', 'Cuota'),
        supabase.from('obligaciones_financieras').select('monto_pagado').eq('estado', 'Pagado').eq('mes', currentMonth).eq('gestion', currentYear),
        supabase.from('perfiles').select(`
          id_perfil, numero_afiliado, tipo_afiliado, estado_organico,
          nombres, paterno, ci
        `).not('numero_afiliado', 'is', null).order('id_perfil', { ascending: false }).limit(5)
      ]);

      if (resAfiliados.error) throw resAfiliados.error;
      if (resVehiculos.error) throw resVehiculos.error;
      if (resCuotas.error) throw resCuotas.error;
      if (resPagos.error) throw resPagos.error;
      if (resRecientes.error) throw resRecientes.error;

      const countAfiliados = resAfiliados.count || 0;
      const countVehiculos = resVehiculos.count || 0;
      const countCuotas = resCuotas.count || 0;
      const pagos = resPagos.data || [];
      const recientes = resRecientes.data || [];

      const recaudacion = pagos.reduce((sum, pago) => sum + parseFloat(pago.monto_pagado), 0);
      
      setStats({
        totalAfiliados: countAfiliados,
        vehiculosActivos: countVehiculos,
        cuotasPendientes: countCuotas,
        recaudacionMes: recaudacion
      });

      setRecentAfiliados(recientes);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade">
      <h1 className="page-title">Panel General</h1>
      <p className="page-subtitle" style={{ marginBottom: '2rem' }}>Resumen estadístico del sindicato</p>

      <div className="dashboard-grid">
        <div className="stat-card animate-fade-in delay-1">
          <div className="stat-icon">
            <Users size={28} />
          </div>
          <div className="stat-info">
            <h3>Total Afiliados</h3>
            <div className="value">{loading ? '...' : stats.totalAfiliados}</div>
          </div>
        </div>

        <div className="stat-card animate-fade-in delay-2">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CarFront size={28} />
          </div>
          <div className="stat-info">
            <h3>Vehículos Activos</h3>
            <div className="value">{loading ? '...' : stats.vehiculosActivos}</div>
          </div>
        </div>

        <div className="stat-card animate-fade-in delay-3">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <AlertCircle size={28} />
          </div>
          <div className="stat-info">
            <h3>Cuotas Pendientes</h3>
            <div className="value">{loading ? '...' : stats.cuotasPendientes}</div>
          </div>
        </div>

        <div className="stat-card animate-fade-in delay-3">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <TrendingUp size={28} />
          </div>
          <div className="stat-info">
            <h3>Recaudación Mensual</h3>
            <div className="value">{loading ? '...' : `Bs. ${stats.recaudacionMes.toLocaleString()}`}</div>
          </div>
        </div>
      </div>

      <div className="table-container animate-fade-in delay-3">
        <div className="table-header">
          <h2 className="table-title">Últimos Afiliados Registrados</h2>
          <Link to="/dashboard/afiliados" className="btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            <span>Ir a Módulo de Afiliados</span>
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID / Padrón</th>
              <th>Nombre Completo</th>
              <th>C.I.</th>
              <th>Tipo de Socio</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos recientes...</td></tr>
            ) : recentAfiliados.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay afiliados registrados en el sistema.</td></tr>
            ) : (
              recentAfiliados.map(af => (
                <tr key={af.id_perfil}>
                  <td style={{ fontWeight: '500' }}>{af.numero_afiliado || `AF-${af.id_perfil.toString().padStart(4, '0')}`}</td>
                  <td>{af.nombres} {af.paterno}</td>
                  <td>{af.ci}</td>
                  <td>{af.tipo_afiliado}</td>
                  <td>
                    <span className={`badge ${af.estado_organico === 'Activo' ? 'badge-success' : af.estado_organico === 'Suspendido' ? 'badge-warning' : 'badge-danger'}`}>
                      {af.estado_organico || 'Activo'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;

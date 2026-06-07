import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, DollarSign, Edit, Trash2, X, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CONCEPTOS_PREDEFINIDOS = [
  { nombre: 'Aporte Sindical Mensual', monto_default: 30, tipo: 'Cuota' },
  { nombre: 'Fondo Mortuorio Mensual', monto_default: 20, tipo: 'Cuota' },
  { nombre: 'Cuota de Ingreso', monto_default: 500, tipo: 'Cuota' },
  { nombre: 'Pro-Deporte Anual', monto_default: 50, tipo: 'Cuota' },
  { nombre: 'Multa Inasistencia Asamblea Ordinaria', monto_default: 100, tipo: 'Multa' },
  { nombre: 'Multa Inasistencia Asamblea Extraordinaria', monto_default: 150, tipo: 'Multa' },
  { nombre: 'Multa Retraso a Reunión', monto_default: 50, tipo: 'Multa' }
];

const Hacienda = () => {
  const { profile } = useAuth();
  const [obligaciones, setObligaciones] = useState([]);
  const [afiliados, setAfiliados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formPago, setFormPago] = useState({
    id_afiliado: '', 
    tipo_obligacion: 'Cuota',
    concepto: '', 
    concepto_custom: '',
    gestion: new Date().getFullYear(), 
    mes: new Date().getMonth() + 1, 
    monto_total: '', 
    estado: 'Pendiente'
  });

  useEffect(() => {
    fetchObligaciones();
    fetchAfiliadosSelect();
  }, []);

  const fetchObligaciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('obligaciones_financieras')
        .select(`
          id_obligacion, tipo_obligacion, concepto, gestion, mes, monto_total, monto_pagado, estado, fecha_registro,
          perfiles!obligaciones_financieras_id_afiliado_fkey ( numero_afiliado, nombres, paterno )
        `)
        .order('fecha_registro', { ascending: false });
      if (error) throw error;
      setObligaciones(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAfiliadosSelect = async () => {
    const { data } = await supabase
      .from('perfiles')
      .select('id_perfil, numero_afiliado, nombres, paterno')
      .not('numero_afiliado', 'is', null)
      .order('numero_afiliado', { ascending: true });
    if (data) setAfiliados(data);
  };

  const handlePagoSubmit = async (e) => {
    e.preventDefault();
    try {
      const conceptoFinal = formPago.concepto === 'OTRO' ? formPago.concepto_custom : formPago.concepto;
      
      if (!conceptoFinal) throw new Error("Debe especificar un concepto válido.");

      const { error } = await supabase.from('obligaciones_financieras').insert([{
        id_afiliado: formPago.id_afiliado,
        tipo_obligacion: formPago.tipo_obligacion,
        concepto: conceptoFinal,
        gestion: formPago.gestion,
        mes: formPago.mes,
        monto_total: parseFloat(formPago.monto_total),
        monto_pagado: formPago.estado === 'Pagado' ? parseFloat(formPago.monto_total) : 0,
        estado: formPago.estado,
        id_emisor: profile?.id
      }]);
      if (error) throw error;
      alert("Registro creado exitosamente");
      setShowModal(false);
      setFormPago({ id_afiliado: '', tipo_obligacion: 'Cuota', concepto: '', concepto_custom: '', gestion: new Date().getFullYear(), mes: new Date().getMonth() + 1, monto_total: '', estado: 'Pendiente' });
      fetchObligaciones();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  const handleConceptoChange = (e) => {
    const val = e.target.value;
    const predef = CONCEPTOS_PREDEFINIDOS.find(c => c.nombre === val);
    
    setFormPago(prev => ({
      ...prev,
      concepto: val,
      monto_total: predef ? predef.monto_default : prev.monto_total,
      tipo_obligacion: predef ? predef.tipo : prev.tipo_obligacion
    }));
  };

  const handleMarcarPagado = async (id, monto) => {
    if (!window.confirm("¿Confirmar que esta deuda ha sido pagada en su totalidad?")) return;
    try {
      const { error } = await supabase
        .from('obligaciones_financieras')
        .update({ 
          estado: 'Pagado', 
          monto_pagado: monto,
          fecha_pago: new Date().toISOString(),
          id_cobrador: profile?.id
        })
        .eq('id_obligacion', id);
      if (error) throw error;
      fetchObligaciones();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Está seguro de eliminar este registro financiero?")) return;
    try {
      const { error } = await supabase.from('obligaciones_financieras').delete().eq('id_obligacion', id);
      if (error) throw error;
      fetchObligaciones();
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const filteredObligaciones = obligaciones.filter(o => 
    (o.perfiles?.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (o.perfiles?.paterno?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (o.perfiles?.numero_afiliado?.includes(searchTerm) ?? false) ||
    (o.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <>
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title">Tesorería y Finanzas</h1>
            <p className="page-subtitle">Administración unificada de cuotas, multas y obligaciones financieras.</p>
          </div>
          
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Registrar Deuda / Cobro
          </button>
        </div>

        <div className="table-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="table-header">
            <div style={{ position: 'relative', width: '350px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Buscar por afiliado, concepto..." 
                style={{ paddingLeft: '2.5rem' }} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Afiliado</th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Periodo</th>
                  <th>Monto (Bs.)</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Cargando obligaciones...</td></tr>
                ) : filteredObligaciones.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay registros financieros.</td></tr>
                ) : (
                  filteredObligaciones.map(o => (
                    <tr key={o.id_obligacion}>
                      <td style={{ fontWeight: '500' }}>{o.perfiles?.numero_afiliado} - {o.perfiles?.nombres} {o.perfiles?.paterno}</td>
                      <td>
                        <span className={`badge ${o.tipo_obligacion === 'Multa' ? 'badge-danger' : 'badge-secondary'}`}>
                          {o.tipo_obligacion}
                        </span>
                      </td>
                      <td>{o.concepto}</td>
                      <td>{o.mes ? `${o.mes}/${o.gestion}` : o.gestion}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{o.monto_total}</td>
                      <td>
                        <span className={`badge ${o.estado === 'Pagado' ? 'badge-success' : 'badge-warning'}`}>
                          {o.estado}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {o.estado !== 'Pagado' && (
                          <button className="btn btn-secondary" style={{ padding: '0.4rem', marginRight: '0.5rem' }} title="Marcar como Pagado" onClick={() => handleMarcarPagado(o.id_obligacion, o.monto_total)}>
                            <CheckCircle size={16} color="#16a34a" />
                          </button>
                        )}
                        <button className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={() => handleDelete(o.id_obligacion)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="auth-card animate-fade" style={{ maxWidth: '650px', width: '90%', padding: '2rem 2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.5rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Registrar Deuda / Cobro</h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Módulo unificado de Tesorería</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handlePagoSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Socio Afiliado</label>
                  <select className="form-control" value={formPago.id_afiliado} onChange={(e) => setFormPago({...formPago, id_afiliado: e.target.value})} required>
                    <option value="">Seleccione un socio...</option>
                    {afiliados.map(af => (
                      <option key={af.id_perfil} value={af.id_perfil}>{af.numero_afiliado} - {af.nombres} {af.paterno}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Concepto a Cobrar</label>
                    <select className="form-control" value={formPago.concepto} onChange={handleConceptoChange} required>
                      <option value="">Seleccione concepto predefinido...</option>
                      {CONCEPTOS_PREDEFINIDOS.map(c => (
                        <option key={c.nombre} value={c.nombre}>{c.nombre} ({c.tipo})</option>
                      ))}
                      <option value="OTRO">-- Otro concepto (Escribir) --</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Monto (Bs.)</label>
                    <input type="number" step="0.01" className="form-control" value={formPago.monto_total} onChange={(e) => setFormPago({...formPago, monto_total: e.target.value})} required />
                  </div>
                </div>

                {formPago.concepto === 'OTRO' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">Detalle del Concepto</label>
                      <input type="text" className="form-control" value={formPago.concepto_custom} onChange={(e) => setFormPago({...formPago, concepto_custom: e.target.value})} placeholder="Ej: Aporte extraordinario techo" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <select className="form-control" value={formPago.tipo_obligacion} onChange={(e) => setFormPago({...formPago, tipo_obligacion: e.target.value})} required>
                        <option value="Cuota">Cuota</option>
                        <option value="Multa">Multa</option>
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Mes</label>
                    <input type="number" min="1" max="12" className="form-control" value={formPago.mes} onChange={(e) => setFormPago({...formPago, mes: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gestión (Año)</label>
                    <input type="number" className="form-control" value={formPago.gestion} onChange={(e) => setFormPago({...formPago, gestion: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estado de Pago</label>
                    <select className="form-control" value={formPago.estado} onChange={(e) => setFormPago({...formPago, estado: e.target.value})}>
                      <option value="Pendiente">Deuda (Pendiente)</option>
                      <option value="Pagado">Cancelado (Pagado ya)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Registrar Operación</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Hacienda;

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, DollarSign, Edit, Trash2, X, FileText, CheckCircle } from 'lucide-react';

const Hacienda = () => {
  const [activeTab, setActiveTab] = useState('pagos');
  
  const [tiposCuota, setTiposCuota] = useState([]);
  const [cuotas, setCuotas] = useState([]);
  const [afiliados, setAfiliados] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formCatalogo, setFormCatalogo] = useState({
    nombre: '', monto_default: '', periodicidad: 'Mensual'
  });

  const [formPago, setFormPago] = useState({
    id_afiliado: '', id_tipo_cuota: '', gestion: new Date().getFullYear(), mes: new Date().getMonth() + 1, monto_bs: '', estado: 'Pendiente'
  });

  useEffect(() => {
    if (activeTab === 'catalogo') {
      fetchTiposCuota();
    } else {
      fetchCuotas();
      fetchAfiliadosSelect();
      fetchTiposCuotaSelect();
    }
  }, [activeTab]);

  const fetchTiposCuota = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('tipos_cuota').select('*');
      if (error) throw error;
      setTiposCuota(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCuotas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cuotas')
        .select(`
          id_cuota, gestion, mes, monto_bs, estado, fecha_registro,
          afiliados ( numero_afiliado, personas ( nombres, paterno ) ),
          tipos_cuota ( nombre )
        `)
        .order('fecha_registro', { ascending: false });
      if (error) throw error;
      setCuotas(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAfiliadosSelect = async () => {
    const { data } = await supabase.from('afiliados').select('id_afiliado, numero_afiliado, personas(nombres, paterno)');
    if (data) setAfiliados(data);
  };
  
  const fetchTiposCuotaSelect = async () => {
    const { data } = await supabase.from('tipos_cuota').select('id_tipo_cuota, nombre, monto_default');
    if (data) setTiposCuota(data);
  };

  const handleCatalogoSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('tipos_cuota').insert([{
        nombre: formCatalogo.nombre,
        monto_default: parseFloat(formCatalogo.monto_default),
        periodicidad: formCatalogo.periodicidad
      }]);
      if (error) throw error;
      alert("Concepto registrado exitosamente");
      setShowModal(false);
      setFormCatalogo({ nombre: '', monto_default: '', periodicidad: 'Mensual' });
      fetchTiposCuota();
    } catch (error) {
      alert("Error al guardar concepto: " + error.message);
    }
  };

  const handlePagoSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('cuotas').insert([{
        id_afiliado: formPago.id_afiliado,
        id_tipo_cuota: formPago.id_tipo_cuota,
        gestion: formPago.gestion,
        mes: formPago.mes,
        monto_bs: parseFloat(formPago.monto_bs),
        estado: formPago.estado
      }]);
      if (error) throw error;
      alert("Cobro registrado exitosamente");
      setShowModal(false);
      setFormPago({ id_afiliado: '', id_tipo_cuota: '', gestion: new Date().getFullYear(), mes: new Date().getMonth() + 1, monto_bs: '', estado: 'Pendiente' });
      fetchCuotas();
    } catch (error) {
      alert("Error al guardar cobro: " + error.message);
    }
  };

  const handleTipoCuotaChange = (e) => {
    const id = e.target.value;
    const tipo = tiposCuota.find(t => t.id_tipo_cuota.toString() === id);
    setFormPago({ 
      ...formPago, 
      id_tipo_cuota: id, 
      monto_bs: tipo ? tipo.monto_default : '' 
    });
  };

  return (
    <>
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="page-title">Hacienda y Finanzas</h1>
            <p className="page-subtitle">Administración de cobros, cuotas y conceptos sindicales.</p>
          </div>
          
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> {activeTab === 'pagos' ? 'Registrar Cobro' : 'Nuevo Concepto'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <button 
            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'pagos' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'pagos' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'pagos' ? '600' : '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setActiveTab('pagos')}
          >
            <DollarSign size={18} /> Control de Pagos
          </button>
          <button 
            style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'catalogo' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'catalogo' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'catalogo' ? '600' : '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setActiveTab('catalogo')}
          >
            <FileText size={18} /> Catálogo de Conceptos
          </button>
        </div>
      
        <div className="table-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="table-header">
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input type="text" className="form-control" placeholder={activeTab === 'pagos' ? "Buscar pagos..." : "Buscar conceptos..."} style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeTab === 'pagos' ? (
              <table>
                <thead>
                  <tr>
                    <th>Socio</th>
                    <th>Concepto</th>
                    <th>Periodo</th>
                    <th>Monto (Bs.)</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando pagos...</td></tr>
                  ) : cuotas.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay cobros registrados.</td></tr>
                  ) : (
                    cuotas.map(c => (
                      <tr key={c.id_cuota}>
                        <td style={{ fontWeight: '500' }}>{c.afiliados?.numero_afiliado} - {c.afiliados?.personas?.nombres} {c.afiliados?.personas?.paterno}</td>
                        <td>{c.tipos_cuota?.nombre}</td>
                        <td>{c.mes}/{c.gestion}</td>
                        <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{c.monto_bs}</td>
                        <td>
                          <span className={`badge ${c.estado === 'Cancelado' ? 'badge-success' : 'badge-warning'}`}>
                            {c.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem', marginRight: '0.5rem' }} title="Marcar como Cancelado"><CheckCircle size={16} color="#16a34a" /></button>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ef4444' }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Concepto (Nombre)</th>
                    <th>Monto Padrón (Bs.)</th>
                    <th>Periodicidad</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Cargando conceptos...</td></tr>
                  ) : tiposCuota.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay conceptos registrados.</td></tr>
                  ) : (
                    tiposCuota.map(t => (
                      <tr key={t.id_tipo_cuota}>
                        <td style={{ fontWeight: '600' }}>{t.nombre}</td>
                        <td style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Bs. {t.monto_default}</td>
                        <td>{t.periodicidad}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem', marginRight: '0.5rem' }}><Edit size={16} /></button>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ef4444' }}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="auth-card animate-fade" style={{ maxWidth: '650px', width: '90%', padding: '2rem 2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>
                {activeTab === 'pagos' ? 'Registrar Nuevo Cobro' : 'Nuevo Concepto de Cobro'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            {activeTab === 'pagos' ? (
              <form onSubmit={handlePagoSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Socio Afiliado</label>
                    <select name="id_afiliado" className="form-control" value={formPago.id_afiliado} onChange={(e) => setFormPago({...formPago, id_afiliado: e.target.value})} required>
                      <option value="">Seleccione un socio...</option>
                      {afiliados.map(af => (
                        <option key={af.id_afiliado} value={af.id_afiliado}>{af.numero_afiliado} - {af.personas?.nombres} {af.personas?.paterno}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">Concepto a Cobrar</label>
                      <select name="id_tipo_cuota" className="form-control" value={formPago.id_tipo_cuota} onChange={handleTipoCuotaChange} required>
                        <option value="">Seleccione concepto...</option>
                        {tiposCuota.map(tc => (
                          <option key={tc.id_tipo_cuota} value={tc.id_tipo_cuota}>{tc.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Monto (Bs.)</label>
                      <input type="number" step="0.01" className="form-control" value={formPago.monto_bs} onChange={(e) => setFormPago({...formPago, monto_bs: e.target.value})} required />
                    </div>
                  </div>

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
                      <label className="form-label">Estado</label>
                      <select className="form-control" value={formPago.estado} onChange={(e) => setFormPago({...formPago, estado: e.target.value})}>
                        <option value="Pendiente">Pendiente (Deuda)</option>
                        <option value="Cancelado">Cancelado (Pagado)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Registrar Cobro</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCatalogoSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre del Concepto (Ej: Fondo Mortuorio)</label>
                    <input type="text" name="nombre" className="form-control" value={formCatalogo.nombre} onChange={(e) => setFormCatalogo({...formCatalogo, nombre: e.target.value})} required />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <div className="form-group">
                      <label className="form-label">Monto Referencial (Bs.)</label>
                      <input type="number" step="0.01" name="monto_default" className="form-control" value={formCatalogo.monto_default} onChange={(e) => setFormCatalogo({...formCatalogo, monto_default: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Periodicidad</label>
                      <select name="periodicidad" className="form-control" value={formCatalogo.periodicidad} onChange={(e) => setFormCatalogo({...formCatalogo, periodicidad: e.target.value})}>
                        <option value="Mensual">Mensual</option>
                        <option value="Anual">Anual</option>
                        <option value="Única">Única</option>
                        <option value="Extraordinaria">Extraordinaria</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Registrar Concepto</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Hacienda;

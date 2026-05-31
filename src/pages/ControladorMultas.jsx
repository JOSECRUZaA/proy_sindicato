import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Search, CarFront, User, AlertTriangle, CheckCircle2, ShieldAlert, Receipt, Bookmark, PlusCircle, Wrench, Ban, HeartHandshake, Eye } from 'lucide-react';

const ControladorMultas = () => {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicle, setVehicle] = useState(null);
  const [activeDriver, setActiveDriver] = useState(null);
  
  // Catalogo de multas predefinido
  const [tiposMultas, setTiposMultas] = useState([]);
  
  // Formulario de Registro de Multas
  const [selectedTipoMulta, setSelectedTipoMulta] = useState('');
  const [montoBs, setMontoBs] = useState('');
  const [observacion, setObservacion] = useState('');
  const [multadoA, setMultadoA] = useState('Chofer'); // 'Chofer' o 'Propietario'
  
  // Estado de carga y feedback
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [submittingFine, setSubmittingFine] = useState(false);
  const [recentFines, setRecentFines] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchTiposMultas();
    fetchRecentFines();
  }, []);

  const fetchTiposMultas = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_multa')
        .select('*')
        .order('id_tipo_multa', { ascending: true });
      
      if (error) throw error;
      setTiposMultas(data || []);
    } catch (err) {
      console.error("Error al cargar tipos de multa:", err);
      // Fallback estático en caso de que la tabla no se haya creado aún en Supabase
      setTiposMultas([
        { id_tipo_multa: 1, concepto: 'Falta a marchas o bloqueos', monto_default: 200, categoria: 'Movilizaciones' },
        { id_tipo_multa: 2, concepto: 'Inasistencia a asambleas generales', monto_default: 100, categoria: 'Asambleas' },
        { id_tipo_multa: 3, concepto: 'Abandono de ruta o "trameaje"', monto_default: 75, categoria: 'Operaciones' },
        { id_tipo_multa: 4, concepto: 'Atraso en punto de control (tarjeta)', monto_default: 5, categoria: 'Operaciones' },
        { id_tipo_multa: 5, concepto: 'Falta a fiesta patronal (Preste)', monto_default: 300, categoria: 'Social' },
        { id_tipo_multa: 6, concepto: 'Peleas o altercados entre choferes', monto_default: 150, categoria: 'Disciplina' },
        { id_tipo_multa: 7, concepto: 'No portar uniforme / Distintivo', monto_default: 20, categoria: 'Disciplina' }
      ]);
    }
  };

  const fetchRecentFines = async () => {
    try {
      const { data, error } = await supabase
        .from('multas')
        .select(`
          id_multa, concepto, monto_bs, fecha_emision, observacion, estado,
          afiliados ( numero_afiliado, personas ( nombres, paterno ) )
        `)
        .order('id_multa', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setRecentFines(data || []);
    } catch (err) {
      console.error("Error al cargar multas recientes:", err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setLoadingSearch(true);
    setVehicle(null);
    setActiveDriver(null);
    setSelectedTipoMulta('');
    setMontoBs('');
    setObservacion('');
    
    try {
      // Buscar vehículo por número de disco o por placa
      let query = supabase.from('vehiculos').select(`
        id_vehiculo, numero_disco, placa, numero_linea, marca, modelo, estado,
        afiliados ( id_afiliado, numero_afiliado, personas ( nombres, paterno ) )
      `);
      
      if (isNaN(searchTerm)) {
        query = query.ilike('placa', `%${searchTerm}%`);
      } else {
        query = query.eq('numero_disco', parseInt(searchTerm));
      }
      
      const { data: vehs, error } = await query;
      if (error) throw error;
      
      if (!vehs || vehs.length === 0) {
        alert("Vehículo no encontrado. Verifique la placa o disco.");
        return;
      }
      
      const selectedVeh = vehs[0];
      setVehicle(selectedVeh);
      
      // Buscar si el vehículo tiene chofer asignado activo
      const { data: driverData } = await supabase
        .from('chofer_vehiculo')
        .select(`
          id_chofer,
          afiliados ( id_afiliado, numero_afiliado, personas ( nombres, paterno ) )
        `)
        .eq('id_vehiculo', selectedVeh.id_vehiculo)
        .eq('estado', 1)
        .is('fecha_fin', null)
        .maybeSingle();
        
      if (driverData) {
        setActiveDriver(driverData.afiliados);
        setMultadoA('Chofer'); // Default a multar al chofer si hay uno asignado
      } else {
        setActiveDriver(null);
        setMultadoA('Propietario'); // Si no hay chofer, va directo al propietario
      }
    } catch (err) {
      alert("Error en la búsqueda: " + err.message);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleStatusChangeInField = async (newStatus) => {
    if (!vehicle) return;
    if (!window.confirm(`¿Confirmar cambio de estado de este vehículo a: ${newStatus}?`)) return;
    
    try {
      const { error } = await supabase
        .from('vehiculos')
        .update({ estado: newStatus })
        .eq('id_vehiculo', vehicle.id_vehiculo);
        
      if (error) throw error;
      
      setVehicle({ ...vehicle, estado: newStatus });
      alert(`Estado del vehículo actualizado a: ${newStatus}`);
      fetchRecentFines();
    } catch (err) {
      alert("Error al actualizar estado: " + err.message);
    }
  };

  const handleTipoMultaChange = (e) => {
    const id = e.target.value;
    setSelectedTipoMulta(id);
    const selected = tiposMultas.find(tm => tm.id_tipo_multa.toString() === id);
    if (selected) {
      setMontoBs(selected.monto_default);
    } else {
      setMontoBs('');
    }
  };

  const handleFineSubmit = async (e) => {
    e.preventDefault();
    if (!vehicle) return;
    if (!montoBs || isNaN(montoBs)) {
      alert("Por favor ingrese un monto válido.");
      return;
    }

    setSubmittingFine(true);
    try {
      // Determinar quién recibirá la multa
      const recipient = multadoA === 'Chofer' && activeDriver ? activeDriver : vehicle.afiliados;
      const selected = tiposMultas.find(tm => tm.id_tipo_multa.toString() === selectedTipoMulta);
      const conceptoMulta = selected ? selected.concepto : "Infracción General";

      const finePayload = {
        id_afiliado: recipient.id_afiliado,
        id_usuario_emisor: profile?.id && profile.id > 0 ? profile.id : 1, // Fallback al id 1 si es de prueba
        id_tipo_multa: selected ? selected.id_tipo_multa : null,
        concepto: conceptoMulta,
        monto_bs: parseFloat(montoBs),
        observacion: `[Unidad Disco ${vehicle.numero_disco}] ${observacion}`,
        estado: 'Pendiente'
      };

      const { error } = await supabase.from('multas').insert([finePayload]);
      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Limpiar formulario y búsqueda
      setVehicle(null);
      setActiveDriver(null);
      setSearchTerm('');
      setSelectedTipoMulta('');
      setMontoBs('');
      setObservacion('');
      
      fetchRecentFines();
    } catch (err) {
      alert("Error al registrar la multa: " + err.message);
    } finally {
      setSubmittingFine(false);
    }
  };

  const getStatusIcon = (estado) => {
    switch (estado) {
      case 'Operativo': return <CheckCircle2 size={24} color="#10b981" />;
      case 'Mantenimiento': return <Wrench size={24} color="#f59e0b" />;
      case 'Fuerza Mayor': return <HeartHandshake size={24} color="#10b981" />;
      default: return <Ban size={24} color="#ef4444" />;
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 0.5rem 3rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Mini Cabecera del Controlador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', background: 'white', padding: '1.25rem 1.5rem', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: 'var(--secondary)', fontFamily: 'Outfit' }}>Control de Campo</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>Rol: <strong style={{ color: 'var(--primary)' }}>{profile?.rol || 'Controlador'}</strong></p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px' }}>
          <Receipt size={24} />
        </div>
      </div>

      {showSuccess && (
        <div className="animate-fade" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '14px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#047857' }}>
          <CheckCircle2 size={24} />
          <div>
            <div style={{ fontWeight: '750', fontSize: '0.95rem' }}>¡Multa Registrada!</div>
            <div style={{ fontSize: '0.85rem' }}>La multa ha sido guardada en Supabase correctamente.</div>
          </div>
        </div>
      )}

      {/* Contenedor Grid Responsivo */}
      <div className="dashboard-layout-grid">
        
        {/* Columna Izquierda: Búsqueda y Resultados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Buscador de Unidades */}
          <div className="premium-card">
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
              <div className="premium-input-container" style={{ flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="text" 
                  className="premium-input" 
                  placeholder="Buscar por N° Disco o Placa..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ height: '48px' }}
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ borderRadius: '12px', minWidth: '90px', height: '48px', padding: '0 1rem' }}
                disabled={loadingSearch}
              >
                {loadingSearch ? '...' : 'Buscar'}
              </button>
            </form>
          </div>

          {/* Resultados de la Unidad */}
          {vehicle && (
            <div className="animate-fade premium-card" style={{ padding: 0, overflow: 'hidden' }}>
              
              {/* Header de la Unidad */}
              <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)', padding: '1.5rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>Unidad de Transporte</div>
                  <h3 style={{ fontSize: '1.75rem', color: 'white', margin: '0.2rem 0 0', fontFamily: 'Outfit' }}>Disco #{vehicle.numero_disco}</h3>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '1.25rem', fontWeight: '800', letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {vehicle.placa}
                </div>
              </div>

              <div style={{ padding: '1.5rem' }}>
                {/* Estado Actual */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '14px', marginBottom: '1.25rem', border: '1.5px solid var(--border-light)' }}>
                  {getStatusIcon(vehicle.estado)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estado Operativo</div>
                    <div style={{ fontWeight: '800', color: 'var(--secondary)', fontSize: '1.05rem', fontFamily: 'Outfit' }}>{vehicle.estado}</div>
                  </div>
                </div>

                {/* Propietario y Chofer */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent)', borderTop: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Socio Propietario</div>
                    <div style={{ fontWeight: '700', color: 'var(--secondary)', fontSize: '1rem', marginTop: '0.25rem' }}>
                      {vehicle.afiliados?.personas?.nombres} {vehicle.afiliados?.personas?.paterno}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)', borderTop: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Chofer Asignado</div>
                    <div style={{ fontWeight: '700', color: 'var(--secondary)', fontSize: '1rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={16} color="var(--primary)" />
                      {activeDriver ? (
                        `${activeDriver.personas?.nombres} ${activeDriver.personas?.paterno}`
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: '400' }}>Sin chofer (Socio propietario opera)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cambio rápido de Estado */}
                <div style={{ marginBottom: '1.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Cambio Rápido de Estado en Campo:</div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      onClick={() => handleStatusChangeInField('Operativo')} 
                      style={{ flex: 1, minWidth: '100px', padding: '0.65rem 0.5rem', fontSize: '0.8rem', borderRadius: '10px', cursor: 'pointer', border: '1.5px solid #10b981', background: vehicle.estado === 'Operativo' ? '#10b981' : 'white', color: vehicle.estado === 'Operativo' ? 'white' : '#10b981', fontWeight: '700', transition: 'var(--transition)' }}
                    >
                      Operativo
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleStatusChangeInField('Mantenimiento')} 
                      style={{ flex: 1, minWidth: '100px', padding: '0.65rem 0.5rem', fontSize: '0.8rem', borderRadius: '10px', cursor: 'pointer', border: '1.5px solid #f59e0b', background: vehicle.estado === 'Mantenimiento' ? '#f59e0b' : 'white', color: vehicle.estado === 'Mantenimiento' ? 'white' : '#f59e0b', fontWeight: '700', transition: 'var(--transition)' }}
                    >
                      Mantenimiento
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleStatusChangeInField('Fuerza Mayor')} 
                      style={{ flex: 1, minWidth: '100px', padding: '0.65rem 0.5rem', fontSize: '0.8rem', borderRadius: '10px', cursor: 'pointer', border: '1.5px solid var(--primary)', background: vehicle.estado === 'Fuerza Mayor' ? 'var(--primary)' : 'white', color: vehicle.estado === 'Fuerza Mayor' ? 'white' : 'var(--primary)', fontWeight: '700', transition: 'var(--transition)' }}
                    >
                      Fuerza Mayor
                    </button>
                  </div>
                </div>

                {/* Formulario de Multa */}
                <form onSubmit={handleFineSubmit} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary)' }}>
                    <AlertTriangle size={20} color="var(--primary)" />
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', fontFamily: 'Outfit' }}>Registrar Nueva Infracción</h4>
                  </div>

                  {/* Selector de Infracción */}
                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Tipo de Infracción / Multa del Catálogo</label>
                    <select 
                      className="form-control" 
                      value={selectedTipoMulta} 
                      onChange={handleTipoMultaChange} 
                      required
                      style={{ borderRadius: '12px', height: '46px', fontSize: '0.9rem', border: '1.5px solid var(--border-light)', background: 'var(--bg-subtle)' }}
                    >
                      <option value="">Seleccione tipo de infracción...</option>
                      {tiposMultas.map(tm => (
                        <option key={tm.id_tipo_multa} value={tm.id_tipo_multa}>
                          {tm.concepto} (Monto: Bs. {tm.monto_default})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                    {/* Costo */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Monto de Multa (Bs.)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        value={montoBs} 
                        onChange={(e) => setMontoBs(e.target.value)} 
                        required 
                        style={{ borderRadius: '12px', height: '46px', fontSize: '0.9rem', border: '1.5px solid var(--border-light)', background: 'var(--bg-subtle)' }}
                      />
                    </div>

                    {/* Multado */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Aplicar Multa A</label>
                      <select 
                        className="form-control" 
                        value={multadoA} 
                        onChange={(e) => setMultadoA(e.target.value)}
                        required
                        style={{ borderRadius: '12px', height: '46px', fontSize: '0.9rem', border: '1.5px solid var(--border-light)', background: 'var(--bg-subtle)' }}
                      >
                        {activeDriver && <option value="Chofer">Chofer Asignado</option>}
                        <option value="Propietario">Socio Propietario</option>
                      </select>
                    </div>
                  </div>

                  {/* Observación */}
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">Observaciones y Detalles del Suceso</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Ej: Atraso en punto de control Ceja 15 minutos..." 
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      style={{ borderRadius: '12px', height: '46px', fontSize: '0.9rem', border: '1.5px solid var(--border-light)', background: 'var(--bg-subtle)' }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', borderRadius: '12px', height: '50px', fontSize: '1rem', fontWeight: '800', background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
                    disabled={submittingFine}
                  >
                    {submittingFine ? 'Registrando en Supabase...' : 'Imponer Multa y Guardar'}
                  </button>
                </form>

              </div>
            </div>
          )}

        </div>

        {/* Columna Derecha: Recientes de Turno */}
        <div className="premium-card" style={{ width: '100%', alignSelf: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
            <Bookmark size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.2rem', margin: 0, fontFamily: 'Outfit', color: 'var(--secondary)' }}>Últimas Multas Emitidas</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '680px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {recentFines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No se registran infracciones en el turno de hoy.
              </div>
            ) : (
              recentFines.map(rf => (
                <div key={rf.id_multa} className="animate-fade" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-subtle)', borderRadius: '14px', border: '1.5px solid var(--border-light)', transition: 'var(--transition)' }}>
                  <div style={{ flex: 1, marginRight: '0.75rem' }}>
                    <div style={{ fontWeight: '750', color: 'var(--secondary)', fontSize: '0.95rem' }}>{rf.concepto}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span><strong>N° Afiliado:</strong> {rf.afiliados?.numero_afiliado}</span>
                      <span><strong>Persona:</strong> {rf.afiliados?.personas?.nombres} {rf.afiliados?.personas?.paterno}</span>
                    </div>
                    {rf.observacion && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem', padding: '0.35rem 0.5rem', background: 'white', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.05)' }}>
                        {rf.observacion}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <span style={{ fontWeight: '850', color: '#ef4444', fontSize: '1.05rem', fontFamily: 'Outfit' }}>Bs. {rf.monto_bs}</span>
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', marginTop: '0.5rem', borderRadius: '50px' }}>{rf.estado}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default ControladorMultas;

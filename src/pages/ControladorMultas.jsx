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
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '1rem', paddingBottom: '3rem', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Mini Cabecera del Controlador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.7)', padding: '1rem', borderRadius: '15px', backdropFilter: 'blur(10px)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--secondary)' }}>Control de Campo</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Rol: {profile?.rol || 'Controlador'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyCenter: 'center', width: '38px', height: '38px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '50%' }}>
          <Receipt size={18} style={{ margin: 'auto' }} />
        </div>
      </div>

      {showSuccess && (
        <div className="animate-fade" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#047857' }}>
          <CheckCircle2 size={24} />
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>¡Multa Registrada!</div>
            <div style={{ fontSize: '0.8rem' }}>La multa ha sido guardada en Supabase correctamente.</div>
          </div>
        </div>
      )}

      {/* Buscador de Unidades */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-md)', marginBottom: '1.25rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="N° Disco o Placa..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem', borderRadius: '12px', height: '48px', fontSize: '1.05rem', border: '1.5px solid var(--border-light)' }}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ borderRadius: '12px', width: '70px', height: '48px', padding: 0 }}
            disabled={loadingSearch}
          >
            {loadingSearch ? '...' : 'Buscar'}
          </button>
        </form>
      </div>

      {/* Resultados de la Unidad */}
      {vehicle && (
        <div className="animate-fade" style={{ background: 'white', borderRadius: '20px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', marginBottom: '1.25rem' }}>
          
          {/* Header de la Unidad */}
          <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)', padding: '1.25rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: '700' }}>Unidad de Transporte</div>
              <h3 style={{ fontSize: '1.6rem', color: 'white', margin: 0 }}>Disco #{vehicle.numero_disco}</h3>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '0.05em' }}>
              {vehicle.placa}
            </div>
          </div>

          <div style={{ padding: '1.25rem' }}>
            {/* Estado Actual */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1rem', border: '1px solid var(--border-light)' }}>
              {getStatusIcon(vehicle.estado)}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estado Operativo</div>
                <div style={{ fontWeight: '700', color: 'var(--secondary)', fontSize: '0.95rem' }}>{vehicle.estado}</div>
              </div>
            </div>

            {/* Propietario y Chofer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Socio Propietario</div>
                <div style={{ fontWeight: '600', color: 'var(--secondary)', fontSize: '0.9rem' }}>
                  {vehicle.afiliados?.personas?.nombres} {vehicle.afiliados?.personas?.paterno}
                </div>
              </div>
              <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chofer Asignado</div>
                <div style={{ fontWeight: '600', color: 'var(--secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <User size={14} color="var(--primary)" />
                  {activeDriver ? (
                    `${activeDriver.personas?.nombres} ${activeDriver.personas?.paterno}`
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: '400' }}>Sin chofer (Propietario opera)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Cambio rápido de Estado */}
            <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Cambio Rápido de Estado:</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  onClick={() => handleStatusChangeInField('Operativo')} 
                  style={{ flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.75rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid #10b981', background: vehicle.estado === 'Operativo' ? '#10b981' : 'white', color: vehicle.estado === 'Operativo' ? 'white' : '#10b981', fontWeight: '600' }}
                >
                  Operativo
                </button>
                <button 
                  type="button" 
                  onClick={() => handleStatusChangeInField('Mantenimiento')} 
                  style={{ flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.75rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid #f59e0b', background: vehicle.estado === 'Mantenimiento' ? '#f59e0b' : 'white', color: vehicle.estado === 'Mantenimiento' ? 'white' : '#f59e0b', fontWeight: '600' }}
                >
                  Mantenimiento
                </button>
                <button 
                  type="button" 
                  onClick={() => handleStatusChangeInField('Fuerza Mayor')} 
                  style={{ flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.75rem', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--primary)', background: vehicle.estado === 'Fuerza Mayor' ? 'var(--primary)' : 'white', color: vehicle.estado === 'Fuerza Mayor' ? 'white' : 'var(--primary)', fontWeight: '600' }}
                >
                  Fuerza Mayor
                </button>
              </div>
            </div>

            {/* Formulario de Multa */}
            <form onSubmit={handleFineSubmit} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                <Receipt size={18} />
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Registrar Infracción</h4>
              </div>

              {/* Selector de Infracción */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Tipo de Infracción</label>
                <select 
                  className="form-control" 
                  value={selectedTipoMulta} 
                  onChange={handleTipoMultaChange} 
                  required
                  style={{ borderRadius: '10px', height: '42px', fontSize: '0.9rem' }}
                >
                  <option value="">Seleccione tipo de infracción...</option>
                  {tiposMultas.map(tm => (
                    <option key={tm.id_tipo_multa} value={tm.id_tipo_multa}>
                      {tm.concepto} (Bs. {tm.monto_default})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {/* Costo */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Costo (Bs.)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={montoBs} 
                    onChange={(e) => setMontoBs(e.target.value)} 
                    required 
                    style={{ borderRadius: '10px', height: '42px', fontSize: '0.9rem' }}
                  />
                </div>

                {/* Multado */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Destinatario</label>
                  <select 
                    className="form-control" 
                    value={multadoA} 
                    onChange={(e) => setMultadoA(e.target.value)}
                    required
                    style={{ borderRadius: '10px', height: '42px', fontSize: '0.9rem' }}
                  >
                    {activeDriver && <option value="Chofer">Chofer Asignado</option>}
                    <option value="Propietario">Socio Propietario</option>
                  </select>
                </div>
              </div>

              {/* Observación */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Observaciones / Detalles</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ej: Atraso de 10 min en control Ceja..." 
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  style={{ borderRadius: '10px', height: '42px', fontSize: '0.9rem' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', borderRadius: '12px', height: '48px', fontSize: '1rem', fontWeight: '700' }}
                disabled={submittingFine}
              >
                {submittingFine ? 'Registrando...' : 'Registrar Multa e Imponer'}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Recientes de Turno */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '1.25rem', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Bookmark size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Últimas Multas Emitidas</h3>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
          {recentFines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay multas registradas hoy.</div>
          ) : (
            recentFines.map(rf => (
              <div key={rf.id_multa} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-light)', fontSize: '0.85rem' }}>
                <div style={{ flex: 1, marginRight: '0.5rem' }}>
                  <div style={{ fontWeight: '700', color: 'var(--secondary)' }}>{rf.concepto}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Afiliado: {rf.afiliados?.numero_afiliado} - {rf.afiliados?.personas?.nombres} {rf.afiliados?.personas?.paterno}
                  </div>
                  {rf.observacion && <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontStyle: 'italic', marginTop: '0.1rem' }}>{rf.observacion}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: '800', color: '#ef4444', fontSize: '0.9rem', display: 'block' }}>Bs. {rf.monto_bs}</span>
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', marginTop: '0.2rem' }}>{rf.estado}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};

export default ControladorMultas;

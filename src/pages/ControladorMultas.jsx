import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Clock, Search, User, AlertTriangle, CheckCircle2, ShieldAlert, Receipt, Bookmark, Ban, Send, ArrowRight, MapPin, CarFront } from 'lucide-react';

const ControladorMultas = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('TARJETA'); 
  
  // --- ESTADO PARA MODO RÁPIDO (TARJETA) ---
  const [tarjetaDisco, setTarjetaDisco] = useState('');
  const [tarjetaFalta, setTarjetaFalta] = useState('ATRASO'); 
  const [submittingTarjeta, setSubmittingTarjeta] = useState(false);

  // --- ESTADO PARA OTRAS FALTAS (MODO DETALLADO) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicle, setVehicle] = useState(null);
  const [activeDriver, setActiveDriver] = useState(null);
  const [tiposMultas, setTiposMultas] = useState([]);
  const [selectedTipoMulta, setSelectedTipoMulta] = useState('');
  const [montoBs, setMontoBs] = useState('');
  const [observacion, setObservacion] = useState('');
  const [multadoA, setMultadoA] = useState('Chofer');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [submittingFine, setSubmittingFine] = useState(false);

  // --- ESTADOS COMPARTIDOS ---
  const [recentFines, setRecentFines] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchTiposMultas();
    fetchRecentFines();
  }, []);

  const fetchTiposMultas = async () => {
    try {
      const { data, error } = await supabase.from('tipos_multa').select('*').order('id_tipo_multa', { ascending: true });
      if (error) throw error;
      setTiposMultas(data || []);
    } catch (err) {
      console.error("Error al cargar tipos de multa:", err);
      setTiposMultas([
        { id_tipo_multa: 1, concepto: 'Falta a marchas o bloqueos', monto_default: 200, categoria: 'Movilizaciones' },
        { id_tipo_multa: 2, concepto: 'Inasistencia a asambleas generales', monto_default: 100, categoria: 'Asambleas' },
        { id_tipo_multa: 3, concepto: 'Abandono de ruta o "trameaje"', monto_default: 75, categoria: 'Operaciones' },
        { id_tipo_multa: 4, concepto: 'Atraso en punto de control (tarjeta)', monto_default: 5, categoria: 'Operaciones' }
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
        .limit(12);
      
      if (error) throw error;
      setRecentFines(data || []);
    } catch (err) {
      console.error("Error al cargar multas recientes:", err);
    }
  };

  const handleCondonarMulta = async (idMulta, concepto) => {
    if (!profile || profile.id === 0) { alert("Debe iniciar sesión para hacer esto."); return; }
    if (!window.confirm(`¿Estás seguro de levantar la multa por: "${concepto}"?`)) return;

    try {
      const { error } = await supabase.from('multas').update({ estado: 'Condonado' }).eq('id_multa', idMulta);
      if (error) throw error;
      fetchRecentFines();
    } catch (err) {
      alert("Error al levantar la multa: " + err.message);
    }
  };

  const handleRegistroTarjeta = async (e) => {
    e.preventDefault();
    if (!tarjetaDisco) return;
    if (!profile || profile.id === 0) { alert("Error: No estás autenticado."); return; }

    setSubmittingTarjeta(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      const placaStr = tarjetaDisco.trim().toUpperCase();
      if (!placaStr) { throw new Error("Número de placa inválido."); }

      const { data: vehs, error: errVeh } = await supabase
        .from('vehiculos')
        .select(`id_vehiculo, placa, numero_disco, id_propietario, afiliados!vehiculos_id_propietario_fkey ( id_afiliado )`)
        .ilike('placa', placaStr)
        .single();
        
      if (errVeh || !vehs) {
        throw new Error(`No existe ningún vehículo registrado con la placa: ${placaStr}`);
      }
      
      const { data: driverData } = await supabase
        .from('chofer_vehiculo')
        .select('id_chofer')
        .eq('id_vehiculo', vehs.id_vehiculo)
        .eq('estado', 1)
        .is('fecha_fin', null)
        .maybeSingle();
        
      const idAfiliadoMultado = driverData ? driverData.id_chofer : vehs.id_propietario;
      const concepto = tarjetaFalta === 'ATRASO' ? 'Atraso en punto de control (tarjeta)' : 'Adelanto en punto de control (tarjeta)';
      
      const finePayload = {
        id_afiliado: idAfiliadoMultado,
        id_usuario_emisor: profile.id,
        concepto: concepto,
        monto_bs: 5,
        observacion: `[Placa: ${vehs.placa}] Multa registrada en campo.`,
        estado: 'Pendiente'
      };

      const { error } = await supabase.from('multas').insert([finePayload]);
      if (error) throw error;
      
      setSuccessMsg(`¡${concepto} registrado a la placa ${vehs.placa}!`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      
      setTarjetaDisco('');
      fetchRecentFines();
    } catch (err) {
      setErrorMsg(err.message);
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setSubmittingTarjeta(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    setLoadingSearch(true);
    setVehicle(null); setActiveDriver(null); setSelectedTipoMulta(''); setMontoBs(''); setObservacion('');
    
    try {
      const { data: matchedViews, error: errView } = await supabase
        .from('vista_busqueda_vehiculos')
        .select('id_vehiculo')
        .ilike('busqueda_texto', `%${term}%`)
        .limit(1);

      if (errView) throw errView;
      if (!matchedViews || matchedViews.length === 0) {
        alert(`No se encontró vehículo para: "${term}".`);
        return;
      }

      const { data: vehs, error: errVeh } = await supabase
        .from('vehiculos')
        .select(`id_vehiculo, numero_disco, placa, numero_linea, marca, modelo, estado, afiliados ( id_afiliado, numero_afiliado, personas ( nombres, paterno ) )`)
        .eq('id_vehiculo', matchedViews[0].id_vehiculo)
        .single();
        
      if (errVeh || !vehs) throw errVeh;
      
      setVehicle(vehs);
      const { data: driverData } = await supabase
        .from('chofer_vehiculo')
        .select(`id_chofer, afiliados ( id_afiliado, numero_afiliado, personas ( nombres, paterno ) )`)
        .eq('id_vehiculo', vehs.id_vehiculo).eq('estado', 1).is('fecha_fin', null).maybeSingle();
        
      setActiveDriver(driverData ? driverData.afiliados : null);
      setMultadoA(driverData ? 'Chofer' : 'Propietario');
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleFineSubmit = async (e) => {
    e.preventDefault();
    if (!vehicle || !montoBs) return;
    setSubmittingFine(true);
    try {
      const recipient = multadoA === 'Chofer' && activeDriver ? activeDriver : vehicle.afiliados;
      const selected = tiposMultas.find(tm => tm.id_tipo_multa.toString() === selectedTipoMulta);
      const conceptoMulta = selected ? selected.concepto : "Infracción General";

      const finePayload = {
        id_afiliado: recipient.id_afiliado,
        id_usuario_emisor: profile.id || 1,
        id_tipo_multa: selected ? selected.id_tipo_multa : null,
        concepto: conceptoMulta,
        monto_bs: parseFloat(montoBs),
        observacion: `[Placa: ${vehicle.placa}] ${observacion}`,
        estado: 'Pendiente'
      };

      const { error } = await supabase.from('multas').insert([finePayload]);
      if (error) throw error;

      setSuccessMsg(`Infracción por ${conceptoMulta} registrada`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      
      setVehicle(null); setActiveDriver(null); setSearchTerm(''); setSelectedTipoMulta(''); setMontoBs(''); setObservacion('');
      fetchRecentFines();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingFine(false);
    }
  };

  const handleTipoMultaChange = (e) => {
    const id = e.target.value;
    setSelectedTipoMulta(id);
    const selected = tiposMultas.find(tm => tm.id_tipo_multa.toString() === id);
    setMontoBs(selected ? selected.monto_default : '');
  };

  return (
    <>
      <style>{`
        .ctrl-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (min-width: 1024px) {
          .ctrl-grid {
            grid-template-columns: 55% 45%;
            gap: 2.5rem;
            align-items: start;
          }
        }
        
        .premium-card {
          background: white;
          border-radius: 24px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
          border: 1px solid rgba(226, 232, 240, 0.8);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .hero-banner {
          background: #3b82f6;
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 24px 24px 0 0;
        }
        
        .hero-banner-content h2 {
          color: #0f172a;
          font-size: 1.5rem;
          font-weight: 900;
          margin: 0;
          font-family: 'Outfit', sans-serif;
          letter-spacing: -0.01em;
        }
        
        .hero-banner-content p {
          color: white;
          font-size: 0.95rem;
          margin: 0.25rem 0 0;
          font-weight: 500;
        }
        
        .hero-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .ctrl-tabs {
          display: flex; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
        }
        .ctrl-tab {
          flex: 1; text-align: center; padding: 1.25rem 0; font-weight: 800; font-size: 0.95rem;
          color: #94a3b8; cursor: pointer; transition: all 0.3s ease; border-bottom: 3px solid transparent;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem; letter-spacing: 0.02em;
        }
        .ctrl-tab.active { color: #2563eb; border-bottom-color: #2563eb; background: white; }
        .ctrl-tab:hover:not(.active) { color: #64748b; background: rgba(255,255,255,0.5); }
        
        .input-huge {
          width: 100%; box-sizing: border-box; height: 85px; font-size: 3.5rem; font-weight: 900;
          text-align: center; border: 2px solid #e2e8f0; border-radius: 20px; color: #0f172a;
          outline: none; transition: all 0.3s; font-family: 'Outfit', sans-serif; text-transform: uppercase;
          background: #f8fafc; letter-spacing: 2px;
        }
        .input-huge:focus {
          border-color: #3b82f6; background: white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
        }
        
        .btn-toggle {
          flex: 1; height: 75px; border-radius: 16px; font-size: 1.15rem; font-weight: 900;
          cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); border: 2px solid transparent;
          display: flex; align-items: center; justify-content: center; letter-spacing: 1px;
        }
        .btn-atraso { background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; }
        .btn-atraso.active { background: #fef2f2; color: #ef4444; border-color: #ef4444; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); transform: scale(1.02); }
        .btn-adelanto { background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; }
        .btn-adelanto.active { background: #fffbeb; color: #d97706; border-color: #f59e0b; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.2); transform: scale(1.02); }
        
        .btn-submit {
          width: 100%; box-sizing: border-box; height: 75px; border-radius: 20px; font-size: 1.25rem;
          font-weight: 900; border: none; cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 0.75rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase; letter-spacing: 1px;
        }
        .btn-submit.ready { background: #0f172a; color: white; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.3); }
        .btn-submit.ready:hover { transform: translateY(-3px); box-shadow: 0 15px 35px rgba(15, 23, 42, 0.4); background: #1e293b; }
        .btn-submit.ready:active { transform: translateY(0); }
        .btn-submit.disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }

        .list-container {
          background: white; border-radius: 24px; padding: 2rem; border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.04); height: 100%; display: flex; flex-direction: column;
        }
        
        .fine-item {
          background: white; border-radius: 16px; padding: 1.25rem; margin-bottom: 1rem;
          border: 1px solid #f1f5f9; box-shadow: 0 4px 12px rgba(0,0,0,0.02); transition: all 0.2s;
        }
        .fine-item:hover { border-color: #cbd5e1; box-shadow: 0 8px 24px rgba(0,0,0,0.06); transform: translateX(4px); }
        
        .status-badge {
          font-size: 0.7rem; font-weight: 800; padding: 0.3rem 0.6rem; border-radius: 6px; text-transform: uppercase;
        }
        .status-pending { background: #fef3c7; color: #d97706; }
        .status-forgiven { background: #d1fae5; color: #047857; }
        
        .alert-banner {
          border-radius: 16px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;
          animation: slideDown 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="ctrl-grid animate-fade">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO DE INGRESO */}
        <div className="premium-card">
          <div className="hero-banner">
            <div className="hero-banner-content">
              <h2>Control Sindicato</h2>
              <p>Punto de Control: En Campo</p>
            </div>
            <div className="hero-icon-wrapper">
              <Clock size={24} />
            </div>
          </div>

          <div className="ctrl-tabs">
            <div className={`ctrl-tab ${activeTab === 'TARJETA' ? 'active' : ''}`} onClick={() => setActiveTab('TARJETA')}>
              <Receipt size={18} /> TARJETA (RÁPIDO)
            </div>
            <div className={`ctrl-tab ${activeTab === 'OTRAS' ? 'active' : ''}`} onClick={() => setActiveTab('OTRAS')}>
              <AlertTriangle size={18} /> OTRAS FALTAS
            </div>
          </div>

          <div style={{ padding: '2rem' }}>
            
            {showSuccess && (
              <div className="alert-banner" style={{ background: '#ecfdf5', border: '2px solid #10b981', color: '#047857', boxShadow: '0 8px 20px rgba(16,185,129,0.15)' }}>
                <CheckCircle2 size={28} />
                <div style={{ fontWeight: '800', fontSize: '1rem' }}>{successMsg}</div>
              </div>
            )}

            {showError && (
              <div className="alert-banner" style={{ background: '#fef2f2', border: '2px solid #ef4444', color: '#b91c1c', boxShadow: '0 8px 20px rgba(239,68,68,0.15)' }}>
                <ShieldAlert size={28} />
                <div style={{ fontWeight: '800', fontSize: '1rem' }}>{errorMsg}</div>
              </div>
            )}

            {activeTab === 'TARJETA' && (
              <div className="animate-fade-in">
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', fontSize: '1rem', fontWeight: '800', color: '#475569', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Nº de Placa a Multar
                  </label>
                  <input 
                    type="text" 
                    placeholder="LPT2551"
                    value={tarjetaDisco}
                    onChange={(e) => setTarjetaDisco(e.target.value.toUpperCase())}
                    className="input-huge"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                  <button 
                    onClick={() => setTarjetaFalta('ATRASO')}
                    className={`btn-toggle btn-atraso ${tarjetaFalta === 'ATRASO' ? 'active' : ''}`}
                  >
                    ATRASO
                  </button>
                  <button 
                    onClick={() => setTarjetaFalta('ADELANTO')}
                    className={`btn-toggle btn-adelanto ${tarjetaFalta === 'ADELANTO' ? 'active' : ''}`}
                  >
                    ADELANTO
                  </button>
                </div>

                <button 
                  onClick={handleRegistroTarjeta}
                  disabled={submittingTarjeta || !tarjetaDisco}
                  className={`btn-submit ${(!tarjetaDisco || submittingTarjeta) ? 'disabled' : 'ready'}`}
                >
                  <Send size={24} />
                  {submittingTarjeta ? 'Procesando...' : 'Aplicar Multa Inmediata'}
                </button>
              </div>
            )}

            {activeTab === 'OTRAS' && (
              <div className="animate-fade-in">
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                  <input 
                    type="text" 
                    placeholder="Buscar Placa o Nombre..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ flex: 1, width: '100%', boxSizing: 'border-box', height: '60px', borderRadius: '16px', border: '2px solid #e2e8f0', padding: '0 1.25rem', fontSize: '1.05rem', fontWeight: '600', outline: 'none' }}
                  />
                  <button type="submit" disabled={loadingSearch} style={{ height: '60px', width: '60px', borderRadius: '16px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {loadingSearch ? '...' : <Search size={24} />}
                  </button>
                </form>

                {vehicle && (
                  <div className="animate-fade-in">
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>Unidad Localizada</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#0f172a', fontFamily: 'Outfit' }}>Placa: {vehicle.placa} <span style={{ fontSize: '1.2rem', color: '#3b82f6' }}>(Disco {vehicle.numero_disco})</span></div>
                      <div style={{ fontSize: '0.95rem', color: '#475569', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16}/> {activeDriver ? 'Chofer' : 'Propietario'}: {multadoA === 'Chofer' ? activeDriver?.personas?.nombres : vehicle.afiliados?.personas?.nombres}</div>
                    </div>

                    <form onSubmit={handleFineSubmit}>
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem' }}>Seleccionar Infracción</label>
                        <select required value={selectedTipoMulta} onChange={handleTipoMultaChange} style={{ width: '100%', boxSizing: 'border-box', height: '60px', borderRadius: '16px', border: '2px solid #e2e8f0', padding: '0 1.25rem', fontSize: '1rem', outline: 'none', fontWeight: '600', color: '#1e293b' }}>
                          <option value="">-- Seleccione una opción --</option>
                          {tiposMultas.map(tm => (
                            <option key={tm.id_tipo_multa} value={tm.id_tipo_multa}>{tm.concepto} (Bs. {tm.monto_default})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem' }}>Monto a Pagar (Bs.)</label>
                        <input type="number" required value={montoBs} onChange={e => setMontoBs(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: '60px', borderRadius: '16px', border: '2px solid #e2e8f0', padding: '0 1.25rem', fontSize: '1.1rem', fontWeight: '800', outline: 'none', color: '#1e293b' }} />
                      </div>

                      <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem' }}>Observaciones / Detalles</label>
                        <input type="text" value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Escriba los detalles aquí..." style={{ width: '100%', boxSizing: 'border-box', height: '60px', borderRadius: '16px', border: '2px solid #e2e8f0', padding: '0 1.25rem', fontSize: '1rem', outline: 'none' }} />
                      </div>

                      <button type="submit" disabled={submittingFine} className={`btn-submit ${submittingFine ? 'disabled' : 'ready'}`}>
                        {submittingFine ? 'Registrando...' : 'Confirmar Multa'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: HISTORIAL */}
        <div className="list-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '2px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '10px', color: '#2563eb' }}>
                <Bookmark size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: '900', color: '#0f172a', letterSpacing: '-0.01em' }}>Últimas Multas</h3>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', padding: '0.3rem 0.6rem', borderRadius: '6px' }}>
              Turno Actual
            </div>
          </div>
          
          <div className="fines-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
            {recentFines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                <AlertTriangle size={40} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
                <div style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '800' }}>Sin registros recientes</div>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>Las multas que emitas hoy aparecerán aquí.</p>
              </div>
            ) : (
              recentFines.map(rf => (
                <div key={rf.id_multa} className="fine-item animate-fade-in">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem', lineHeight: '1.4' }}>{rf.concepto}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CarFront size={14} /> Afiliado: <strong style={{ color: '#334155' }}>{rf.afiliados?.numero_afiliado}</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: '900', color: rf.estado === 'Condonado' ? '#94a3b8' : '#ef4444', fontSize: '1.3rem', fontFamily: 'Outfit', textDecoration: rf.estado === 'Condonado' ? 'line-through' : 'none', letterSpacing: '-0.02em' }}>
                        Bs. {rf.monto_bs}
                      </span>
                      <span className={`status-badge ${rf.estado === 'Pendiente' ? 'status-pending' : 'status-forgiven'}`} style={{ marginTop: '0.4rem' }}>
                        {rf.estado}
                      </span>
                    </div>
                  </div>
                  
                  {rf.estado === 'Pendiente' && (
                    <div style={{ marginTop: '1rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem' }}>
                      <button 
                        onClick={() => handleCondonarMulta(rf.id_multa, rf.concepto)}
                        style={{ width: '100%', height: '40px', fontSize: '0.85rem', fontWeight: '800', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                      >
                        <Ban size={14} /> Cancelar / Condonar Falta
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </>
  );
};

export default ControladorMultas;

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CarFront, ShieldAlert, DollarSign, Wallet, FileText, CheckCircle2, Bookmark, User, Phone, MapPin, Receipt } from 'lucide-react';

const AfiliadoPortal = () => {
  const { profile } = useAuth();
  
  const [affiliate, setAffiliate] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivenVehicles, setDrivenVehicles] = useState([]);
  const [cuotas, setCuotas] = useState([]);
  const [multas, setMultas] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (profile?.idPersona) {
      fetchAffiliatePortalData();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchAffiliatePortalData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Obtener registro de afiliado del usuario logueado
      const { data: affData, error: affErr } = await supabase
        .from('afiliados')
        .select(`
          id_afiliado, numero_afiliado, tipo_afiliado, estado_organico,
          personas ( nombres, paterno, materno, ci, celular, direccion )
        `)
        .eq('id_persona', profile.idPersona)
        .maybeSingle();

      if (affErr) throw affErr;

      if (!affData) {
        // En desarrollo local o si el administrador no completó el perfil de afiliado
        setErrorMsg("Tu usuario no está registrado como afiliado en el padrón del sindicato. Solicita tu registro en secretaría.");
        setLoading(false);
        return;
      }

      setAffiliate(affData);

      // Lanzar las 4 consultas financieras y de vehículos en paralelo
      const [
        resOwned,
        resDrive,
        resCuotas,
        resMultas
      ] = await Promise.all([
        supabase.from('vehiculos').select('*').eq('id_propietario', affData.id_afiliado),
        supabase.from('chofer_vehiculo').select(`
          vehiculos ( id_vehiculo, numero_disco, placa, numero_linea, marca, modelo, estado )
        `).eq('id_chofer', affData.id_afiliado).eq('estado', 1).is('fecha_fin', null),
        supabase.from('cuotas').select(`
          id_cuota, gestion, mes, monto_bs, estado, fecha_registro,
          tipos_cuota ( nombre )
        `).eq('id_afiliado', affData.id_afiliado).order('fecha_registro', { ascending: false }),
        supabase.from('multas').select('*').eq('id_afiliado', affData.id_afiliado).order('fecha_emision', { ascending: false })
      ]);

      const ownedData = resOwned.data || [];
      const driveData = resDrive.data || [];
      const cuotasData = resCuotas.data || [];
      const multasData = resMultas.data || [];

      setVehicles(ownedData);

      const resolvedDriven = driveData.map(d => d.vehiculos).filter(Boolean);
      setDrivenVehicles(resolvedDriven);

      setCuotas(cuotasData);
      setMultas(multasData);

    } catch (err) {
      console.error(err);
      setErrorMsg("Ocurrió un error al consultar tu panel de afiliado: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--primary-light)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }}></div>
        Cargando tus datos del sindicato...
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', padding: '2.5rem', background: 'white', borderRadius: '15px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
        <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.5rem', color: 'var(--secondary)', marginBottom: '0.75rem' }}>Perfil sin Padrón Sindical</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{errorMsg}</p>
        <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-light)', border: '1px solid var(--border-light)' }}>
          C.I. actual del usuario: <strong style={{ color: 'var(--secondary)' }}>{profile?.ci || 'Sin C.I. asociado'}</strong>
        </div>
      </div>
    );
  }

  // Calculos de Resumen Financiero
  const pendingCuotas = cuotas.filter(c => c.estado === 'Pendiente');
  const debtCuotasAmount = pendingCuotas.reduce((sum, c) => sum + parseFloat(c.monto_bs), 0);
  
  const pendingMultas = multas.filter(m => m.estado === 'Pendiente');
  const debtMultasAmount = pendingMultas.reduce((sum, m) => sum + parseFloat(m.monto_bs), 0);

  const totalDebt = debtCuotasAmount + debtMultasAmount;

  return (
    <div className="animate-fade" style={{ padding: '0 0.5rem 3rem' }}>
      
      {/* Banner de Bienvenida */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)', borderRadius: '20px', padding: '2.5rem', color: 'white', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <span style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.4rem 0.85rem', borderRadius: '50px', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {affiliate?.tipo_afiliado || 'Afiliado'}
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'white', marginTop: '0.5rem', marginBottom: '0.5rem', fontFamily: 'Outfit' }}>
            ¡Hola, {affiliate?.personas?.nombres}!
          </h1>
          <p style={{ opacity: 0.9, fontSize: '1rem', maxWidth: '500px' }}>
            Bienvenido a tu portal personal. Aquí puedes verificar tus vehículos vinculados, deudas de cuotas mensuales y registro de multas en tiempo real.
          </p>
        </div>
        <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.15, transform: 'rotate(-15deg)' }}>
          <CarFront size={220} color="white" />
        </div>
      </div>

      {/* Grid de Métricas de Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Deuda Total */}
        <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: totalDebt > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: totalDebt > 0 ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Deuda Pendiente</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: totalDebt > 0 ? '#ef4444' : '#10b981', fontFamily: 'Outfit' }}>
              Bs. {totalDebt.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Cuotas Pendientes */}
        <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cuotas Pendientes</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--secondary)', fontFamily: 'Outfit' }}>
              {pendingCuotas.length} <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-muted)' }}>meses</span>
            </div>
          </div>
        </div>

        {/* Multas Pendientes */}
        <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Multas Pendientes</div>
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--secondary)', fontFamily: 'Outfit' }}>
              {pendingMultas.length} <span style={{ fontSize: '0.85rem', fontWeight: '400', color: 'var(--text-muted)' }}>infracciones</span>
            </div>
          </div>
        </div>

        {/* Estado Orgánico */}
        <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: affiliate?.estado_organico === 'Activo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: affiliate?.estado_organico === 'Activo' ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estado Orgánico</div>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: affiliate?.estado_organico === 'Activo' ? '#10b981' : '#ef4444', fontFamily: 'Outfit' }}>
              {affiliate?.estado_organico || 'Activo'}
            </div>
          </div>
        </div>

      </div>

      <div className="dashboard-layout-grid">
        
        {/* LADO IZQUIERDO: VEHÍCULOS Y FINANZAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Ficha de Mis Vehículos */}
          <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
              <CarFront size={20} color="var(--primary)" /> Mis Unidades Vinculadas
            </h3>

            {vehicles.length === 0 && drivenVehicles.length === 0 ? (
              <div style={{ textAlignment: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                No tienes vehículos asignados en este momento.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Vehículos en Propiedad */}
                {vehicles.map(v => (
                  <div key={v.id_vehiculo} style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '800', color: 'var(--secondary)' }}>Disco #{v.numero_disco}</span>
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>Línea {v.numero_linea}</span>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>Propietario</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Vehículo: {v.marca} {v.modelo} | Placa: <strong style={{ color: 'var(--secondary)' }}>{v.placa}</strong>
                      </div>
                    </div>
                    <div>
                      <span className={`badge ${v.estado === 'Operativo' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                        {v.estado}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Vehículos en Conducción (Chofer contratado) */}
                {drivenVehicles.map(v => (
                  <div key={v.id_vehiculo} style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '800', color: 'var(--secondary)' }}>Disco #{v.numero_disco}</span>
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>Línea {v.numero_linea}</span>
                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Chofer</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Vehículo: {v.marca} {v.modelo} | Placa: <strong style={{ color: 'var(--secondary)' }}>{v.placa}</strong>
                      </div>
                    </div>
                    <div>
                      <span className={`badge ${v.estado === 'Operativo' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                        {v.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cuotas del Padrón */}
          <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
              <Wallet size={20} color="var(--primary)" /> Mis Cuotas Sindicales
            </h3>

            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {cuotas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tienes cuotas registradas.</div>
              ) : (
                cuotas.map(c => (
                  <div key={c.id_cuota} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--bg-subtle)' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--secondary)', fontSize: '0.9rem' }}>{c.tipos_cuota?.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Mes: {c.mes}/{c.gestion}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: '700', color: 'var(--secondary)', fontSize: '0.9rem', display: 'block' }}>Bs. {c.monto_bs}</span>
                      <span className={`badge ${c.estado === 'Cancelado' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', marginTop: '0.2rem' }}>
                        {c.estado}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* LADO DERECHO: MULTAS SINDICALES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Historial de Multas */}
          <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
              <Receipt size={20} color="#f59e0b" /> Historial de Multas e Infracciones
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '420px', overflowY: 'auto' }}>
              {multas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                  ¡Felicidades! No tienes multas registradas en el padrón.
                </div>
              ) : (
                multas.map(m => (
                  <div key={m.id_multa} style={{ padding: '1rem', background: m.estado === 'Pendiente' ? '#fffbeb' : 'var(--bg-subtle)', border: m.estado === 'Pendiente' ? '1px solid #fee2e2' : '1px solid var(--border-light)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, marginRight: '0.5rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--secondary)', fontSize: '0.9rem' }}>{m.concepto}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Fecha emisión: {m.fecha_emision}</div>
                      {m.observacion && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.25rem', background: 'rgba(0,0,0,0.02)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                          {m.observacion}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontWeight: '800', color: m.estado === 'Pendiente' ? '#ef4444' : 'var(--secondary)', fontSize: '1rem' }}>
                        Bs. {m.monto_bs}
                      </span>
                      <span className={`badge ${m.estado === 'Cancelado' ? 'badge-success' : m.estado === 'Condonado' ? 'badge-secondary' : 'badge-danger'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', marginTop: '0.4rem' }}>
                        {m.estado}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Información de Contacto */}
          <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '20px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--secondary)' }}>Información Registrada</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} color="var(--primary)" />
                <span>Nombres: <strong style={{ color: 'var(--secondary)' }}>{affiliate?.personas?.nombres} {affiliate?.personas?.paterno} {affiliate?.personas?.materno}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="var(--primary)" />
                <span>Cédula: <strong style={{ color: 'var(--secondary)' }}>{affiliate?.personas?.ci}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} color="var(--primary)" />
                <span>Celular: <strong style={{ color: 'var(--secondary)' }}>{affiliate?.personas?.celular || 'No registrado'}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="var(--primary)" />
                <span>Dirección: <strong style={{ color: 'var(--secondary)' }}>{affiliate?.personas?.direccion || 'No registrado'}</strong></span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AfiliadoPortal;

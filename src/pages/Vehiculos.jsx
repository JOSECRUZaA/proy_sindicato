import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit, Trash2, X, User, ShieldAlert } from 'lucide-react';

const Vehiculos = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [listaAfiliados, setListaAfiliados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeDrivers, setActiveDrivers] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    id_vehiculo: '',
    id_propietario: '', 
    id_chofer: '',
    numero_disco: '',
    placa: '',
    numero_linea: '1',
    marca: '',
    modelo: '',
    estado: 'Operativo'
  });

  useEffect(() => {
    fetchVehiculos();
    fetchAfiliadosSelect();
  }, []);

  const fetchAfiliadosSelect = async () => {
    try {
      const { data } = await supabase
        .from('perfiles')
        .select('id_perfil, numero_afiliado, tipo_afiliado, nombres, paterno')
        .not('numero_afiliado', 'is', null)
        .order('numero_afiliado', { ascending: true });
      if (data) setListaAfiliados(data);
    } catch (e) {
      console.error("Error al cargar afiliados:", e);
    }
  };

  const resetForm = () => {
    setFormData({
      id_vehiculo: '',
      id_propietario: '',
      id_chofer: '',
      numero_disco: '',
      placa: '',
      numero_linea: '1',
      marca: '',
      modelo: '',
      estado: 'Operativo'
    });
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      
      const { data: vehiculosData, error } = await supabase
        .from('vehiculos')
        .select(`
          id_vehiculo, numero_disco, placa, numero_linea, marca, modelo, estado,
          perfiles!vehiculos_id_propietario_fkey ( id_perfil, numero_afiliado, nombres, paterno )
        `);
      
      if (error) throw error;

      const { data: choferesAsignados, error: errChofer } = await supabase
        .from('chofer_vehiculo')
        .select(`
          id_asignacion, id_vehiculo, id_chofer, estado, fecha_fin,
          perfiles!chofer_vehiculo_id_chofer_fkey ( numero_afiliado, nombres, paterno )
        `)
        .eq('estado', 1)
        .is('fecha_fin', null);

      if (errChofer) throw errChofer;

      const driversMap = {};
      choferesAsignados?.forEach(c => {
        driversMap[c.id_vehiculo] = c;
      });

      setActiveDrivers(driversMap);
      setVehiculos(vehiculosData || []);
    } catch (err) {
      console.error("Error al cargar vehículos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let vehicleId = formData.id_vehiculo;
      
      const vehiclePayload = {
        id_propietario: formData.id_propietario,
        numero_disco: parseInt(formData.numero_disco),
        placa: formData.placa,
        numero_linea: formData.numero_linea,
        marca: formData.marca,
        modelo: formData.modelo,
        estado: formData.estado
      };

      if (isEditing) {
        const { error } = await supabase
          .from('vehiculos')
          .update(vehiclePayload)
          .eq('id_vehiculo', vehicleId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('vehiculos')
          .insert([vehiclePayload])
          .select();
        
        if (error) throw error;
        if (data && data.length > 0) {
          vehicleId = data[0].id_vehiculo;
        }
      }

      const activeAssign = activeDrivers[vehicleId];
      if (formData.id_chofer) {
        if (!activeAssign || activeAssign.id_chofer.toString() !== formData.id_chofer.toString()) {
          if (activeAssign) {
            await supabase
              .from('chofer_vehiculo')
              .update({ estado: 0, fecha_fin: new Date().toISOString().split('T')[0] })
              .eq('id_asignacion', activeAssign.id_asignacion);
          }
          const { error: insertErr } = await supabase
            .from('chofer_vehiculo')
            .insert([{
              id_vehiculo: vehicleId,
              id_chofer: formData.id_chofer,
              estado: 1
            }]);
          if (insertErr) throw insertErr;
        }
      } else {
        if (activeAssign) {
          await supabase
            .from('chofer_vehiculo')
            .update({ estado: 0, fecha_fin: new Date().toISOString().split('T')[0] })
            .eq('id_asignacion', activeAssign.id_asignacion);
        }
      }

      alert(isEditing ? "Vehículo actualizado exitosamente" : "Vehículo registrado exitosamente");
      setShowModal(false);
      resetForm();
      fetchVehiculos();
    } catch (error) {
      alert("Error al guardar vehículo: " + error.message);
    }
  };

  const handleEditClick = (v) => {
    const activeDriver = activeDrivers[v.id_vehiculo];
    setFormData({
      id_vehiculo: v.id_vehiculo,
      id_propietario: v.perfiles?.id_perfil || '',
      id_chofer: activeDriver ? activeDriver.id_chofer : '',
      numero_disco: v.numero_disco,
      placa: v.placa,
      numero_linea: v.numero_linea,
      marca: v.marca || '',
      modelo: v.modelo || '',
      estado: v.estado
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = async (idVehiculo) => {
    if (!window.confirm("¿Está seguro de eliminar este vehículo del parque automotor? Se desactivarán las relaciones de choferes vinculadas.")) return;
    try {
      await supabase
        .from('chofer_vehiculo')
        .delete()
        .eq('id_vehiculo', idVehiculo);

      const { error } = await supabase
        .from('vehiculos')
        .delete()
        .eq('id_vehiculo', idVehiculo);

      if (error) throw error;
      alert("Vehículo removido exitosamente.");
      fetchVehiculos();
    } catch (err) {
      alert("Error al eliminar vehículo: " + err.message);
    }
  };

  const filteredVehiculos = vehiculos.filter(v => 
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.numero_disco.toString().includes(searchTerm) ||
    (v.perfiles?.nombres && v.perfiles.nombres.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.perfiles?.paterno && v.perfiles.paterno.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadgeClass = (estado) => {
    switch (estado) {
      case 'Operativo': return 'badge-success';
      case 'Restricción Vehicular': return 'badge-warning';
      case 'Restricción Sindical': return 'badge-danger';
      case 'Mantenimiento': return 'badge-warning';
      case 'Fuerza Mayor': return 'badge-success';
      case 'Baja': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  return (
    <>
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">Parque Automotor</h1>
            <p className="page-subtitle">Administración de la flota, conductores asignados y restricciones operativas.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={18} /> Registrar Vehículo
          </button>
        </div>

        <div className="table-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="table-header">
            <div style={{ position: 'relative', width: '350px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Buscar por placa, disco o propietario..." 
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
                  <th>N° Disco</th>
                  <th>Placa</th>
                  <th>Línea</th>
                  <th>Vehículo</th>
                  <th>Socio Propietario</th>
                  <th>Chofer Asignado</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos del parque automotor...</td></tr>
                ) : filteredVehiculos.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No se encontraron vehículos.</td></tr>
                ) : (
                  filteredVehiculos.map(v => {
                    const activeDriver = activeDrivers[v.id_vehiculo];
                    return (
                      <tr key={v.id_vehiculo}>
                        <td style={{ fontWeight: '700', color: 'var(--primary)' }}># {v.numero_disco}</td>
                        <td style={{ fontWeight: '600', letterSpacing: '0.05em' }}>{v.placa}</td>
                        <td><span className="badge badge-warning" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>Línea {v.numero_linea}</span></td>
                        <td>{v.marca} {v.modelo}</td>
                        <td>{v.perfiles?.nombres} {v.perfiles?.paterno}</td>
                        <td>
                          {activeDriver ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              <User size={14} color="var(--primary)" />
                              {activeDriver.perfiles?.nombres} {activeDriver.perfiles?.paterno}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>Propietario opera</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(v.estado)}`}>
                            {v.estado}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem', marginRight: '0.5rem' }}
                            title="Editar Vehículo"
                            onClick={() => handleEditClick(v)}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.4rem', color: '#ef4444' }}
                            title="Eliminar Vehículo"
                            onClick={() => handleDeleteClick(v.id_vehiculo)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="auth-card animate-fade" style={{ maxWidth: '800px', width: '90%', padding: '2rem 2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src="/logo-sindicato.jpg" alt="Logo Sindicato" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)' }} />
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{isEditing ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}</h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sindicato 15 de Junio - La Paz</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Socio Propietario</label>
                  <select name="id_propietario" className="form-control" value={formData.id_propietario} onChange={handleInputChange} required>
                    <option value="">Seleccione un socio...</option>
                    {listaAfiliados.filter(af => af.tipo_afiliado === 'Socio Propietario').map(af => (
                      <option key={af.id_perfil} value={af.id_perfil}>
                        {af.numero_afiliado} - {af.nombres} {af.paterno}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Chofer Asignado (Opcional)</label>
                  <select name="id_chofer" className="form-control" value={formData.id_chofer} onChange={handleInputChange}>
                    <option value="">Ninguno (Opera el Propietario)</option>
                    {listaAfiliados.map(af => (
                      <option key={af.id_perfil} value={af.id_perfil}>
                        [{af.tipo_afiliado}] {af.numero_afiliado} - {af.nombres} {af.paterno}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h4 style={{ marginBottom: '1rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.4rem', fontSize: '1.1rem' }}>Datos Técnicos del Vehículo</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                <div className="form-group"><label className="form-label">N° Disco (Interno)</label><input type="number" name="numero_disco" className="form-control" value={formData.numero_disco} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Placa</label><input type="text" name="placa" className="form-control" placeholder="Ej: LPT2551" value={formData.placa} onChange={handleInputChange} required style={{ textTransform: 'uppercase' }} /></div>
                <div className="form-group"><label className="form-label">Línea Operativa</label><input type="text" name="numero_linea" className="form-control" value={formData.numero_linea} onChange={handleInputChange} /></div>
                
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Marca</label><input type="text" name="marca" className="form-control" placeholder="Ej: Toyota" value={formData.marca} onChange={handleInputChange} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Modelo</label><input type="text" name="modelo" className="form-control" placeholder="Ej: King Long" value={formData.modelo} onChange={handleInputChange} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Estado / Restricción</label>
                  <select name="estado" className="form-control" value={formData.estado} onChange={handleInputChange}>
                    <option value="Operativo">Operativo</option>
                    <option value="Restricción Vehicular">Restricción Vehicular</option>
                    <option value="Restricción Sindical">Restricción Sindical</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Fuerza Mayor">Fuerza Mayor</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
              </div>

              {formData.estado !== 'Operativo' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#b45309', fontSize: '0.9rem' }}>
                  <ShieldAlert size={18} />
                  <span>El vehículo se encuentra en estado **{formData.estado}** y no será listado como disponible para operaciones de ruta regular.</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>{isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Vehiculos;

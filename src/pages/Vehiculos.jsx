import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';

const Vehiculos = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [listaAfiliados, setListaAfiliados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    id_afiliado: '', numero_disco: '', placa: '', numero_linea: '1', marca: '', modelo: '', anio: '', estado: 'Operativo'
  });

  useEffect(() => {
    fetchVehiculos();
    fetchAfiliadosSelect();
  }, []);

  const fetchAfiliadosSelect = async () => {
    try {
      const { data } = await supabase.from('afiliados').select('id_afiliado, numero_afiliado, personas(nombres, paterno)');
      if (data) setListaAfiliados(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('vehiculos').insert([{
        id_propietario: formData.id_afiliado,
        numero_disco: formData.numero_disco,
        placa: formData.placa,
        numero_linea: formData.numero_linea,
        marca: formData.marca,
        modelo: formData.modelo,
        estado: formData.estado
      }]);
      if (error) throw error;
      alert("Vehículo registrado exitosamente");
      setShowModal(false);
      setFormData({ id_afiliado: '', numero_disco: '', placa: '', numero_linea: '1', marca: '', modelo: '', anio: '', estado: 'Operativo' });
      fetchVehiculos();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  const fetchVehiculos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehiculos')
        .select(`
          id_vehiculo, numero_disco, placa, numero_linea, marca, modelo, estado,
          afiliados ( personas ( nombres, paterno ) )
        `);
      
      if (error) throw error;
      setVehiculos(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Parque Automotor</h1>
          <p className="page-subtitle">Administración de la flota de vehículos.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Registrar Vehículo
        </button>
      </div>

      <div className="table-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="table-header">
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input type="text" className="form-control" placeholder="Buscar placa o disco..." style={{ paddingLeft: '2.5rem' }} />
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
                <th>Propietario</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos...</td></tr>
              ) : vehiculos.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay vehículos registrados en la base de datos.</td></tr>
              ) : (
                vehiculos.map(v => (
                  <tr key={v.id_vehiculo}>
                    <td style={{ fontWeight: '600', color: 'var(--primary)' }}>{v.numero_disco}</td>
                    <td>{v.placa}</td>
                    <td><span className="badge badge-warning">Línea {v.numero_linea}</span></td>
                    <td>{v.marca} {v.modelo}</td>
                    <td>{v.afiliados?.personas?.nombres} {v.afiliados?.personas?.paterno}</td>
                    <td>
                      <span className={`badge ${v.estado === 'Operativo' ? 'badge-success' : 'badge-danger'}`}>
                        {v.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem', marginRight: '0.5rem' }}><Edit size={16} /></button>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ef4444' }}><Trash2 size={16} /></button>
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
          <div className="auth-card animate-fade" style={{ maxWidth: '850px', width: '90%', padding: '2rem 2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Nuevo Vehículo</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Socio Propietario</label>
                <select name="id_afiliado" className="form-control" value={formData.id_afiliado} onChange={handleInputChange} required>
                  <option value="">Seleccione un socio...</option>
                  {listaAfiliados.map(af => (
                    <option key={af.id_afiliado} value={af.id_afiliado}>
                      {af.numero_afiliado} - {af.personas?.nombres} {af.personas?.paterno}
                    </option>
                  ))}
                </select>
              </div>

              <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Datos del Vehículo</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                <div className="form-group"><label className="form-label">N° Disco</label><input type="text" name="numero_disco" className="form-control" value={formData.numero_disco} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Placa</label><input type="text" name="placa" className="form-control" value={formData.placa} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Línea Operativa</label><input type="text" name="numero_linea" className="form-control" value={formData.numero_linea} onChange={handleInputChange} /></div>
                
                <div className="form-group"><label className="form-label">Marca</label><input type="text" name="marca" className="form-control" value={formData.marca} onChange={handleInputChange} /></div>
                <div className="form-group"><label className="form-label">Modelo</label><input type="text" name="modelo" className="form-control" value={formData.modelo} onChange={handleInputChange} /></div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select name="estado" className="form-control" value={formData.estado} onChange={handleInputChange}>
                    <option value="Operativo">Operativo</option>
                    <option value="En Mantenimiento">En Mantenimiento</option>
                    <option value="Fuera de Servicio">Fuera de Servicio</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Vehiculos;

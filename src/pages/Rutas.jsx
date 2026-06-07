import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, MapPin, Edit, Trash2, X } from 'lucide-react';

const Rutas = () => {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    numero_ruta: '', nombre_ruta: '', origen: '', destino: '', estado: 1
  });

  useEffect(() => {
    fetchRutas();
  }, []);

  const fetchRutas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rutas')
        .select('*');
      if (error) throw error;
      setRutas(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('rutas').insert([formData]);
      if (error) throw error;
      alert("Ruta registrada exitosamente");
      setShowModal(false);
      setFormData({ numero_ruta: '', nombre_ruta: '', origen: '', destino: '', estado: 1 });
      fetchRutas();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  return (
    <>
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">Rutas y Operaciones</h1>
            <p className="page-subtitle">Gestión de líneas, paradas y sorteos diarios.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <MapPin size={18} /> Registrar Ruta
          </button>
        </div>
      
        <div className="table-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="table-header">
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input type="text" className="form-control" placeholder="Buscar por número o nombre..." style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>N° Ruta</th>
                  <th>Nombre de la Ruta</th>
                  <th>Punto de Origen</th>
                  <th>Punto de Destino</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando rutas...</td></tr>
                ) : rutas.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay rutas registradas.</td></tr>
                ) : (
                  rutas.map(r => (
                    <tr key={r.id_ruta}>
                      <td style={{ fontWeight: '600', color: 'var(--primary)' }}>Línea {r.numero_ruta}</td>
                      <td style={{ fontWeight: '500' }}>{r.nombre_ruta}</td>
                      <td>{r.origen}</td>
                      <td>{r.destino}</td>
                      <td>
                        <span className={`badge ${r.estado === 1 ? 'badge-success' : 'badge-danger'}`}>
                          {r.estado === 1 ? 'Activa' : 'Inactiva'}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src="/logo-sindicato.jpg" alt="Logo Sindicato" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)' }} />
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Nueva Línea / Ruta</h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sindicato 15 de Junio - La Paz</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Detalles del Recorrido</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                <div className="form-group"><label className="form-label">Número de Ruta (Línea)</label><input type="text" name="numero_ruta" className="form-control" placeholder="Ej: 243" value={formData.numero_ruta} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Nombre Comercial</label><input type="text" name="nombre_ruta" className="form-control" placeholder="Ej: Ceja - Pérez" value={formData.nombre_ruta} onChange={handleInputChange} /></div>
                
                <div className="form-group"><label className="form-label">Punto de Partida (Origen)</label><input type="text" name="origen" className="form-control" placeholder="Ej: Parada 16 de Julio" value={formData.origen} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Punto de Destino</label><input type="text" name="destino" className="form-control" placeholder="Ej: Plaza Eguino" value={formData.destino} onChange={handleInputChange} required /></div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Registrar Ruta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Rutas;

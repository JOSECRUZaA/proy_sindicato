import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Calendar, Edit, Trash2, X } from 'lucide-react';

const Asambleas = () => {
  const [asambleas, setAsambleas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fecha: '', hora: '', tipo: 'Ordinaria', lugar: '', quorum_minimo: 50
  });

  useEffect(() => {
    fetchAsambleas();
  }, []);

  const fetchAsambleas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('asambleas').select('*').order('fecha', { ascending: false });
      if (error) throw error;
      setAsambleas(data || []);
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
      const { error } = await supabase.from('asambleas').insert([formData]);
      if (error) throw error;
      alert("Asamblea registrada exitosamente");
      setShowModal(false);
      setFormData({ fecha: '', hora: '', tipo: 'Ordinaria', lugar: '', quorum_minimo: 50 });
      fetchAsambleas();
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
  };

  return (
    <>
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">Asambleas Generales</h1>
            <p className="page-subtitle">Control de reuniones y asistencia de afiliados.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Calendar size={18} /> Programar Asamblea
          </button>
        </div>
      
        <div className="table-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="table-header">
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input type="text" className="form-control" placeholder="Buscar asambleas..." style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Tipo</th>
                  <th>Lugar</th>
                  <th>Quórum Mínimo</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando asambleas...</td></tr>
                ) : asambleas.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay asambleas registradas.</td></tr>
                ) : (
                  asambleas.map(a => (
                    <tr key={a.id_asamblea}>
                      <td style={{ fontWeight: '600' }}>{new Date(a.fecha).toLocaleDateString('es-BO')}</td>
                      <td>{a.hora}</td>
                      <td>
                        <span className={`badge ${a.tipo === 'Ordinaria' ? 'badge-warning' : a.tipo === 'Eleccionaria' ? 'badge-success' : 'badge-danger'}`}>
                          {a.tipo}
                        </span>
                      </td>
                      <td>{a.lugar}</td>
                      <td>{a.quorum_minimo} afiliados</td>
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
          <div className="auth-card animate-fade" style={{ maxWidth: '600px', width: '90%', padding: '2rem 2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Programar Nueva Asamblea</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                <div className="form-group"><label className="form-label">Fecha</label><input type="date" name="fecha" className="form-control" value={formData.fecha} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Hora</label><input type="time" name="hora" className="form-control" value={formData.hora} onChange={handleInputChange} required /></div>
                
                <div className="form-group">
                  <label className="form-label">Tipo de Asamblea</label>
                  <select name="tipo" className="form-control" value={formData.tipo} onChange={handleInputChange}>
                    <option value="Ordinaria">Ordinaria</option>
                    <option value="Extraordinaria">Extraordinaria</option>
                    <option value="Eleccionaria">Eleccionaria</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Quórum Mínimo</label><input type="number" name="quorum_minimo" className="form-control" value={formData.quorum_minimo} onChange={handleInputChange} required /></div>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Lugar del Evento</label>
                  <input type="text" name="lugar" className="form-control" placeholder="Sede Social, Auditorio, etc." value={formData.lugar} onChange={handleInputChange} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Guardar Asamblea</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Asambleas;

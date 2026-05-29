import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, UserPlus, Edit, Trash2, X, Shield } from 'lucide-react';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    nombres: '', paterno: '', ci: '', celular: '', id_rol: ''
  });

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id_usuario, estado, fecha_creacion,
          personas ( nombres, paterno, ci, celular ),
          roles ( nombre )
        `)
        .order('fecha_creacion', { ascending: false });
        
      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    const { data } = await supabase.from('roles').select('*');
    if (data) setRoles(data);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Crear persona primero
      const { data: personaData, error: personaError } = await supabase
        .from('personas')
        .insert([{
          nombres: formData.nombres,
          paterno: formData.paterno,
          ci: formData.ci,
          celular: formData.celular,
          estado: 1
        }])
        .select()
        .single();
        
      if (personaError) throw personaError;

      // 2. Crear registro de usuario (sin auth vinculado por ahora en modo admin)
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .insert([{
          id_persona: personaData.id_persona,
          id_rol: formData.id_rol,
          estado: 1
        }]);

      if (usuarioError) throw usuarioError;

      alert("Usuario registrado y asignado a su rol exitosamente.");
      setShowModal(false);
      setFormData({ nombres: '', paterno: '', ci: '', celular: '', id_rol: '' });
      fetchUsuarios();
    } catch (error) {
      alert("Error al guardar usuario: " + error.message);
    }
  };

  return (
    <>
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">Gestión de Usuarios</h1>
            <p className="page-subtitle">Administración de accesos y roles del sistema.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <UserPlus size={18} /> Nuevo Usuario
          </button>
        </div>
      
        <div className="table-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="table-header">
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input type="text" className="form-control" placeholder="Buscar por nombre o CI..." style={{ paddingLeft: '2.5rem' }} />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Cédula (CI)</th>
                  <th>Contacto</th>
                  <th>Rol de Acceso</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando usuarios...</td></tr>
                ) : usuarios.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay usuarios registrados.</td></tr>
                ) : (
                  usuarios.map(u => (
                    <tr key={u.id_usuario}>
                      <td style={{ fontWeight: '600' }}>{u.personas?.nombres} {u.personas?.paterno}</td>
                      <td>{u.personas?.ci}</td>
                      <td>{u.personas?.celular || 'No registrado'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Shield size={14} color="var(--primary)" />
                          <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{u.roles?.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.estado === 1 ? 'badge-success' : 'badge-danger'}`}>
                          {u.estado === 1 ? 'Activo' : 'Inactivo'}
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
          <div className="auth-card animate-fade" style={{ maxWidth: '600px', width: '90%', padding: '2rem 2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Crear Nuevo Usuario</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Datos Personales</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group"><label className="form-label">Nombres</label><input type="text" name="nombres" className="form-control" value={formData.nombres} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Apellido Paterno</label><input type="text" name="paterno" className="form-control" value={formData.paterno} onChange={handleInputChange} required /></div>
                
                <div className="form-group"><label className="form-label">Cédula de Identidad</label><input type="text" name="ci" className="form-control" value={formData.ci} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">N° de Celular</label><input type="text" name="celular" className="form-control" value={formData.celular} onChange={handleInputChange} /></div>
              </div>

              <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Permisos y Acceso</h4>
              <div className="form-group">
                <label className="form-label">Rol del Sistema</label>
                <select name="id_rol" className="form-control" value={formData.id_rol} onChange={handleInputChange} required>
                  <option value="">Seleccione el nivel de acceso...</option>
                  {roles.map(r => (
                    <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>*La tabla centraliza el padrón de usuarios administrativos (Secretarios, Tesorero, Administrador).</p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Registrar Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Usuarios;

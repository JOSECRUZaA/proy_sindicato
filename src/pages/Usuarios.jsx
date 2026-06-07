import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, UserPlus, Edit, Trash2, X, Shield, ShieldAlert, Key } from 'lucide-react';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    id_perfil: '',
    nombres: '',
    paterno: '',
    ci: '',
    correo: '',
    celular: '',
    rol: '',
    estado: '1' // '1' = Activo, '0' = Inactivo
  });

  const roles = ['Administrador', 'Secretario', 'Tesorero', 'Consulta', 'Controlador'];

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      // Solo traemos los que son usuarios administrativos (roles distintos a Afiliado, a menos que queramos verlos a todos)
      // Para simplificar, traemos todos y filtramos en frontend, o filtramos en DB.
      const { data, error } = await supabase
        .from('perfiles')
        .select(`
          id_perfil, estado, fecha_registro, nombres, paterno, ci, correo, celular, rol
        `)
        .order('fecha_registro', { ascending: false });
        
      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error("Error al cargar perfiles:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id_perfil: '',
      nombres: '',
      paterno: '',
      ci: '',
      correo: '',
      celular: '',
      rol: '',
      estado: '1'
    });
    setIsEditing(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const { error } = await supabase
          .from('perfiles')
          .update({
            nombres: formData.nombres,
            paterno: formData.paterno,
            ci: formData.ci,
            correo: formData.correo,
            celular: formData.celular,
            rol: formData.rol,
            estado: parseInt(formData.estado)
          })
          .eq('id_perfil', formData.id_perfil);

        if (error) throw error;
        alert("Usuario administrativo actualizado correctamente.");
      } else {
        // Verificar CI
        const { data: exist } = await supabase
          .from('perfiles')
          .select('id_perfil')
          .eq('ci', formData.ci)
          .maybeSingle();

        if (exist) {
          throw new Error("Esta persona (C.I. duplicado) ya tiene un perfil en el sistema.");
        }

        const { error } = await supabase
          .from('perfiles')
          .insert([{
            nombres: formData.nombres,
            paterno: formData.paterno,
            ci: formData.ci,
            correo: formData.correo,
            celular: formData.celular,
            rol: formData.rol,
            estado: 1
          }]);

        if (error) throw error;
        alert("Usuario administrativo registrado con éxito.");
      }

      setShowModal(false);
      resetForm();
      fetchUsuarios();
    } catch (error) {
      alert("Error al guardar usuario: " + error.message);
    }
  };

  const handleEditClick = (u) => {
    setFormData({
      id_perfil: u.id_perfil,
      nombres: u.nombres || '',
      paterno: u.paterno || '',
      ci: u.ci || '',
      correo: u.correo || '',
      celular: u.celular || '',
      rol: u.rol || '',
      estado: u.estado.toString()
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = async (idPerfil) => {
    if (!window.confirm("¿Está seguro de revocar el acceso a este perfil?")) return;
    try {
      const { error } = await supabase
        .from('perfiles')
        .delete()
        .eq('id_perfil', idPerfil);

      if (error) throw error;
      alert("Acceso revocado exitosamente.");
      fetchUsuarios();
    } catch (err) {
      alert("Error al revocar acceso: " + err.message);
    }
  };

  const filteredUsuarios = usuarios.filter(u => 
    (u.nombres && u.nombres.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.paterno && u.paterno.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.ci && u.ci.includes(searchTerm)) ||
    (u.rol && u.rol.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleBadgeClass = (roleName) => {
    if (!roleName) return 'badge-secondary';
    const name = roleName.toLowerCase();
    if (name.includes('admin')) return 'badge-danger';
    if (name.includes('secret')) return 'badge-warning';
    if (name.includes('tesor')) return 'badge-success';
    if (name.includes('control')) return 'badge-warning';
    return 'badge-secondary';
  };

  return (
    <>
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="page-title">Gestión de Usuarios</h1>
            <p className="page-subtitle">Administración completa de perfiles, roles y accesos institucionales del sistema.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <UserPlus size={18} /> Nuevo Usuario
          </button>
        </div>
      
        <div className="table-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="table-header">
            <div style={{ position: 'relative', width: '350px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="Buscar por nombre, CI o rol..." 
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
                  <th>Nombre Completo</th>
                  <th>Cédula (CI)</th>
                  <th>Correo</th>
                  <th>Contacto</th>
                  <th>Rol de Acceso</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos de perfiles...</td></tr>
                ) : filteredUsuarios.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No se encontraron usuarios.</td></tr>
                ) : (
                  filteredUsuarios.map(u => (
                    <tr key={u.id_perfil}>
                      <td style={{ fontWeight: '600' }}>{u.nombres} {u.paterno}</td>
                      <td style={{ fontWeight: '500' }}>{u.ci}</td>
                      <td>{u.correo || <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>No registrado</span>}</td>
                      <td>{u.celular || <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>No registrado</span>}</td>
                      <td>
                        <span className={`badge ${getRoleBadgeClass(u.rol)}`} style={{ gap: '0.25rem', display: 'inline-flex', alignItems: 'center' }}>
                          <Shield size={12} />
                          {u.rol || 'Consulta'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.estado === 1 ? 'badge-success' : 'badge-danger'}`}>
                          {u.estado === 1 ? 'Activo' : 'Suspendido'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem', marginRight: '0.5rem' }}
                          title="Editar Perfil / Rol"
                          onClick={() => handleEditClick(u)}
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.4rem', color: '#ef4444' }}
                          title="Revocar Acceso"
                          onClick={() => handleDeleteClick(u.id_perfil)}
                        >
                          <Trash2 size={16} />
                        </button>
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
          <div className="auth-card animate-fade" style={{ maxWidth: '650px', width: '90%', padding: '2rem 2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src="/logo-sindicato.jpg" alt="Logo Sindicato" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)' }} />
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{isEditing ? 'Editar Perfil' : 'Crear Nuevo Perfil'}</h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sindicato 15 de Junio - La Paz</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Datos Personales</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group"><label className="form-label">Nombres</label><input type="text" name="nombres" className="form-control" value={formData.nombres} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Apellido Paterno</label><input type="text" name="paterno" className="form-control" value={formData.paterno} onChange={handleInputChange} required /></div>
                
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Cédula de Identidad</label><input type="text" name="ci" className="form-control" value={formData.ci} onChange={handleInputChange} required disabled={isEditing} style={{ opacity: isEditing ? 0.7 : 1 }} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Correo Electrónico</label><input type="email" name="correo" className="form-control" value={formData.correo} onChange={handleInputChange} placeholder="ejemplo@sindicato.org" /></div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">N° de Celular</label><input type="text" name="celular" className="form-control" value={formData.celular} onChange={handleInputChange} /></div>
              </div>

              <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Configuración de Permisos y Acceso</h4>
              <div style={{ display: 'grid', gridTemplateColumns: isEditing ? '2fr 1fr' : '1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Rol del Sistema</label>
                  <select name="rol" className="form-control" value={formData.rol} onChange={handleInputChange} required>
                    <option value="">Seleccione el nivel de acceso...</option>
                    {roles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                {isEditing && (
                  <div className="form-group">
                    <label className="form-label">Estado de Acceso</label>
                    <select name="estado" className="form-control" value={formData.estado} onChange={handleInputChange}>
                      <option value="1">Activo</option>
                      <option value="0">Suspendido</option>
                    </select>
                  </div>
                )}
              </div>

              {isEditing && formData.estado === '0' && (
                <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  <ShieldAlert size={16} />
                  <span>El usuario se encuentra **Suspendido** y no podrá iniciar sesión en la plataforma.</span>
                </div>
              )}

              {!isEditing && (
                <div style={{ background: 'var(--primary-light)', border: '1px solid #dbeafe', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--primary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  <Key size={16} />
                  <span>Este proceso crea el perfil y rol local. El usuario podrá autovincularse ingresando al sistema.</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>{isEditing ? 'Guardar Cambios' : 'Registrar Usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Usuarios;

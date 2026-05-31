import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, UserPlus, Edit, Trash2, X, Shield, ShieldAlert, Key } from 'lucide-react';

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    id_usuario: '',
    id_persona: '',
    nombres: '',
    paterno: '',
    ci: '',
    celular: '',
    id_rol: '',
    estado: '1' // '1' = Activo, '0' = Inactivo
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
          id_usuario, estado, fecha_creacion, id_persona, id_rol,
          personas ( id_persona, nombres, paterno, ci, celular ),
          roles ( id_rol, nombre )
        `)
        .order('fecha_creacion', { ascending: false });
        
      if (error) throw error;
      setUsuarios(data || []);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase.from('roles').select('*');
      if (!error && data && data.length > 0) {
        setRoles(data);
      } else {
        // Fallback robusto en la UI en caso de que la tabla roles esté vacía o RLS restrinja el acceso anon
        setRoles([
          { id_rol: 1, nombre: 'Administrador' },
          { id_rol: 2, nombre: 'Secretario' },
          { id_rol: 3, nombre: 'Tesorero' },
          { id_rol: 4, nombre: 'Consulta' },
          { id_rol: 5, nombre: 'Controlador' }
        ]);
      }
    } catch (e) {
      setRoles([
        { id_rol: 1, nombre: 'Administrador' },
        { id_rol: 2, nombre: 'Secretario' },
        { id_rol: 3, nombre: 'Tesorero' },
        { id_rol: 4, nombre: 'Consulta' },
        { id_rol: 5, nombre: 'Controlador' }
      ]);
    }
  };

  const resetForm = () => {
    setFormData({
      id_usuario: '',
      id_persona: '',
      nombres: '',
      paterno: '',
      ci: '',
      celular: '',
      id_rol: '',
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
        // MODO EDICIÓN
        // 1. Actualizar datos de la persona
        const { error: personaError } = await supabase
          .from('personas')
          .update({
            nombres: formData.nombres,
            paterno: formData.paterno,
            ci: formData.ci,
            celular: formData.celular
          })
          .eq('id_persona', formData.id_persona);

        if (personaError) throw personaError;

        // 2. Actualizar datos del usuario (Rol y Estado)
        const { error: usuarioError } = await supabase
          .from('usuarios')
          .update({
            id_rol: formData.id_rol,
            estado: parseInt(formData.estado)
          })
          .eq('id_usuario', formData.id_usuario);

        if (usuarioError) throw usuarioError;

        alert("Usuario administrativo actualizado correctamente.");
      } else {
        // MODO REGISTRO (Mantiene la lógica inteligente de CI duplicados)
        let personaId = null;

        // 1. Buscar si la persona ya existe por C.I.
        const { data: existingPersona, error: searchError } = await supabase
          .from('personas')
          .select('id_persona')
          .eq('ci', formData.ci)
          .maybeSingle();

        if (searchError) throw searchError;

        if (existingPersona) {
          personaId = existingPersona.id_persona;

          // Verificar si esta persona ya tiene un usuario en el sistema
          const { data: existingUser, error: userCheckError } = await supabase
            .from('usuarios')
            .select('id_usuario')
            .eq('id_persona', personaId)
            .maybeSingle();

          if (userCheckError) throw userCheckError;

          if (existingUser) {
            throw new Error("Esta persona (C.I. duplicado) ya tiene un usuario administrativo asignado en el sistema.");
          }
        } else {
          // 2. Crear persona si no existe en el padrón
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
          personaId = personaData.id_persona;
        }

        // 3. Crear registro de usuario vinculándolo al id_persona (existente o nuevo)
        const { error: usuarioError } = await supabase
          .from('usuarios')
          .insert([{
            id_persona: personaId,
            id_rol: formData.id_rol,
            estado: 1
          }]);

        if (usuarioError) throw usuarioError;

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
      id_usuario: u.id_usuario,
      id_persona: u.personas?.id_persona || '',
      nombres: u.personas?.nombres || '',
      paterno: u.personas?.paterno || '',
      ci: u.personas?.ci || '',
      celular: u.personas?.celular || '',
      id_rol: u.id_rol || '',
      estado: u.estado.toString()
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = async (idUsuario) => {
    if (!window.confirm("¿Está seguro de revocar el acceso administrativo a este usuario? Los registros históricos y de auditoría se mantendrán intactos.")) return;
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id_usuario', idUsuario);

      if (error) throw error;
      alert("Acceso revocado exitosamente.");
      fetchUsuarios();
    } catch (err) {
      alert("Error al revocar acceso: " + err.message);
    }
  };

  // Filtrado de usuarios por término de búsqueda
  const filteredUsuarios = usuarios.filter(u => 
    (u.personas?.nombres && u.personas.nombres.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.personas?.paterno && u.personas.paterno.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.personas?.ci && u.personas.ci.includes(searchTerm)) ||
    (u.roles?.nombre && u.roles.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleBadgeClass = (roleName) => {
    if (!roleName) return 'badge-secondary';
    const name = roleName.toLowerCase();
    if (name.includes('admin')) return 'badge-danger'; // Red
    if (name.includes('secret')) return 'badge-warning'; // Yellow
    if (name.includes('tesor')) return 'badge-success';  // Green/Emerald
    if (name.includes('control')) return 'badge-warning'; // Orange/Yellow
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
                  <th>Contacto</th>
                  <th>Rol de Acceso</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos de usuarios...</td></tr>
                ) : filteredUsuarios.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No se encontraron usuarios.</td></tr>
                ) : (
                  filteredUsuarios.map(u => (
                    <tr key={u.id_usuario}>
                      <td style={{ fontWeight: '600' }}>{u.personas?.nombres} {u.personas?.paterno}</td>
                      <td style={{ fontWeight: '500' }}>{u.personas?.ci}</td>
                      <td>{u.personas?.celular || <span style={{ color: 'var(--text-light)', fontStyle: 'italic', fontSize: '0.85rem' }}>No registrado</span>}</td>
                      <td>
                        <span className={`badge ${getRoleBadgeClass(u.roles?.nombre)}`} style={{ gap: '0.25rem', display: 'inline-flex', alignItems: 'center' }}>
                          <Shield size={12} />
                          {u.roles?.nombre || 'Consulta'}
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
                          onClick={() => handleDeleteClick(u.id_usuario)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>{isEditing ? 'Editar Perfil de Acceso' : 'Crear Nuevo Acceso Administrativo'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Datos Personales</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div className="form-group"><label className="form-label">Nombres</label><input type="text" name="nombres" className="form-control" value={formData.nombres} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Apellido Paterno</label><input type="text" name="paterno" className="form-control" value={formData.paterno} onChange={handleInputChange} required /></div>
                
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Cédula de Identidad</label><input type="text" name="ci" className="form-control" value={formData.ci} onChange={handleInputChange} required disabled={isEditing} style={{ opacity: isEditing ? 0.7 : 1 }} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">N° de Celular</label><input type="text" name="celular" className="form-control" value={formData.celular} onChange={handleInputChange} /></div>
              </div>

              <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Configuración de Permisos y Acceso</h4>
              <div style={{ display: 'grid', gridTemplateColumns: isEditing ? '2fr 1fr' : '1fr', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Rol del Sistema</label>
                  <select name="id_rol" className="form-control" value={formData.id_rol} onChange={handleInputChange} required>
                    <option value="">Seleccione el nivel de acceso...</option>
                    {roles.map(r => (
                      <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
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

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, UserPlus, Edit, Trash2, X } from 'lucide-react';

const Afiliados = () => {
  const [afiliados, setAfiliados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombres: '', paterno: '', materno: '', ci: '', celular: '',
    numero_afiliado: '', tipo_afiliado: 'Socio Propietario'
  });

  useEffect(() => {
    fetchAfiliados();
  }, []);

  const fetchAfiliados = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('perfiles')
        .select(`
          id_perfil,
          numero_afiliado,
          tipo_afiliado,
          estado_organico,
          fecha_ingreso,
          nombres,
          paterno,
          materno,
          ci,
          celular
        `)
        .not('numero_afiliado', 'is', null)
        .order('numero_afiliado', { ascending: true });

      if (error) throw error;
      setAfiliados(data || []);
    } catch (error) {
      console.error("Error cargando afiliados:", error.message);
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
      // Verificar si ya existe el CI en perfiles
      const { data: exist } = await supabase
        .from('perfiles')
        .select('id_perfil, numero_afiliado')
        .eq('ci', formData.ci)
        .maybeSingle();

      if (exist) {
        if (exist.numero_afiliado) {
          throw new Error("Esta persona (C.I. duplicado) ya está registrada como afiliado.");
        }
        // Si existe pero no es afiliado (ej. es admin), lo actualizamos
        const { error: updateError } = await supabase
          .from('perfiles')
          .update({
            numero_afiliado: formData.numero_afiliado,
            tipo_afiliado: formData.tipo_afiliado,
            fecha_ingreso: new Date().toISOString().split('T')[0],
            estado_organico: 'Activo'
          })
          .eq('id_perfil', exist.id_perfil);

        if (updateError) throw updateError;
      } else {
        // Insertar nuevo perfil de afiliado
        const { error: insertError } = await supabase
          .from('perfiles')
          .insert([{
            nombres: formData.nombres,
            paterno: formData.paterno,
            materno: formData.materno,
            ci: formData.ci,
            celular: formData.celular,
            rol: 'Afiliado', // Por defecto
            estado: 1,
            numero_afiliado: formData.numero_afiliado,
            tipo_afiliado: formData.tipo_afiliado,
            fecha_ingreso: new Date().toISOString().split('T')[0],
            estado_organico: 'Activo'
          }]);

        if (insertError) throw insertError;
      }

      alert("Afiliado registrado exitosamente");
      setShowModal(false);
      setFormData({ nombres: '', paterno: '', materno: '', ci: '', celular: '', numero_afiliado: '', tipo_afiliado: 'Socio Propietario' });
      fetchAfiliados();
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar: " + error.message);
    }
  };

  const filteredAfiliados = afiliados.filter(af => 
    (af.nombres?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false) || 
    (af.paterno?.toLowerCase()?.includes(searchTerm.toLowerCase()) ?? false) || 
    (af.numero_afiliado?.includes(searchTerm) ?? false)
  );

  return (
    <>
      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="section-title" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Padrón de Afiliados</h1>
          <p className="section-subtitle" style={{ fontSize: '0.95rem' }}>Gestiona los socios y choferes del sindicato.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <UserPlus size={18} /> Nuevo Afiliado
        </button>
      </div>

      <div className="feature-card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar por nombre o número..." 
              style={{ paddingLeft: '2.5rem' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>N° Afiliado</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>Nombre Completo</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>C.I.</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>Tipo</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>Estado</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: '500', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos...</td></tr>
              ) : filteredAfiliados.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay afiliados registrados.</td></tr>
              ) : (
                filteredAfiliados.map((afiliado) => (
                  <tr key={afiliado.id_perfil} style={{ borderBottom: '1px solid var(--bg-subtle)' }}>
                    <td style={{ padding: '1rem 0.5rem', fontWeight: '600' }}>{afiliado.numero_afiliado}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      {afiliado.nombres} {afiliado.paterno} {afiliado.materno}
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>{afiliado.ci}</td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ 
                        background: afiliado.tipo_afiliado === 'Socio Propietario' ? 'var(--primary-light)' : '#f1f5f9', 
                        color: afiliado.tipo_afiliado === 'Socio Propietario' ? 'var(--primary)' : 'var(--text-muted)',
                        padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: '500'
                      }}>
                        {afiliado.tipo_afiliado}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ color: afiliado.estado_organico === 'Activo' ? 'var(--accent)' : '#ef4444', fontWeight: '500' }}>
                        {afiliado.estado_organico}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
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
          <div className="auth-card animate-fade" style={{ maxWidth: '850px', width: '90%', padding: '2rem 2.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src="/logo-sindicato.jpg" alt="Logo Sindicato" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)' }} />
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Registrar Nuevo Afiliado</h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sindicato 15 de Junio - La Paz</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <h4 style={{ marginBottom: '1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Datos Personales</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                <div className="form-group"><label className="form-label">Nombres</label><input type="text" name="nombres" className="form-control" value={formData.nombres} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Apellido Paterno</label><input type="text" name="paterno" className="form-control" value={formData.paterno} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Apellido Materno</label><input type="text" name="materno" className="form-control" value={formData.materno} onChange={handleInputChange} /></div>
                
                <div className="form-group"><label className="form-label">Cédula de Identidad</label><input type="text" name="ci" className="form-control" value={formData.ci} onChange={handleInputChange} required /></div>
                <div className="form-group"><label className="form-label">Celular</label><input type="text" name="celular" className="form-control" value={formData.celular} onChange={handleInputChange} /></div>
              </div>

              <h4 style={{ margin: '2rem 0 1.25rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary-light)', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>Datos Sindicales</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                <div className="form-group"><label className="form-label">Número de Afiliado</label><input type="text" name="numero_afiliado" className="form-control" placeholder="Ej: AF-001" value={formData.numero_afiliado} onChange={handleInputChange} required /></div>
                <div className="form-group">
                  <label className="form-label">Tipo de Afiliado</label>
                  <select name="tipo_afiliado" className="form-control" value={formData.tipo_afiliado} onChange={handleInputChange}>
                    <option value="Socio Propietario">Socio Propietario</option>
                    <option value="Chofer Asalariado">Chofer Asalariado</option>
                    <option value="Relevo">Relevo</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Guardar Afiliado</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Afiliados;

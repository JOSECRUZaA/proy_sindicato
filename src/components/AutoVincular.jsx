import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, Key, ArrowRight } from 'lucide-react';

const AutoVincular = () => {
  const { user } = useAuth();
  const [ci, setCi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleVincular = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user) throw new Error("No hay sesión activa de Supabase Auth.");

      // 1. Buscar el perfil por CI
      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('id_perfil, auth_user_id, estado, nombres, paterno')
        .eq('ci', ci.trim())
        .single();

      if (perfilError || !perfil) {
        throw new Error("No se encontró ningún perfil registrado con esa Cédula de Identidad (CI).");
      }

      if (perfil.estado === 0) {
        throw new Error("Su acceso al sistema se encuentra suspendido. Contacte a la directiva.");
      }

      // 2. Verificar si ya está vinculado a otra cuenta
      if (perfil.auth_user_id && perfil.auth_user_id !== user.id) {
        throw new Error("Este perfil ya se encuentra vinculado a otro correo electrónico. Si cree que es un error, contacte a soporte.");
      }

      if (perfil.auth_user_id === user.id) {
        throw new Error("Su cuenta ya está vinculada correctamente. Recargue la página.");
      }

      // 3. Realizar la vinculación
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ auth_user_id: user.id })
        .eq('id_perfil', perfil.id_perfil);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-body)' }}>
      <div className="auth-card animate-fade" style={{ maxWidth: '500px', width: '90%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--primary)' }}>
            <Key size={32} />
          </div>
          <h2 style={{ marginBottom: '0.5rem', color: 'var(--secondary)' }}>Vincular Cuenta</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Tu correo ha sido verificado, pero necesitamos vincularlo con tu perfil institucional del Sindicato.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.85rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #dcfce3', color: '#166534', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
            <ShieldCheck size={48} style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem' }}>¡Vinculación Exitosa!</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Redirigiendo a tu panel...</p>
          </div>
        ) : (
          <form onSubmit={handleVincular}>
            <div className="form-group">
              <label className="form-label">Cédula de Identidad (CI)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Ej. 9999901" 
                value={ci}
                onChange={(e) => setCi(e.target.value)}
                required
                autoFocus
              />
              <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-light)', fontSize: '0.8rem' }}>
                Ingresa el C.I. que la directiva registró al darte de alta en el sistema.
              </small>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} disabled={loading || !ci}>
              {loading ? 'Vinculando...' : 'Vincular y Continuar'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-light)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}>
            Cerrar sesión y usar otra cuenta
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoVincular;

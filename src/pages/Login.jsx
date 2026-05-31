import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarFront, KeyRound, Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { user, profile } = useAuth();

  const isEnvConfigured = true; // Respaldo inyectado de forma segura en supabase.js

  // Redirigir al dashboard específico una vez que se cargue el usuario Y su perfil
  React.useEffect(() => {
    if (user && profile) {
      const userRol = profile.rol || '';
      if (userRol === 'Controlador') {
        navigate('/dashboard/controlador', { replace: true });
      } else if (userRol === 'Afiliado' || userRol === 'Consulta') {
        navigate('/dashboard/mi-panel', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!isEnvConfigured) {
      alert("No se puede iniciar sesión: Las variables de entorno de Supabase no están configuradas en el servidor.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Timeout promise for Supabase login (just in case network drops or hangs)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifique su conexión.')), 15000)
      );

      const loginPromise = supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

      if (error) throw error;
      
      // No navegamos aquí manualmente.
      // El useEffect de arriba detectará que 'user' y 'profile' ya están listos
      // y hará la redirección limpia hacia la ruta exacta sin parpadeos.
    } catch (err) {
      console.error('Error de login:', err);
      setError(err.message === 'Invalid login credentials' 
        ? 'Credenciales incorrectas. Intente nuevamente.' 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isEnvConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });
      if (error) throw error;
      alert("¡Usuario de prueba creado! Ahora puedes iniciar sesión.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout animate-fade">
      <div className="auth-content">
        <div className="auth-card">
          <button 
            onClick={() => navigate('/')} 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', marginBottom: '2rem', border: 'none' }}
          >
            <ArrowLeft size={20} /> Volver
          </button>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <CarFront size={28} />
            </div>
            <h2>Bienvenido de Nuevo</h2>
            <p style={{ color: 'var(--text-muted)' }}>Ingresa a tu cuenta institucional</p>
          </div>

          {!isEnvConfigured && (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: '1.5', textAlign: 'left' }}>
              <strong>⚠️ Variables de Entorno Faltantes en Vercel:</strong><br />
              No se han detectado las credenciales de Supabase en este despliegue. Por favor ve a tu consola de <strong>Vercel / Settings / Environment Variables</strong> y agrega:
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                <li><code>VITE_SUPABASE_URL</code></li>
                <li><code>VITE_SUPABASE_ANON_KEY</code></li>
              </ul>
              Luego, realiza un **Redeploy** de la aplicación.
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="email" 
                  className="form-control" 
                  placeholder="usuario@sindicato.org" 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="••••••••" 
                  style={{ paddingLeft: '2.5rem' }} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={handleRegister} className="btn btn-secondary" style={{ flex: 1 }} disabled={loading || !email || !password}>
                Crear Prueba
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
          
          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            ¿No tienes cuenta? <a href="#" style={{ color: 'var(--primary)', fontWeight: '600' }}>Solicitar acceso en secretaría</a>
          </div>
        </div>
      </div>
      
      <div className="auth-sidebar">
        <h1 style={{ fontSize: '3rem', color: 'white', marginBottom: '1.5rem' }}>Portal SindiAuto</h1>
        <p style={{ fontSize: '1.25rem', color: '#94a3b8', maxWidth: '400px' }}>
          Plataforma centralizada para directiva, operadores y afiliados. 
          Desarrollado con altos estándares de seguridad en la nube (Supabase).
        </p>
      </div>
    </div>
  );
};

export default Login;

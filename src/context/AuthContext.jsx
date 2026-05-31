import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [errorLog, setErrorLog] = useState('');

  useEffect(() => {
    let isMounted = true;
    let fallbackTimer = null;
    
    // Timeout de seguridad: Si pasan 20 segundos y sigue cargando, liberar la pantalla de carga de forma segura
    fallbackTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('Timeout de seguridad de 20s alcanzado. Liberando pantalla sin borrar sesión...');
        setErrorLog('El servidor de base de datos tardó más de lo esperado en responder.');
        setLoading(false);
      }
    }, 20000);

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setErrorLog('Error en getSession: ' + err.message);
          setLoading(false);
        }
      } finally {
        if (isMounted && fallbackTimer) {
          clearTimeout(fallbackTimer);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (authId) => {
    try {
      // Obtenemos los datos del usuario, la persona y el rol
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id_usuario,
          estado,
          id_persona,
          personas ( id_persona, nombres, paterno, materno, ci, fotografia ),
          roles ( nombre )
        `)
        .eq('auth_user_id', authId)
        .single();

      if (!error && data) {
        setProfile({
          id: data.id_usuario,
          idPersona: data.id_persona,
          ci: data.personas.ci,
          nombreCompleto: `${data.personas.nombres} ${data.personas.paterno}`,
          rol: data.roles.nombre,
          foto: data.personas.fotografia
        });
      } else {
        // Si no tiene perfil aún (usuario de prueba sin completar), le damos un rol por defecto para pruebas
        setProfile({
          id: 0,
          idPersona: 0,
          nombreCompleto: "Usuario de Prueba",
          rol: "Administrador (Por defecto)"
        });
      }
    } catch (err) {
      setErrorLog('Error en fetchProfile: ' + err.message);
      // Fallback
      setProfile({
        id: 0,
        nombreCompleto: "Usuario sin Perfil",
        rol: "Solo Lectura"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-body)' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--primary-light)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Conectando con Supabase...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

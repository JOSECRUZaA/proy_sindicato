import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user,     setUser]     = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [errorLog, setErrorLog] = useState('');

  const mountedRef  = useRef(true);
  const fetchingRef = useRef(false);

  // ── Obtener perfil ────────────────────────────────────────────────────────
  const fetchProfile = async (authUser) => {
    if (!authUser || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Consulta directa sin timeout artificial — la conexión es la real
      const { data, error } = await supabase
        .from('perfiles')
        .select('id_perfil, nombres, paterno, ci, fotografia, rol')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (data) {
        setProfile({
          id:             data.id_perfil,
          ci:             data.ci,
          nombreCompleto: `${data.nombres} ${data.paterno}`.trim(),
          rol:            data.rol,
          foto:           data.fotografia,
        });
        return; // éxito
      }

      // Fallback: buscar por correo
      if (authUser.email) {
        const { data: byEmail } = await supabase
          .from('perfiles')
          .select('id_perfil, nombres, paterno, ci, fotografia, rol')
          .eq('correo', authUser.email)
          .maybeSingle();

        if (!mountedRef.current) return;

        if (byEmail) {
          // Auto-vincular
          await supabase
            .from('perfiles')
            .update({ auth_user_id: authUser.id })
            .eq('id_perfil', byEmail.id_perfil);

          setProfile({
            id:             byEmail.id_perfil,
            ci:             byEmail.ci,
            nombreCompleto: `${byEmail.nombres} ${byEmail.paterno}`.trim(),
            rol:            byEmail.rol,
            foto:           byEmail.fotografia,
          });
          return;
        }
      }

      // Sin perfil
      setProfile(null);
      setErrorLog('No se encontró un perfil para este usuario.');
    } catch (err) {
      console.error('fetchProfile error:', err.message);
      if (mountedRef.current) {
        setProfile(null);
        setErrorLog(err.message);
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  // ── Inicialización ────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // Timeout de seguridad global: si en 15s no resolvió, cerrar sesión y al login
    const safetyTimer = setTimeout(async () => {
      if (!mountedRef.current) return;
      console.warn('AuthContext: timeout global, cerrando sesión corrupta');
      fetchingRef.current = false;
      await supabase.auth.signOut();
      if (mountedRef.current) setLoading(false);
    }, 15000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        // INITIAL_SESSION: el estado inicial al cargar
        if (event === 'INITIAL_SESSION') {
          clearTimeout(safetyTimer);

          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user);
          } else {
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        // SIGNED_IN: cuando el usuario inicia sesión
        if (event === 'SIGNED_IN') {
          clearTimeout(safetyTimer);
          setUser(session.user);
          fetchingRef.current = false;
          setLoading(true);
          await fetchProfile(session.user);
          return;
        }

        // SIGNED_OUT: cuando cierra sesión
        if (event === 'SIGNED_OUT') {
          clearTimeout(safetyTimer);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // TOKEN_REFRESHED: el token se renovó, no necesitamos hacer nada más
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
          return;
        }
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pantalla de carga ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', justifyContent: 'center', alignItems: 'center',
        background: 'var(--bg-body, #0f172a)'
      }}>
        <div style={{
          width: '44px', height: '44px',
          border: '4px solid rgba(99,102,241,.25)',
          borderTop: '4px solid #6366f1',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite',
          marginBottom: '1.2rem'
        }} />
        <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Iniciando sistema…</p>
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, errorLog }}>
      {children}
    </AuthContext.Provider>
  );
};

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);
export const userName = user => [user?.nombres, user?.apellidos].filter(Boolean).join(' ') || user?.correo || 'Usuario';
export const isManager = user => ['ADMINISTRADOR', 'SUPERVISOR'].includes(user?.rol);
export const homeFor = user => ['CLIENTE', 'EMPLEADO'].includes(user?.rol) ? '/mis-solicitudes' : user?.rol === 'TECNICO' ? '/atencion' : user?.rol === 'ADMINISTRADOR' ? '/usuarios' : '/dashboard';
export const roleLabel = role => ({ CLIENTE: 'Cliente externo', EMPLEADO: 'Empleado interno', TECNICO: 'Agente de soporte', SUPERVISOR: 'Supervisor', ADMINISTRADOR: 'Administrador' }[role] || role);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  function login(value) {
    if (!value?.idUsuario || !['ADMINISTRADOR', 'SUPERVISOR', 'TECNICO', 'EMPLEADO', 'CLIENTE'].includes(value.rol)) throw new Error('La respuesta no contiene un usuario válido.');
    setUser(value); setError('');
  }
  const refresh = useCallback(async signal => {
    setLoading(true); setError('');
    try { const result = await api.me(signal); if (!signal?.aborted) login(result.usuario); }
    catch (err) { if (!signal?.aborted) { setUser(null); if (err.status !== 401) setError(err.message); } }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    // Se descartan las sesiones visuales antiguas: la identidad solo procede de /auth/me.
    sessionStorage.removeItem('a365_session');
    ['a365_user', 'a365_cliente_session', 'a365_login_alert'].forEach(key => localStorage.removeItem(key));
    const controller = new AbortController(); refresh(controller.signal);
    const expired = () => { setUser(null); setError(''); };
    window.addEventListener('a365:session-expired', expired);
    return () => { controller.abort(); window.removeEventListener('a365:session-expired', expired); };
  }, [refresh]);
  async function logout() { await api.logout(); setUser(null); setError(''); }
  return <AuthContext.Provider value={{ user, loading, error, refresh: () => refresh(), login, logout, updateUser: login }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);

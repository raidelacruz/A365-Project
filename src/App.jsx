import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { homeFor, isManager, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Login, Recover, Register, Portal } from './pages/Auth.jsx';
import Tickets from './pages/Tickets.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Incidents from './pages/Incidents.jsx';
import Users from './pages/Users.jsx';
import { Profile, Settings } from './pages/Account.jsx';
import Reports from './pages/Reports.jsx';
import Clients from './pages/Clients.jsx';
import { Empty, Loading, ErrorBox } from './components/UI.jsx';

function Guard({ children, allow }) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (error) return <div className="page-content"><ErrorBox message={error} retry={refresh} /></div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (allow && !allow(user)) return <Navigate to={homeFor(user)} replace />;
  return children;
}
function OldHome() { const { user } = useAuth(); return <Navigate to={user ? homeFor(user) : '/'} replace />; }
export default function App() {
  const location = useLocation();
  useEffect(() => { document.title = 'IMPULSA A365 · Mesa de ayuda'; window.scrollTo?.(0, 0); }, [location.pathname]);
  const staff = user => ['ADMINISTRADOR', 'SUPERVISOR', 'TECNICO'].includes(user.rol);
  return <Routes>
    <Route path="/" element={<Portal />} />
    <Route path="/login" element={<Login />} />
    <Route path="/registro" element={<Register />} />
    <Route path="/recuperar-clave" element={<Recover />} />
    <Route element={<Guard><Layout /></Guard>}>
      <Route path="/dashboard" element={<Guard allow={isManager}><Dashboard /></Guard>} />
      <Route path="/tickets" element={<Guard allow={isManager}><Tickets /></Guard>} />
      <Route path="/atencion" element={<Guard allow={user => user.rol === 'TECNICO'}><Tickets attention /></Guard>} />
      <Route path="/mis-solicitudes" element={<Tickets own />} />
      <Route path="/incidencias" element={<Guard allow={staff}><Incidents /></Guard>} />
      <Route path="/reportes" element={<Guard allow={isManager}><Reports /></Guard>} />
      <Route path="/clientes" element={<Guard allow={isManager}><Clients /></Guard>} />
      <Route path="/usuarios" element={<Guard allow={user => user.rol === 'ADMINISTRADOR'}><Users /></Guard>} />
      <Route path="/perfil" element={<Profile />} />
      <Route path="/configuracion" element={<Settings />} />
    </Route>
    <Route path="/index.html" element={<OldHome />} />
    {Object.entries({ login: '/login', 'recuperar-clave': '/recuperar-clave', dashboard: '/dashboard', tickets: '/tickets', empleado: '/atencion', incidencias: '/incidencias', reportes: '/reportes', usuarios: '/usuarios', perfil: '/perfil', configuracion: '/configuracion' }).map(([old, to]) => <Route key={old} path={`/${old}.html`} element={<Navigate to={to} replace />} />)}
    <Route path="*" element={<div className="not-found"><Empty title="No encontramos esta página" description="Vuelve al portal para continuar." /><a className="btn btn-primary" href="/">Volver al inicio</a></div>} />
  </Routes>;
}

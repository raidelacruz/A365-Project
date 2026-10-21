import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { homeFor, isManager, useAuth, userName } from '../context/AuthContext.jsx';
import { Brand, Icon, ThemeToggle, ErrorBox } from './UI.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  async function handleLogout() { try { await logout(); } catch (err) { setLogoutError(err.message); } }
  const [scale, setScale] = useState(() => { const value = Number(localStorage.getItem('a365_font_scale')); return [1, 1.12, 1.24].includes(value) ? value : 1; });
  useEffect(() => { setOpen(false); document.getElementById('main-content')?.focus(); }, [location.pathname]);
  useEffect(() => { document.documentElement.style.setProperty('--font-scale', scale); localStorage.setItem('a365_font_scale', scale); }, [scale]);
  useEffect(() => { const close = event => { if (event.key === 'Escape') { setOpen(false); document.getElementById('menu-toggle')?.focus(); } }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  const links = user.rol === 'CLIENTE' ? [['/mis-solicitudes', 'ticket-perforated', 'Mis solicitudes']] : [
    ...(isManager(user) ? [['/dashboard', 'grid-1x2', 'Panel principal']] : []),
    [user.rol === 'EMPLEADO' ? '/atencion' : '/tickets', 'ticket-perforated', user.rol === 'EMPLEADO' ? 'Bandeja de atención' : 'Tickets'],
    ['/mis-solicitudes', 'person-lines-fill', 'Mis solicitudes'], ['/incidencias', 'exclamation-square', 'Incidencias'],
    ...(isManager(user) ? [['/reportes', 'bar-chart', 'Reportes']] : []),
    ...(user.rol === 'ADMINISTRADOR' ? [['/usuarios', 'people', 'Usuarios']] : []),
  ];
  const name = userName(user);
  return <div className="app-shell"><a className="skip-link" href="#main-content">Saltar al contenido</a>
    {open && <button className="sidebar-scrim" aria-label="Cerrar menú" onClick={() => setOpen(false)} />}
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`} id="app-navigation" aria-label="Navegación principal">
      <Link className="sidebar-brand" to={homeFor(user)}><Brand /></Link>
      <button className="icon-button sidebar-close" aria-label="Cerrar navegación" onClick={() => { setOpen(false); document.getElementById('menu-toggle')?.focus(); }}><Icon name="x-lg" /></button>
      <div className="sidebar-caption">ESPACIO DE TRABAJO</div>
      <nav>{links.map(([to, icon, label]) => <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}><Icon name={icon} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><NavLink to="/perfil" className="sidebar-link"><Icon name="person-circle" /> Mi perfil</NavLink><NavLink to="/configuracion" className="sidebar-link"><Icon name="gear" /> Configuración</NavLink><div className="sidebar-footer"><Brand compact /><span>Soporte que conecta.</span></div></div>
    </aside>
    <div className="workspace"><header className="app-topbar"><div className="d-flex align-items-center gap-3"><button id="menu-toggle" className="icon-button menu-toggle" aria-label="Abrir menú" aria-expanded={open} aria-controls="app-navigation" onClick={() => setOpen(value => !value)}><Icon name="list" /></button><span className="workspace-label"><Brand compact /></span></div><div className="topbar-actions"><ThemeToggle /><label className="font-control"><span className="visually-hidden">Tamaño del texto</span><select aria-label="Tamaño del texto" value={scale} onChange={event => setScale(Number(event.target.value))}><option value={1}>A</option><option value={1.12}>A+</option><option value={1.24}>A++</option></select></label><Link to="/perfil" className="profile-link"><span className="avatar">{name.split(' ').slice(0, 2).map(part => part[0]).join('')}</span><span className="profile-copy"><strong>{name}</strong><small>{user.rol}</small></span></Link><button className="icon-button logout-button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={handleLogout}><Icon name="box-arrow-right" /></button></div></header>
      <main id="main-content" className="page-content" tabIndex={-1}><ErrorBox message={logoutError} retry={handleLogout} /><Outlet /></main><footer className="workspace-footer"><Brand compact /><span>© {new Date().getFullYear()} · Centro de soporte corporativo</span></footer>
    </div>
  </div>;
}

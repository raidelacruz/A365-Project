import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext.jsx';

export function Icon({ name, ...props }) { return <i className={`bi bi-${name}`} aria-hidden="true" {...props} />; }
export function Brand({ compact = false }) { return <span className={`brand ${compact ? 'brand-compact' : ''}`}><img className="brand-logo" src="/Imagenes/logo.jpg" alt="IMPULSA A365" width="200" height="200" /></span>; }
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro';
  return <button type="button" className="icon-button theme-toggle" onClick={toggleTheme} aria-label={label} title={label} aria-pressed={theme === 'dark'}><Icon name={theme === 'dark' ? 'sun' : 'moon-stars'} /></button>;
}
export function PageHeading({ eyebrow = 'MESA DE AYUDA', title, description, action }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>;
}
export function Panel({ title, action, children, className = '' }) { return <section className={`panel ${className}`}>{title && <div className="panel-heading"><h2>{title}</h2>{action}</div>}<div className="panel-body">{children}</div></section>; }
export function Field({ label, children, hint }) {
  const id = useId();
  return <div className="field"><label className="form-label" htmlFor={id}>{label}</label>{typeof children === 'function' ? children(id) : children}{hint && <small className="field-hint">{hint}</small>}</div>;
}
export function Input({ label, hint, ...props }) { return <Field label={label} hint={hint}>{id => <input className="form-control" id={id} {...props} />}</Field>; }
export function Select({ label, children, ...props }) { return <Field label={label}>{id => <select className="form-select" id={id} {...props}>{children}</select>}</Field>; }
export function Textarea({ label, ...props }) { return <Field label={label}>{id => <textarea className="form-control" rows={4} id={id} {...props} />}</Field>; }
export function Password({ label = 'Contraseña', ...props }) {
  const [visible, setVisible] = useState(false);
  return <Field label={label}>{id => <div className="password-field"><input id={id} className="form-control" type={visible ? 'text' : 'password'} {...props} /><button type="button" aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} onClick={() => setVisible(value => !value)}><Icon name={visible ? 'eye-slash' : 'eye'} /></button></div>}</Field>;
}
export function Submit({ busy, children = 'Guardar cambios', ...props }) { return <button type="submit" className="btn btn-primary" disabled={busy} {...props}>{busy ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Procesando…</> : children}</button>; }
export function ErrorBox({ message, retry }) { return message ? <div className="alert alert-danger" role="alert"><Icon name="exclamation-circle" /> <span>{message}</span>{retry && <button className="btn btn-sm btn-outline-danger ms-auto" onClick={retry}>Reintentar</button>}</div> : null; }
export function Loading() { return <div className="loading-state" role="status"><span className="spinner-border spinner-border-sm" /> Cargando información…</div>; }
export function Empty({ title = 'Sin resultados', description = 'Prueba con otros filtros o registra el primer elemento.', icon = 'inbox' }) { return <div className="empty-state"><Icon name={icon} /><h3>{title}</h3><p>{description}</p></div>; }
const labels = { ABIERTO: 'Abierto', ASIGNADO: 'Asignado', EN_PROCESO: 'En proceso', PENDIENTE_CLIENTE: 'Pendiente del cliente', TECNICO: 'Técnico de soporte', EMPLEADO: 'Empleado interno', RESUELTO: 'Resuelto', CERRADO: 'Cerrado', CANCELADO: 'Cancelado' };
export function Badge({ value }) { const key = String(value || '').toUpperCase().replaceAll(' ', '_'); return <span className={`status-badge status-${key.toLowerCase()}`}>{labels[key] || value || 'Sin estado'}</span>; }
export function Resource({ resource, children }) { if (resource.loading && !resource.data) return <Loading />; if (resource.error) return <ErrorBox message={resource.error} retry={resource.reload} />; return children(resource.data); }
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const element = ref.current;
    element.showModal();
    return () => element.close();
  }, []);
  return createPortal(<dialog ref={ref} aria-labelledby={id} className={`app-dialog ${wide ? 'dialog-wide' : ''}`} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === ref.current) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}><div className="dialog-heading"><h2 id={id}>{title}</h2><button className="icon-button" type="button" aria-label="Cerrar ventana" onClick={onClose}><Icon name="x-lg" /></button></div><div className="dialog-body">{children}</div></dialog>, document.body);
}
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 6000); return () => clearTimeout(timer); }, [toast]);
  return <ToastContext.Provider value={message => setToast(message)}>{children}<div className="toast-region" role="status" aria-live="polite">{toast && <div className="app-toast"><Icon name="check-circle" /><span>{toast}</span><button className="icon-button" aria-label="Cerrar notificación" onClick={() => setToast('')}><Icon name="x" /></button></div>}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);


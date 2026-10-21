import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { homeFor, useAuth } from '../context/AuthContext.jsx';
import { Brand, ErrorBox, Icon, Input, Password, Submit, ThemeToggle, Loading, useToast } from '../components/UI.jsx';

function AuthFrame({ title, description, children }) {
  return <div className="auth-page"><div className="auth-main"><div className="auth-header"><Link className="auth-brand" to="/"><Brand /></Link><ThemeToggle /></div><div className="auth-form"><span className="eyebrow">BIENVENIDO A TU ESPACIO</span><h1>{title}</h1><p className="text-secondary mb-4">{description}</p>{children}</div><div className="auth-footer"><Brand compact /><small>Atención cercana, soluciones claras.</small></div></div><aside className="auth-story"><span className="story-tag"><Icon name="headset" /> CENTRO DE SOPORTE</span><div><span className="eyebrow">CONECTAMOS PERSONAS Y SOLUCIONES</span><h2>Tu equipo.<br />Tu soporte.<br /><span>Todo en un lugar.</span></h2><p>Registra solicitudes, conversa con nuestro equipo y acompaña cada solución, paso a paso.</p><div className="story-feature"><Icon name="ticket-perforated" /><span>Solicitudes organizadas y fáciles de seguir</span></div><div className="story-feature"><Icon name="chat-square-text" /><span>Comunicación directa en cada caso</span></div><div className="story-feature"><Icon name="check2-circle" /><span>Un historial claro de la atención</span></div></div><div className="auth-story-footer"><Brand compact /><small>Lima, Perú</small></div></aside></div>;
}
export function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (loading) return <Loading />;
  if (user) return <Navigate to={homeFor(user)} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (pending) {
        const result = await api.verify({ codigoOtp: fields.codigoOtp, dispositivo: navigator.userAgent.slice(0, 80) });
        login(result.usuario);
        const target = location.state?.from;
        navigate(target?.startsWith('/') && !target.startsWith('//') ? target : homeFor(result.usuario), { replace: true });
      } else {
        const result = await api.login(fields);
        if (result.requires2FA) setPending(result);
        else if (result.usuario) { login(result.usuario); navigate(homeFor(result.usuario), { replace: true }); }
        else throw new Error('No se pudo iniciar la verificación de tu cuenta.');
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <AuthFrame title={pending ? 'Verifica tu identidad' : 'Inicia sesión'} description={pending ? pending.smtpEnviado === false ? pending.mensaje : `Ingresa el código enviado a ${pending.correo}.` : 'Accede con tu correo o código de usuario.'}><ErrorBox message={error} /><form onSubmit={submit} key={pending ? 'verify' : 'login'}>
    {pending ? <><Input label="Código de verificación" name="codigoOtp" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus /></> : <><Input label="Correo o código de usuario" name="identificador" autoComplete="username" placeholder="nombre@empresa.com o USR-…" required /><Password name="password" autoComplete="current-password" required /><div className="text-end mb-4"><Link to="/recuperar-clave">¿Olvidaste tu contraseña?</Link></div></>}
    <Submit busy={busy} className="btn btn-primary w-100">{pending ? 'Verificar y entrar' : 'Ingresar al sistema'} <Icon name="arrow-right" /></Submit>
    {pending && <button type="button" className="btn btn-link w-100 mt-3" disabled={busy} onClick={() => { setPending(null); setError(''); }}>Volver al inicio de sesión</button>}
  </form><p className="auth-alternative">¿Eres un cliente nuevo? <Link to="/registro">Crear cuenta</Link></p></AuthFrame>;
}
export function Register() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const navigate = useNavigate(); const toast = useToast();
  if (user) return <Navigate to={homeFor(user)} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try { const result = await api.register(body); toast(result.mensaje || 'Cuenta creada. Ya puedes iniciar sesión.'); navigate('/login'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <AuthFrame title="Crea tu cuenta" description="Regístrate para solicitar soporte y consultar tus casos."><ErrorBox message={error} /><form onSubmit={submit}><Input label="Nombre o razón social" name="razonSocial" required autoComplete="organization" /><Input label="DNI o RUC" name="documento" inputMode="numeric" pattern="([0-9]{8}|[0-9]{11})" title="Ingresa 8 dígitos para DNI u 11 para RUC" maxLength={11} required /><Input label="Correo electrónico" name="correo" type="email" autoComplete="email" required /><Input label="Teléfono" name="telefono" type="tel" autoComplete="tel" /><Password name="password" autoComplete="new-password" minLength={8} required /><Submit busy={busy} className="btn btn-primary w-100">Crear cuenta</Submit></form><p className="auth-alternative">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p></AuthFrame>;
}
export function Recover() {
  const [step, setStep] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const navigate = useNavigate(); const toast = useToast();
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (!step) { const result = await api.recover(body); setStep({ ...result, correo: body.correo }); }
      else { if (body.nuevaPassword !== body.confirmacion) throw new Error('Las contraseñas no coinciden.'); const result = await api.reset({ correo: step.correo, codigoOtp: body.codigoOtp, nuevaPassword: body.nuevaPassword }); toast(result.mensaje || 'Contraseña actualizada.'); navigate('/login'); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <AuthFrame title="Recupera tu acceso" description={step ? `Revisa tu correo ${step.correo} e ingresa el código de recuperación.` : 'Te enviaremos las instrucciones a tu correo registrado.'}><ErrorBox message={error} /><form onSubmit={submit} key={step ? 'reset' : 'recover'}>{step ? <><Input name="codigoOtp" label="Código de recuperación" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required /><Password name="nuevaPassword" label="Nueva contraseña" autoComplete="new-password" minLength={8} required /><Password name="confirmacion" label="Confirma la contraseña" autoComplete="new-password" minLength={8} required /></> : <Input label="Correo electrónico" name="correo" type="email" autoComplete="email" required />}<Submit busy={busy} className="btn btn-primary w-100">{step ? 'Guardar nueva contraseña' : 'Enviar instrucciones'}</Submit></form><p className="auth-alternative"><Link to="/login"><Icon name="arrow-left" /> Volver al inicio de sesión</Link></p></AuthFrame>;
}
export function Portal() {
  const { user } = useAuth();
  return <div className="portal"><header className="portal-header"><Brand /><div className="portal-header-actions"><ThemeToggle /><Link to={user ? homeFor(user) : '/login'} className="btn btn-outline-primary">{user ? 'Ir a mi espacio' : 'Iniciar sesión'}</Link>{!user && <Link to="/registro" className="btn btn-primary">Crear cuenta</Link>}</div></header><main><div className="portal-hero"><div><span className="eyebrow">SOPORTE CORPORATIVO</span><h1>Estamos aquí<br />para <span>ayudarte.</span></h1><p>Un solo espacio para registrar tus solicitudes, conversar con nuestro equipo y seguir cada solución.</p><Link className="btn btn-primary btn-lg" to={user ? '/mis-solicitudes?nuevo=1' : '/login'}>Crear una solicitud <Icon name="arrow-right" /></Link><Link className="portal-secondary" to={user ? '/mis-solicitudes' : '/login'}>Consultar mis solicitudes <Icon name="arrow-up-right" /></Link></div><div className="portal-illustration" aria-hidden="true"><div className="support-emblem"><Icon name="headset" /></div><div className="support-note"><span className="support-note-icon"><Icon name="chat-left-text" /></span><div><strong>La conversación continúa</strong><small>Cada detalle, en el mismo lugar.</small></div></div><div className="support-note offset-note"><span className="support-note-icon green"><Icon name="check2" /></span><div><strong>Un camino hacia la solución</strong><small>Conoce el avance de tu solicitud.</small></div></div></div></div><section className="portal-features" aria-label="Cómo funciona">{[['01', 'Registra tu solicitud', 'Cuéntanos qué necesitas y elige una categoría.'], ['02', 'Conversa con el equipo', 'Comparte detalles y consulta las respuestas de soporte.'], ['03', 'Consulta el avance', 'Revisa el estado de tus casos desde tu espacio.']].map(([n, title, text]) => <article key={n}><span>{n}</span><h2>{title}</h2><p>{text}</p></article>)}</section></main><footer className="portal-footer"><div className="footer-brand"><Brand compact /><span>© {new Date().getFullYear()} · Lima, Perú</span></div> <Link to="/login">Acceso del personal <Icon name="arrow-right" /></Link></footer></div>;
}

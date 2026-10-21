import { useState } from 'react';
import { api } from '../services/api.js';
import { useResource } from '../hooks/useResource.js';
import { useAuth, userName } from '../context/AuthContext.jsx';
import { Badge, ErrorBox, Input, Modal, PageHeading, Panel, Password, Resource, Submit, useToast } from '../components/UI.jsx';

export function Profile() {
  const { user, updateUser } = useAuth(); const resource = useResource(signal => api.user(user.idUsuario, signal), [user.idUsuario]);
  const toast = useToast(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try { const result = await api.profile(user.idUsuario, body); updateUser({ ...user, nombres: result.nombres, apellidos: result.apellidos, correo: result.correo, telefono: result.telefono, dniRuc: result.dniRuc }); toast(result.mensaje || 'Perfil actualizado.'); resource.reload(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <><PageHeading title="Mi perfil" description="Mantén actualizada tu información de contacto." /><Resource resource={resource}>{data => data && <div className="account-grid"><Panel><div className="profile-summary"><span className="avatar avatar-large">{userName(data).split(' ').slice(0, 2).map(value => value[0]).join('')}</span><h2>{userName(data)}</h2><p>{data.correo}</p><Badge value={data.rol} /><dl><dt>Código</dt><dd>{data.codigoUsuario}</dd><dt>Departamento</dt><dd>{data.departamento || '—'}</dd><dt>Cargo</dt><dd>{data.cargo || '—'}</dd></dl></div></Panel><Panel title="Información personal"><ErrorBox message={error} /><form onSubmit={save} key={`${data.nombres}-${data.correo}`}><Input label="Nombre completo" name="nombreCompleto" defaultValue={userName(data)} autoComplete="name" required /><Input label="Correo electrónico" type="email" name="correo" defaultValue={data.correo || ''} autoComplete="email" required /><Input label="Teléfono" type="tel" name="telefono" defaultValue={data.telefono || ''} autoComplete="tel" /><Input label="DNI o RUC" name="dniRuc" defaultValue={data.dniRuc || ''} inputMode="numeric" pattern="([0-9]{8}|[0-9]{11})" /><div className="text-end"><Submit busy={busy} /></div></form></Panel></div>}</Resource></>;
}

export function Settings() {
  const { user } = useAuth();
  const resource = useResource(signal => api.user(user.idUsuario, signal), [user.idUsuario]);
  const toast = useToast(); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [password, setPassword] = useState(false); const [sessions, setSessions] = useState(false);
  async function savePreferences(event) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try { const result = await api.preferences(user.idUsuario, { dobleFactorActivo: form.has('dobleFactorActivo'), alertaLoginActiva: form.has('alertaLoginActiva') }); toast(result.mensaje); resource.reload(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <><PageHeading title="Configuración" description="Administra tus preferencias y el acceso a tu cuenta." /><div className="settings-stack"><Panel title="Preferencias de seguridad"><ErrorBox message={error} /><Resource resource={resource}>{data => data && <form onSubmit={savePreferences} key={String(data.dobleFactorActivo) + String(data.alertaLoginActiva)}><label className="setting-row"><span><strong>Verificación en dos pasos</strong><small>Solicita un código de verificación al iniciar sesión.</small></span><input type="checkbox" className="form-check-input" name="dobleFactorActivo" defaultChecked={data.dobleFactorActivo !== false} /></label><label className="setting-row"><span><strong>Alertas por correo</strong><small>Recibe un aviso cuando se registre un acceso a tu cuenta.</small></span><input type="checkbox" className="form-check-input" name="alertaLoginActiva" defaultChecked={data.alertaLoginActiva !== false} /></label><div className="text-end mt-3"><Submit busy={busy}>Guardar preferencias</Submit></div></form>}</Resource></Panel><Panel title="Acceso a tu cuenta"><div className="setting-row"><span><strong>Contraseña</strong><small>Actualiza tu contraseña periódicamente.</small></span><button className="btn btn-outline-primary" onClick={() => setPassword(true)}>Cambiar contraseña</button></div><div className="setting-row"><span><strong>Historial de accesos</strong><small>Consulta los últimos accesos registrados.</small></span><button className="btn btn-outline-primary" onClick={() => setSessions(true)}>Ver accesos</button></div></Panel>{user.rol === 'ADMINISTRADOR' && <SmtpSettings />}</div>{password && <ChangePassword onClose={() => setPassword(false)} />}{sessions && <Sessions onClose={() => setSessions(false)} />}</>;
}
function ChangePassword({ onClose }) {
  const { user, logout } = useAuth(); const toast = useToast(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError(''); const body = Object.fromEntries(new FormData(event.currentTarget));
    if (body.nuevaPassword !== body.confirmacion) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try { const result = await api.changePassword(user.idUsuario, { passwordActual: body.passwordActual, nuevaPassword: body.nuevaPassword }); toast(result.mensaje + ' Inicia sesión nuevamente.'); await logout(); onClose(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title="Cambiar contraseña" onClose={() => { if (!busy) onClose(); }}><ErrorBox message={error} /><form onSubmit={submit}><Password label="Contraseña actual" name="passwordActual" autoComplete="current-password" required /><Password label="Nueva contraseña" name="nuevaPassword" autoComplete="new-password" minLength={8} required /><Password label="Confirma la nueva contraseña" name="confirmacion" autoComplete="new-password" minLength={8} required /><div className="dialog-actions"><button className="btn btn-outline-secondary" type="button" disabled={busy} onClick={onClose}>Cancelar</button><Submit busy={busy} /></div></form></Modal>;
}
function Sessions({ onClose }) {
  const { user } = useAuth(); const resource = useResource(signal => api.sessions(user.idUsuario, signal), [user.idUsuario]);
  return <Modal title="Últimos accesos" wide onClose={onClose}><Resource resource={resource}>{data => data?.length ? <div className="table-responsive"><table className="table"><thead><tr><th>Fecha</th><th>Dispositivo</th><th>Dirección IP</th></tr></thead><tbody>{data.map(item => <tr key={item.idSesion}><td className="text-nowrap">{item.fecha}</td><td>{item.dispositivo}</td><td>{item.ip}</td></tr>)}</tbody></table></div> : <p>No hay accesos registrados.</p>}</Resource></Modal>;
}
function SmtpSettings() {
  const resource = useResource(api.smtp); const toast = useToast(); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [revision, setRevision] = useState(0);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); const body = Object.fromEntries(new FormData(event.currentTarget));
    try { const result = await api.saveSmtp({ ...body, port: Number(body.port) }); toast(result.mensaje); setRevision(value => value + 1); resource.reload(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Panel title="Correo saliente"><p className="text-secondary">Configura la cuenta desde la que se envían los códigos y avisos de acceso.</p><ErrorBox message={error} /><Resource resource={resource}>{data => data && <form onSubmit={submit} key={revision}><p><Badge value={data.configurado ? 'Configurado' : 'Pendiente de configuración'} /></p><div className="row"><div className="col-sm-8"><Input label="Servidor SMTP" name="host" defaultValue={data.host || 'smtp.gmail.com'} required /></div><div className="col-sm-4"><Input label="Puerto" name="port" type="number" min={1} max={65535} defaultValue={data.port || 587} required /></div></div><Input label="Correo remitente" name="username" type="email" defaultValue={data.username || ''} required /><Password label="Contraseña de aplicación" name="password" autoComplete="off" required /><div className="text-end"><Submit busy={busy}>Guardar configuración de correo</Submit></div></form>}</Resource></Panel>;
}

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useResource } from '../hooks/useResource.js';
import { useAuth } from '../context/AuthContext.jsx';
import { terminal, ticketPermissions } from '../domain/ticketPermissions.js';
import { Badge, Empty, ErrorBox, Icon, Input, Modal, PageHeading, Panel, Resource, Select, Submit, Textarea, useToast } from '../components/UI.jsx';

const initialTicket = { asunto: '', categoria: 'Software', prioridad: 'Media', descripcion: '' };
export default function Tickets({ own = false, attention = false }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(own && params.get('nuevo') === '1');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState(''); const [priority, setPriority] = useState('');
  const [tab, setTab] = useState('activos'); const [unassigned, setUnassigned] = useState(false);
  const resource = useResource(signal => api.tickets(own ? user.idUsuario : null, signal), [own, user.idUsuario]);
  const tickets = resource.data || [];
  const supervisor = user.rol === 'SUPERVISOR';
  const filtered = tickets.filter(ticket => {
    const group = ticket.estado === 'CANCELADO' ? 'cancelados' : terminal(ticket.estado) ? 'resueltos' : 'activos';
    return group === tab && (!unassigned || !ticket.responsable) && (!priority || ticket.prioridad?.toLowerCase() === priority.toLowerCase())
      && [ticket.codigo, ticket.asunto, ticket.solicitante, ticket.categoria, ticket.responsable].join(' ').toLowerCase().includes(query.toLowerCase());
  });
  function closeCreation() {
    setCreating(false);
    if (params.has('nuevo')) { const next = new URLSearchParams(params); next.delete('nuevo'); setParams(next, { replace: true }); }
  }
  const description = own ? 'Registra tus casos, conversa con soporte y confirma la solución.'
    : attention ? 'Aquí aparecen solo los casos que el supervisor te ha asignado. Inicia la atención y registra la solución.'
    : supervisor ? 'Asigna responsables, establece prioridades y supervisa el cierre de los casos.'
    : 'Consulta los casos y su historial. La atención y la asignación corresponden al equipo de soporte y al supervisor.';
  return <>
    <PageHeading title={own ? 'Mis solicitudes' : attention ? 'Mis casos asignados' : supervisor ? 'Asignación de tickets' : 'Consulta de tickets'} description={description}
      action={own && <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus-lg" /> Nueva solicitud</button>} />
    <Panel>
      <div className="ticket-tabs" role="group" aria-label="Filtrar por estado">{[
        ['activos', 'Activos', tickets.filter(ticket => !terminal(ticket.estado)).length],
        ['resueltos', 'Resueltos', tickets.filter(ticket => ['RESUELTO', 'CERRADO'].includes(ticket.estado)).length],
        ['cancelados', 'Cancelados', tickets.filter(ticket => ticket.estado === 'CANCELADO').length],
      ].map(([value, label, count]) => <button key={value} aria-pressed={tab === value} className={`filter-tab ${tab === value ? 'selected' : ''}`} onClick={() => setTab(value)}>{label}<span>{count}</span></button>)}</div>
      <div className="filter-row">
        <div className="search-field"><Icon name="search" /><input aria-label="Buscar tickets" className="form-control" placeholder="Busca por código, asunto o responsable…" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <select className="form-select priority-filter" aria-label="Filtrar por prioridad" value={priority} onChange={event => setPriority(event.target.value)}><option value="">Todas las prioridades</option>{['Alta', 'Media', 'Baja'].map(value => <option key={value}>{value}</option>)}</select>
        <button className="btn btn-outline-secondary" onClick={resource.reload} disabled={resource.loading}><Icon name="arrow-clockwise" /><span className="visually-hidden">Actualizar tickets</span></button>
      </div>
      {supervisor && !own && <label className="d-flex align-items-center gap-2 mb-3"><input type="checkbox" className="form-check-input mt-0" checked={unassigned} onChange={event => setUnassigned(event.target.checked)} /> Solo casos sin responsable disponible</label>}
      <Resource resource={resource}>{() => filtered.length ? <div className="table-responsive"><table className="table align-middle ticket-table">
        <thead><tr><th>Solicitud</th>{!own && <th>Solicitante</th>}<th>Responsable</th><th>Prioridad</th><th>Estado</th><th>Registrado</th><th>Acciones</th></tr></thead>
        <tbody>{filtered.map(ticket => <tr key={ticket.idTicket}>
          <td><button className="ticket-title" onClick={() => setSelected(ticket)}><small>{ticket.codigo}</small><strong>{ticket.asunto}</strong></button><span className="table-muted">{ticket.categoria}</span></td>
          {!own && <td>{ticket.solicitante}</td>}<td>{ticket.responsable || 'Pendiente de asignación'}</td><td><Badge value={ticket.prioridad} /></td><td><Badge value={ticket.estado} /></td><td className="text-nowrap table-muted">{ticket.fecha}</td>
          <td><button className="btn btn-sm btn-outline-primary text-nowrap" onClick={() => setSelected(ticket)}>Ver detalle <Icon name="arrow-up-right" /></button></td>
        </tr>)}</tbody></table></div> : <Empty title={query || priority || unassigned ? 'No hay coincidencias' : 'No hay solicitudes en este estado'} description={attention ? 'El supervisor asignará los casos a tu bandeja.' : 'Prueba con otro filtro o actualiza el listado.'} />}</Resource>
    </Panel>
    {creating && own && <NewTicket onClose={closeCreation} onCreated={() => { closeCreation(); resource.reload(); }} />}
    {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); resource.reload(); }} />}
  </>;
}

export function NewTicket({ onClose, onCreated }) {
  const toast = useToast(); const [form, setForm] = useState(initialTicket);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const bind = key => ({ value: form[key], onChange: event => setForm(previous => ({ ...previous, [key]: event.target.value })) });
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api.createTicket(form); toast(result.mensaje || `Solicitud ${result.codigoTicket} registrada.`); onCreated(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title="Nueva solicitud de soporte" onClose={() => { if (!busy) onClose(); }}>
    <p className="text-secondary">Cuéntanos qué ocurre para que el equipo pueda ayudarte.</p><ErrorBox message={error} /><form onSubmit={submit}>
      <Input label="Asunto" placeholder="Describe brevemente qué necesitas" {...bind('asunto')} required maxLength={150} />
      <div className="row"><div className="col-sm-6"><Select label="Categoría" {...bind('categoria')}>{['Software', 'Hardware', 'Redes', 'Accesos', 'Otros'].map(value => <option key={value}>{value}</option>)}</Select></div><div className="col-sm-6"><Select label="Prioridad" {...bind('prioridad')}>{['Baja', 'Media', 'Alta'].map(value => <option key={value}>{value}</option>)}</Select></div></div>
      <Textarea label="Descripción" placeholder="Explica lo que intentabas hacer y qué sucedió." {...bind('descripcion')} required maxLength={10000} />
      <div className="dialog-actions"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancelar</button><Submit busy={busy}>Registrar solicitud</Submit></div>
    </form>
  </Modal>;
}

export function TicketDetail({ ticket, onClose, onChanged }) {
  const { user } = useAuth(); const toast = useToast(); const permission = ticketPermissions(user, ticket);
  const messages = useResource(signal => api.messages(ticket.idTicket, signal), [ticket.idTicket]);
  const [reply, setReply] = useState(''); const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [action, setAction] = useState(''); const [reason, setReason] = useState(''); const [history, setHistory] = useState(false);
  async function send(event) {
    event.preventDefault(); if (!reply.trim()) return; setBusy(true); setError('');
    try { await api.sendMessage(ticket.idTicket, { contenido: reply.trim(), esInterno: permission.note && internal }); setReply(''); messages.reload(); toast(internal ? 'Nota interna guardada.' : 'Respuesta enviada.'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function changeState(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api.ticketState(ticket.idTicket, { estado: action, motivo: reason.trim() }); toast(result.mensaje || 'Estado actualizado.'); onChanged(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title={ticket.codigo || 'Detalle de solicitud'} wide onClose={() => { if (!busy) onClose(); }}>
    <div className="ticket-detail-heading"><h3>{ticket.asunto}</h3><div className="d-flex flex-wrap gap-2"><Badge value={ticket.prioridad} /><Badge value={ticket.estado} /></div>
      <p className="text-secondary mt-2">{ticket.solicitante} · {ticket.fecha} · {ticket.categoria}</p><p><strong>Responsable:</strong> {ticket.responsable || 'Pendiente de asignación'}</p></div>
    <p className="ticket-description">{ticket.descripcion}</p><ErrorBox message={error} />
    {permission.assign && <Assignment ticket={ticket} onChanged={onChanged} />}
    {permission.actions.length > 0 && <div className="ticket-state-actions mb-4"><h3>{permission.owner ? 'Confirmación de la solución' : 'Acciones de tu rol'}</h3>
      {action ? <form onSubmit={changeState}><p>Vas a cambiar el estado a <Badge value={action} />.</p><Textarea label="Motivo del cambio" value={reason} onChange={event => setReason(event.target.value)} required maxLength={180} />
        <div className="dialog-actions"><button className="btn btn-outline-secondary" type="button" onClick={() => setAction('')} disabled={busy}>Volver</button><Submit busy={busy}>Confirmar cambio</Submit></div>
      </form> : <div className="d-flex flex-wrap gap-2">{permission.actions.map(([state, label]) => <button key={state} className={`btn ${state === 'RESUELTO' ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setAction(state)}>{label}</button>)}</div>}
    </div>}
    <div className="conversation-heading"><h3>Conversación</h3><button className="btn btn-sm btn-outline-secondary" onClick={messages.reload} disabled={messages.loading}><Icon name="arrow-clockwise" /> Actualizar</button></div>
    <div className="conversation"><Resource resource={messages}>{data => data?.length ? data.map(message => <article key={message.idMensaje} className={`message ${message.autorRol === 'CLIENTE' || message.autorRol === 'Solicitante' ? 'message-customer' : 'message-staff'}`}>
      <div className="message-meta"><strong>{message.autorNombre}</strong><span>{message.esInterno ? 'Nota interna · ' : ''}{message.autorRol} · {message.fecha}</span></div><p>{message.contenido}</p>
    </article>) : <Empty title="Inicia la conversación" description="Aquí verás las respuestas y el seguimiento de soporte." icon="chat-square-text" />}</Resource></div>
    {permission.reply ? <form className="reply-form" onSubmit={send}>
      {permission.note && <label className="d-flex align-items-center gap-2 mb-3"><input type="checkbox" className="form-check-input mt-0" checked={internal} onChange={event => setInternal(event.target.checked)} /> Nota interna (solo equipo de atención)</label>}
      <Textarea label={internal ? 'Tu nota interna' : 'Tu respuesta'} value={reply} onChange={event => setReply(event.target.value)} required maxLength={10000} />
      <div className="text-end"><Submit busy={busy}>{internal ? 'Guardar nota interna' : 'Enviar respuesta'} <Icon name="send" /></Submit></div>
    </form> : <p className="text-secondary">{['CERRADO', 'CANCELADO'].includes(ticket.estado) ? 'La conversación está cerrada.' : 'Tu acceso a este caso es de consulta.'}</p>}
    {permission.internal && <div className="ticket-state-actions"><button className="btn btn-outline-secondary" aria-expanded={history} onClick={() => setHistory(value => !value)}><Icon name="clock-history" /> {history ? 'Ocultar historial' : 'Ver historial del caso'}</button>{history && <History id={ticket.idTicket} />}</div>}
  </Modal>;
}

function Assignment({ ticket, onChanged }) {
  const agents = useResource(api.agents); const toast = useToast();
  const [employee, setEmployee] = useState(String(ticket.idEmpleadoAsignado || ''));
  const [priority, setPriority] = useState(ticket.prioridad); const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const available = (agents.data || []).filter(agent => Number(agent.idUsuario) !== Number(ticket.idUsuarioCreador));
  const valid = available.some(agent => String(agent.idEmpleado) === employee);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api.assignTicket(ticket.idTicket, { idEmpleado: Number(employee), prioridad: priority, motivo: reason.trim() }); toast(result.mensaje); onChanged(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <section className="ticket-state-actions mb-4" aria-label="Asignación del supervisor"><h3>Responsable y prioridad</h3><ErrorBox message={error} />
    <Resource resource={agents}>{() => available.length ? <form onSubmit={submit}>
      <Select label="Agente responsable" value={valid ? employee : ''} onChange={event => setEmployee(event.target.value)} required><option value="">Selecciona un agente activo</option>{available.map(agent => <option key={agent.idEmpleado} value={agent.idEmpleado}>{agent.nombre} · {agent.pendientes} pendientes</option>)}</Select>
      <Select label="Prioridad del caso" value={priority} onChange={event => setPriority(event.target.value)}>{['Baja', 'Media', 'Alta'].map(value => <option key={value}>{value}</option>)}</Select>
      <Textarea label="Motivo de asignación o cambio" value={reason} onChange={event => setReason(event.target.value)} required maxLength={180} />
      <p className="text-secondary">Cambiar de agente devuelve el caso a Asignado para que el nuevo responsable inicie la atención.</p>
      <div className="text-end"><Submit busy={busy} disabled={!valid || agents.loading || !!agents.error}>Guardar asignación</Submit></div>
    </form> : <Empty title="No hay agentes disponibles" description="El administrador debe crear o activar un agente de soporte. El solicitante no puede atender su propio caso." />}</Resource>
  </section>;
}

function History({ id }) {
  const resource = useResource(signal => api.ticketHistory(id, signal), [id]);
  return <div className="mt-3"><Resource resource={resource}>{data => data?.length ? <ol className="list-unstyled">{data.map(item => <li key={item.idHistorial} className="border-bottom py-3"><strong>{item.accion.replaceAll('_', ' ')}</strong><p className="mb-1">{item.estadoAnterior} → {item.estadoNuevo}</p><p className="mb-1 ticket-description">{item.motivo}</p><small className="text-secondary">{item.autor} · {item.fecha}</small></li>)}</ol> : <Empty title="Todavía no hay cambios registrados" />}</Resource></div>;
}

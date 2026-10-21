import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useResource } from '../hooks/useResource.js';
import { useAuth, userName } from '../context/AuthContext.jsx';
import { Badge, Empty, ErrorBox, Icon, Input, Modal, PageHeading, Panel, Resource, Select, Submit, Textarea, useToast } from '../components/UI.jsx';

const closed = ticket => ['RESUELTO', 'CERRADO', 'CANCELADO'].includes(ticket.estado);
const initialTicket = { asunto: '', categoria: 'Software', prioridad: 'Media', descripcion: '' };
export default function Tickets({ own = false, attention = false }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(params.get('nuevo') === '1');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState(''); const [priority, setPriority] = useState(''); const [tab, setTab] = useState('activos');
  const resource = useResource(signal => api.tickets(own ? user.idUsuario : null, signal), [own, user.idUsuario]);
  const tickets = resource.data || [];
  const filtered = tickets.filter(ticket => {
    const group = ticket.estado === 'CANCELADO' ? 'cancelados' : closed(ticket) ? 'resueltos' : 'activos';
    return group === tab && (!priority || ticket.prioridad?.toLowerCase() === priority.toLowerCase()) && [ticket.codigo, ticket.asunto, ticket.solicitante, ticket.categoria].join(' ').toLowerCase().includes(query.toLowerCase());
  });
  function closeCreation() { setCreating(false); if (params.has('nuevo')) { const next = new URLSearchParams(params); next.delete('nuevo'); setParams(next, { replace: true }); } }
  return <><PageHeading title={own ? 'Mis solicitudes' : attention ? 'Bandeja de atención' : 'Gestión de tickets'} description={own ? 'Sigue tus casos y mantén la conversación con soporte.' : 'Organiza las solicitudes y acompaña cada caso hasta su solución.'} action={<button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus-lg" /> Nueva solicitud</button>} />
    <Panel><div className="ticket-tabs" role="group" aria-label="Filtrar por estado">{[['activos', 'Activos', tickets.filter(ticket => !closed(ticket)).length], ['resueltos', 'Resueltos', tickets.filter(ticket => ['RESUELTO', 'CERRADO'].includes(ticket.estado)).length], ['cancelados', 'Cancelados', tickets.filter(ticket => ticket.estado === 'CANCELADO').length]].map(([value, label, count]) => <button key={value} aria-pressed={tab === value} className={`filter-tab ${tab === value ? 'selected' : ''}`} onClick={() => setTab(value)}>{label}<span>{count}</span></button>)}</div><div className="filter-row"><div className="search-field"><Icon name="search" /><input aria-label="Buscar tickets" className="form-control" placeholder="Busca por código, asunto o solicitante…" value={query} onChange={event => setQuery(event.target.value)} /></div><select className="form-select priority-filter" aria-label="Filtrar por prioridad" value={priority} onChange={event => setPriority(event.target.value)}><option value="">Todas las prioridades</option>{['Alta', 'Media', 'Baja'].map(value => <option key={value}>{value}</option>)}</select><button className="btn btn-outline-secondary" onClick={resource.reload} disabled={resource.loading}><Icon name="arrow-clockwise" /><span className="visually-hidden">Actualizar tickets</span></button></div>
    <Resource resource={resource}>{() => filtered.length ? <div className="table-responsive"><table className="table align-middle ticket-table"><thead><tr><th>Solicitud</th>{!own && <th>Solicitante</th>}<th>Prioridad</th><th>Estado</th><th>Registrado</th><th>Acciones</th></tr></thead><tbody>{filtered.map(ticket => <tr key={ticket.idTicket}><td><button className="ticket-title" onClick={() => setSelected(ticket)}><small>{ticket.codigo}</small><strong>{ticket.asunto}</strong></button><span className="table-muted">{ticket.categoria}</span></td>{!own && <td>{ticket.solicitante}</td>}<td><Badge value={ticket.prioridad} /></td><td><Badge value={ticket.estado} /></td><td className="text-nowrap table-muted">{ticket.fecha}</td><td><button className="btn btn-sm btn-outline-primary text-nowrap" onClick={() => setSelected(ticket)}>Ver detalle <Icon name="arrow-up-right" /></button></td></tr>)}</tbody></table></div> : <Empty title={query || priority ? 'No hay coincidencias' : 'No hay solicitudes en este estado'} description={query || priority ? 'Prueba con otro término o cambia los filtros.' : 'Las solicitudes aparecerán aquí cuando estén disponibles.'} />}</Resource></Panel>
    {creating && <NewTicket onClose={closeCreation} onCreated={() => { closeCreation(); resource.reload(); }} />}
    {selected && <TicketDetail ticket={selected} canManage={!own && user.rol !== 'CLIENTE'} onClose={() => setSelected(null)} onChanged={next => { setSelected(ticket => ({ ...ticket, estado: next })); resource.reload(); }} />}
  </>;
}

export function NewTicket({ onClose, onCreated }) {
  const { user } = useAuth(); const toast = useToast();
  const [form, setForm] = useState(initialTicket); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const bind = key => ({ value: form[key], onChange: event => setForm(previous => ({ ...previous, [key]: event.target.value })) });
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api.createTicket({ ...form, idUsuario: user.idUsuario, solicitanteNombre: userName(user) }); toast(result.mensaje || `Solicitud ${result.codigoTicket} registrada.`); onCreated(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title="Nueva solicitud de soporte" onClose={() => { if (!busy) onClose(); }}><p className="text-secondary">Cuéntanos qué ocurre para que el equipo pueda ayudarte.</p><ErrorBox message={error} /><form onSubmit={submit}><Input label="Asunto" placeholder="Describe brevemente qué necesitas" {...bind('asunto')} required maxLength={200} /><div className="row"><div className="col-sm-6"><Select label="Categoría" {...bind('categoria')}>{['Software', 'Hardware', 'Redes', 'Accesos', 'Otros'].map(value => <option key={value}>{value}</option>)}</Select></div><div className="col-sm-6"><Select label="Prioridad" {...bind('prioridad')}>{['Baja', 'Media', 'Alta'].map(value => <option key={value}>{value}</option>)}</Select></div></div><Textarea label="Descripción" placeholder="Explica lo que intentabas hacer y qué sucedió." {...bind('descripcion')} required maxLength={10000} /><div className="dialog-actions"><button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={busy}>Cancelar</button><Submit busy={busy}>Registrar solicitud</Submit></div></form></Modal>;
}

export function TicketDetail({ ticket, canManage, onClose, onChanged }) {
  const { user } = useAuth(); const toast = useToast();
  const messages = useResource(signal => api.messages(ticket.idTicket, signal), [ticket.idTicket]);
  const [reply, setReply] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [action, setAction] = useState(''); const [reason, setReason] = useState('');
  async function send(event) {
    event.preventDefault(); if (!reply.trim()) return;
    setBusy(true); setError('');
    try { await api.sendMessage(ticket.idTicket, { contenido: reply.trim(), idUsuario: user.idUsuario, autorNombre: userName(user), autorRol: user.rol }); setReply(''); messages.reload(); toast('Respuesta enviada.'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function changeState(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api.ticketState(ticket.idTicket, { estado: action, idUsuario: user.idUsuario, motivo: reason.trim() }); onChanged(action); setAction(''); setReason(''); toast(result.mensaje || 'Estado actualizado.'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title={ticket.codigo || 'Detalle de solicitud'} wide onClose={() => { if (!busy) onClose(); }}><div className="ticket-detail-heading"><h3>{ticket.asunto}</h3><div className="d-flex flex-wrap gap-2"><Badge value={ticket.prioridad} /><Badge value={ticket.estado} /></div><p className="text-secondary mt-2">{ticket.solicitante} · {ticket.fecha} · {ticket.categoria}</p></div><p className="ticket-description">{ticket.descripcion}</p><ErrorBox message={error} /><div className="conversation-heading"><h3>Conversación</h3><button className="btn btn-sm btn-outline-secondary" onClick={messages.reload} disabled={messages.loading}><Icon name="arrow-clockwise" /> Actualizar</button></div><div className="conversation"><Resource resource={messages}>{data => data?.length ? data.map(message => <article key={message.idMensaje} className={`message ${message.autorRol === 'CLIENTE' || message.autorRol === 'Solicitante' ? 'message-customer' : 'message-staff'}`}><div className="message-meta"><strong>{message.autorNombre}</strong><span>{message.autorRol} · {message.fecha}</span></div><p>{message.contenido}</p></article>) : <Empty title="Inicia la conversación" description="Aquí verás las respuestas y el seguimiento de soporte." icon="chat-square-text" />}</Resource></div><form className="reply-form" onSubmit={send}><Textarea label="Tu respuesta" value={reply} onChange={event => setReply(event.target.value)} required maxLength={10000} /><div className="text-end"><Submit busy={busy}>Enviar respuesta <Icon name="send" /></Submit></div></form>
    {canManage && <div className="ticket-state-actions"><h3>Atención del caso</h3>{action ? <form onSubmit={changeState}><p>Vas a cambiar el estado a <Badge value={action} />.</p><Textarea label="Motivo del cambio" value={reason} onChange={event => setReason(event.target.value)} required /><div className="dialog-actions"><button className="btn btn-outline-secondary" type="button" onClick={() => setAction('')} disabled={busy}>Volver</button><Submit busy={busy}>Confirmar cambio</Submit></div></form> : <div className="d-flex flex-wrap gap-2">{[['EN_PROCESO', 'Iniciar atención'], ['RESUELTO', 'Marcar como resuelto'], ['CERRADO', 'Cerrar ticket'], ['CANCELADO', 'Cancelar ticket']].filter(([state]) => state !== ticket.estado).map(([state, label]) => <button key={state} className={`btn ${state === 'RESUELTO' ? 'btn-success' : 'btn-outline-secondary'}`} onClick={() => setAction(state)}>{label}</button>)}</div>}</div>}
  </Modal>;
}


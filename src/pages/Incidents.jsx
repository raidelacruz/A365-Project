import { useState } from 'react';
import { api } from '../services/api.js';
import { useResource } from '../hooks/useResource.js';
import { isManager, useAuth, userName } from '../context/AuthContext.jsx';
import { Badge, Empty, ErrorBox, Icon, Input, Modal, PageHeading, Panel, Resource, Select, Submit, Textarea, useToast } from '../components/UI.jsx';

export default function Incidents() {
  const { user } = useAuth(); const resource = useResource(api.incidents); const toast = useToast();
  const [query, setQuery] = useState(''); const [creating, setCreating] = useState(false); const [selected, setSelected] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function create(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try { const result = await api.createIncident({ ...body, idUsuario: user.idUsuario, registradoPor: userName(user) }); toast(result.mensaje); setCreating(false); resource.reload(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function change(estado) {
    setBusy(true); setError('');
    try { const result = await api.incidentState(selected.codigo, estado); toast(result.mensaje); setSelected(null); resource.reload(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const openCreate = () => { setError(''); setCreating(true); };
  return <><PageHeading title="Incidencias" description="Registra cambios operativos y consulta su revisión." action={<button className="btn btn-primary" onClick={openCreate}><Icon name="plus-lg" /> Registrar incidencia</button>} /><Panel><Input label="Buscar incidencias" placeholder="Código, título o responsable" value={query} onChange={event => setQuery(event.target.value)} /><Resource resource={resource}>{data => { const items = (data || []).filter(item => [item.codigo, item.titulo, item.registradoPor].join(' ').toLowerCase().includes(query.toLowerCase())); return items.length ? <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Incidencia</th><th>Tipo</th><th>Registrado por</th><th>Estado</th><th>Fecha</th><th /></tr></thead><tbody>{items.map(item => <tr key={item.idIncidencia}><td><small className="table-muted d-block">{item.codigo}</small><strong>{item.titulo}</strong></td><td>{item.tipo}</td><td>{item.registradoPor}</td><td><Badge value={item.estado} /></td><td className="text-nowrap">{item.fecha}</td><td><button className="btn btn-outline-primary btn-sm" onClick={() => { setError(''); setSelected(item); }}>Ver detalle</button></td></tr>)}</tbody></table></div> : <Empty />; }}</Resource></Panel>
    {creating && <Modal title="Registrar incidencia" onClose={() => { if (!busy) setCreating(false); }}><ErrorBox message={error} /><form onSubmit={create}><Input label="Título" name="titulo" required maxLength={200} /><Select label="Tipo de incidencia" name="tipo"><option>Actualización</option><option>Eliminación</option></Select><Textarea label="Detalle y motivo" name="detalle" required maxLength={10000} /><div className="dialog-actions"><button className="btn btn-outline-secondary" type="button" disabled={busy} onClick={() => setCreating(false)}>Cancelar</button><Submit busy={busy}>Registrar incidencia</Submit></div></form></Modal>}
    {selected && <Modal title={selected.codigo} onClose={() => { if (!busy) setSelected(null); }}><h3>{selected.titulo}</h3><Badge value={selected.estado} /><p className="ticket-description mt-3">{selected.detalle}</p><p className="text-secondary">Registrado por {selected.registradoPor} · {selected.fecha}</p><ErrorBox message={error} />{isManager(user) && <div className="dialog-actions"><button className="btn btn-outline-danger" disabled={busy} onClick={() => change('Rechazada')}>Rechazar</button><button className="btn btn-outline-primary" disabled={busy} onClick={() => change('En revisión')}>En revisión</button><button className="btn btn-success" disabled={busy} onClick={() => change('Aprobada')}>Aprobar</button></div>}</Modal>}
  </>;
}

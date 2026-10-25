import { useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useResource } from '../hooks/useResource.js';
import { Badge, Empty, ErrorBox, Icon, Input, Modal, PageHeading, Panel, Password, Resource, Select, Submit } from '../components/UI.jsx';

export default function Clients() {
  const { user } = useAuth(); const editable = user.rol === 'ADMINISTRADOR';
  const [filters,setFilters] = useState({ q:'',activo:'',desde:'',hasta:'' });
  const [search,setSearch] = useState(filters); const [editing,setEditing] = useState(null);
  const [filterError,setFilterError] = useState('');
  const resource = useResource(signal => api.clients(search,signal), [search]);
  const bind = key => ({ value:filters[key],onChange:event=>setFilters(previous=>({...previous,[key]:event.target.value})) });
  function filter(event) {
    event.preventDefault();
    if (filters.desde && filters.hasta && filters.desde > filters.hasta) { setFilterError('La fecha final debe ser igual o posterior a la inicial.'); return; }
    setFilterError(''); setSearch({...filters});
  }
  return <>
    <PageHeading title="Directorio de clientes" description={editable ? 'Gestiona razón social, documentos y contactos corporativos.' : 'Consulta los contactos corporativos para dar seguimiento a sus solicitudes.'}
      action={editable && <button className="btn btn-primary" onClick={()=>setEditing({})}><Icon name="person-plus" /> Registrar cliente</button>} />
    <Panel><form onSubmit={filter}>
      <Input label="Buscar clientes" placeholder="Código, razón social, documento, contacto o correo" maxLength={150} {...bind('q')} />
      <div className="row"><div className="col-md-4"><Select label="Estado de la cuenta" {...bind('activo')}><option value="">Todos</option><option value="true">Activos</option><option value="false">Inactivos</option></Select></div>
        <div className="col-md-4"><Input label="Registrados desde" type="date" {...bind('desde')} /></div><div className="col-md-4"><Input label="Registrados hasta" type="date" min={filters.desde} {...bind('hasta')} /></div></div>
      <ErrorBox message={filterError} /><div className="d-flex gap-2 mb-4"><button className="btn btn-primary" disabled={resource.loading}>Buscar</button><button type="button" className="btn btn-outline-secondary" onClick={()=>{const cleared={q:'',activo:'',desde:'',hasta:''};setFilters(cleared);setSearch(cleared);setFilterError('');}}>Limpiar filtros</button></div>
    </form><Resource resource={resource}>{data=>data?.length ? <>
      {data.length === 500 && <p className="text-secondary">Hay más resultados. Afina la búsqueda o el período para encontrarlos.</p>}
      <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Cliente</th><th>Documento</th><th>Contacto</th><th>Estado</th><th>Registro</th>{editable && <th>Acciones</th>}</tr></thead>
        <tbody>{data.map(item=><tr key={item.idCliente}><td><small className="d-block text-secondary">{item.codigo}</small><strong>{item.razonSocial}</strong></td><td>{item.tipoDocumento} {item.documento}</td>
          <td><strong className="d-block">{item.contactoNombre}</strong><span className="d-block">{item.correo}</span><small>{item.telefono}</small></td><td><Badge value={item.activo ? 'Activo':'Inactivo'} /></td><td>{item.fecha}</td>
          {editable && <td><button className="btn btn-sm btn-outline-primary" onClick={()=>setEditing(item)}>Editar ficha</button></td>}</tr>)}</tbody></table></div>
    </> : <Empty title="No hay clientes que coincidan" description="Prueba con otro documento, código o período." />}</Resource></Panel>
    {editing && <ClientForm client={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null);resource.reload();}} />}
  </>;
}

function ClientForm({client,onClose,onSaved}) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [type,setType]=useState(client.tipoDocumento || 'RUC');
  async function save(event) {
    event.preventDefault();setBusy(true);setError('');const body=Object.fromEntries(new FormData(event.currentTarget));
    try { if(client.idCliente) await api.updateClient(client.idCliente,body);else await api.createClient(body);onSaved(); }
    catch(err) {setError(err.message);}finally {setBusy(false);}
  }
  return <Modal title={client.idCliente ? 'Editar ficha del cliente':'Registrar cliente corporativo'} onClose={()=>{if(!busy)onClose();}}>
    <ErrorBox message={error} /><form onSubmit={save}>
      <Input label="Razón social" name="razonSocial" defaultValue={client.razonSocial || ''} maxLength={150} required />
      <div className="row"><div className="col-sm-4"><Select label="Tipo de documento" name="tipoDocumento" value={type} onChange={event=>setType(event.target.value)}><option>RUC</option><option>DNI</option></Select></div>
        <div className="col-sm-8"><Input label="Documento" name="documento" defaultValue={client.documento || ''} pattern={type === 'RUC' ? '[0-9]{11}' : '[0-9]{8}'} maxLength={type === 'RUC' ? 11 : 8} inputMode="numeric" required /></div></div>
      <Input label="Nombre del contacto" name="contactoNombre" defaultValue={client.contactoNombre || ''} maxLength={100} required />
      <Input label="Correo del cliente" name="correo" type="email" defaultValue={client.correo || ''} maxLength={120} required />
      <Input label="Teléfono del contacto" name="telefono" defaultValue={client.telefono || ''} maxLength={20} />
      <Input label="Dirección" name="direccion" defaultValue={client.direccion || ''} maxLength={200} />
      {!client.idCliente && <Password label="Contraseña inicial" name="password" minLength={8} autoComplete="new-password" required />}
      <p className="text-secondary">El correo se usa para iniciar sesión y recibir códigos de verificación. La activación de la cuenta se administra en Usuarios y roles.</p>
      <div className="dialog-actions"><button className="btn btn-outline-secondary" type="button" disabled={busy} onClick={onClose}>Cancelar</button><Submit busy={busy}>Guardar ficha</Submit></div>
    </form>
  </Modal>;
}

import { useState } from 'react';
import { api } from '../services/api.js';
import { useResource } from '../hooks/useResource.js';
import { ErrorBox, Input, Resource, Submit, useToast } from '../components/UI.jsx';

export default function Attachments({ticket,canUpload}) {
  const resource=useResource(signal=>api.attachments(ticket.idTicket,signal),[ticket.idTicket]);
  const [file,setFile]=useState(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const toast=useToast();
  async function upload(event) {
    event.preventDefault();if(!file)return;setBusy(true);setError('');const form=event.currentTarget;
    try {await api.uploadAttachment(ticket.idTicket,file);setFile(null);form.reset();resource.reload();toast('Adjunto guardado.');}
    catch(err) {setError(err.message);}finally {setBusy(false);}
  }
  async function download(item) {
    setBusy(true);setError('');try{await api.downloadAttachment(ticket.idTicket,item);}catch(err){setError(err.message);}finally{setBusy(false);}
  }
  return <section className="ticket-state-actions mb-4" aria-label="Archivos del caso"><h3>Archivos adjuntos</h3><ErrorBox message={error}/>
    <Resource resource={resource}>{data=>(data || []).length ? <ul className="list-unstyled">{data.map(item=><li key={item.idAdjunto} className="d-flex align-items-center justify-content-between gap-2 py-2 border-bottom"><span className="text-break">{item.nombre} <small className="text-secondary">{item.tamanoKb} KB</small></span><button className="btn btn-sm btn-outline-primary" disabled={busy || !item.disponible} onClick={()=>download(item)}>{item.disponible?'Descargar':'No disponible'}</button></li>)}</ul> : <p className="text-secondary">No hay archivos adjuntos.</p>}</Resource>
    {canUpload && <form onSubmit={upload}><Input label="Añadir archivo al caso" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy} required hint="PDF, PNG o JPEG. Máximo 2 MB; cinco archivos por ticket." onChange={event=>{const next=event.target.files?.[0];if(next?.size>2*1024*1024){setError('El archivo supera los 2 MB.');event.target.value='';setFile(null);}else{setError('');setFile(next || null);}}}/><Submit busy={busy} disabled={busy || !file}>Subir adjunto</Submit></form>}
  </section>;
}

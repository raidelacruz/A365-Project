const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

let csrfPromise;
export function clearCsrf() { csrfPromise = undefined; }
async function csrfToken() {
  if (!csrfPromise) csrfPromise = fetch(`${BASE}/auth/csrf`, { credentials: 'include', headers: { Accept: 'application/json' } })
    .then(async response => {
      if (!response.ok) throw new Error('No se pudo iniciar la verificación de seguridad.');
      const value = await response.json();
      if (!value.token || value.headerName !== 'X-CSRF-TOKEN') throw new Error('El servidor no entregó una verificación de seguridad válida.');
      return value;
    }).catch(error => { clearCsrf(); throw error; });
  return csrfPromise;
}
export async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  const headers = { Accept: 'application/json' };
  const multipart = body instanceof FormData;
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrf = await csrfToken(); headers[csrf.headerName] = csrf.token;
    }
    response = await fetch(`${BASE}${path}`, {
      method, signal, credentials: 'include', headers,
      ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; }
  catch { throw new Error('El servidor devolvió una respuesta inesperada. Inténtalo de nuevo.'); }
  if (['/auth/login', '/auth/verify-2fa', '/auth/logout', '/auth/restablecer-clave'].includes(path) || response.status === 403) clearCsrf();
  if (response.status === 401 && !path.startsWith('/auth/')) {
    clearCsrf(); window.dispatchEvent(new Event('a365:session-expired'));
  }
  if (!response.ok || data?.success === false) {
    const error = new Error(data?.error || data?.mensaje || `No se pudo completar la solicitud (${response.status}).`);
    error.status = response.status; throw error;
  }
  return data;
}

export function asList(value) {
  if (!Array.isArray(value)) throw new Error('No se pudo cargar el listado: el servidor devolvió un formato inesperado.');
  return value;
}

function query(values) {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(values || {})) if (value !== '' && value !== undefined && value !== null) params.set(key,value);
  return params.size ? `?${params}` : '';
}

export async function download(path, filename) {
  let response;
  try { response = await fetch(`${BASE}${path}`, { credentials: 'include' }); }
  catch { throw new Error('No pudimos descargar el archivo. Revisa tu conexión.'); }
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('a365:session-expired'));
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'No se pudo descargar el archivo.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const api = {
  me: signal => request('/auth/me', { signal }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  login: body => request('/auth/login', { method: 'POST', body }),
  verify: body => request('/auth/verify-2fa', { method: 'POST', body }),
  register: body => request('/auth/register-cliente', { method: 'POST', body }),
  recover: body => request('/auth/recuperar-clave', { method: 'POST', body }),
  reset: body => request('/auth/restablecer-clave', { method: 'POST', body }),
  tickets: (id, signal) => request(`/tickets${id ? `?idUsuario=${encodeURIComponent(id)}` : ''}`, { signal }).then(asList),
  createTicket: body => request('/tickets', { method: 'POST', body }),
  ticketState: (id, body) => request(`/tickets/${id}/estado`, { method: 'PATCH', body }),
  agents: signal => request('/tickets/agentes', { signal }).then(asList),
  assignTicket: (id, body) => request(`/tickets/${id}/asignacion`, { method: 'PATCH', body }),
  ticketHistory: (id, signal) => request(`/tickets/${id}/historial`, { signal }).then(asList),
  attachments: (id, signal) => request(`/tickets/${id}/adjuntos`, { signal }).then(asList),
  uploadAttachment: (id, file) => { const body = new FormData(); body.append('archivo',file); return request(`/tickets/${id}/adjuntos`, { method: 'POST', body }); },
  downloadAttachment: (id, item) => download(`/tickets/${id}/adjuntos/${item.idAdjunto}`, item.nombre),
  exportReport: (format, from, to) => download(`/reportes/exportar${query({ formato: format, desde: from, hasta: to })}`, `tickets-a365.${format}`),
  clients: (filters, signal) => request(`/clientes${query(filters)}`, { signal }).then(asList),
  createClient: body => request('/clientes', { method: 'POST', body }),
  updateClient: (id, body) => request(`/clientes/${id}`, { method: 'PUT', body }),
  messages: (id, signal) => request(`/tickets/${id}/mensajes`, { signal }).then(asList),
  sendMessage: (id, body) => request(`/tickets/${id}/mensajes`, { method: 'POST', body }),
  summary: signal => request('/dashboard/resumen', { signal }),
  users: signal => request('/usuarios', { signal }).then(asList),
  departments: signal => request('/usuarios/departamentos', { signal }).then(asList),
  user: (id, signal) => request(`/usuarios/${id}`, { signal }),
  createUser: body => request('/usuarios', { method: 'POST', body }),
  updateUser: (id, body) => request(`/usuarios/${id}`, { method: 'PUT', body }),
  userState: (id, activo) => request(`/usuarios/${id}/estado`, { method: 'PATCH', body: { activo } }),
  profile: (id, body) => request(`/usuarios/${id}/perfil`, { method: 'PUT', body }),
  preferences: (id, body) => request(`/usuarios/${id}/preferencias`, { method: 'PATCH', body }),
  changePassword: (id, body) => request(`/usuarios/${id}/cambiar-clave`, { method: 'POST', body }),
  sessions: (id, signal) => request(`/usuarios/${id}/sesiones`, { signal }).then(asList),
  incidents: signal => request('/incidencias', { signal }).then(asList),
  createIncident: body => request('/incidencias', { method: 'POST', body }),
  incidentState: (code, estado) => request(`/incidencias/${encodeURIComponent(code)}/estado`, { method: 'PATCH', body: { estado } }),
  smtp: signal => request('/config/smtp', { signal }),
  saveSmtp: body => request('/config/smtp', { method: 'POST', body }),
};

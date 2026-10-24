import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../components/UI.jsx';
import { request, clearCsrf } from '../services/api.js';

const admin = { idUsuario: 1, nombres: 'Grace', apellidos: 'Galán', rol: 'ADMINISTRADOR', correo: 'grace@example.test' };
const client = { idUsuario: 6, nombres: 'Cliente', apellidos: 'Prueba', rol: 'CLIENTE', correo: 'cliente@example.test' };
const ticket = { idTicket: 10, codigo: 'TK-2026-010', asunto: 'No puedo acceder', descripcion: 'Error de acceso', categoria: 'Software', estado: 'ABIERTO', prioridad: 'Alta', solicitante: 'Cliente Prueba', fecha: '2026-10-20 10:00' };
const respond = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));
function mount(path, user) {
  clearCsrf();
  const original = globalThis.fetch;
  vi.stubGlobal('fetch', (url, options) => {
    if (url.endsWith('/auth/csrf')) return respond({ token: 'test-csrf-token', headerName: 'X-CSRF-TOKEN' });
    if (url.endsWith('/auth/me')) return user ? respond({ usuario: user }) : respond({ error: 'Sin sesión' }, 401);
    if (url.endsWith('/auth/logout')) return respond({ success: true });
    return original(url, options);
  });
  return render(<MemoryRouter initialEntries={[path]}><ThemeProvider><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></ThemeProvider></MemoryRouter>);
}

describe('Funciones por rol', () => {
  const supervisor = { ...admin, idUsuario: 2, rol: 'SUPERVISOR' };
  const employee = { ...admin, idUsuario: 3, rol: 'EMPLEADO' };
  const assigned = { ...ticket, estado: 'ASIGNADO', idUsuarioCreador: 6, idUsuarioAsignado: 3, idEmpleadoAsignado: 7, responsable: 'Agente Uno' };
  it('el supervisor asigna un agente y prioridad y no recibe acciones de resolución técnica', async () => {
    const fetch = vi.fn((url, options) => url.endsWith('/agentes') ? respond([{ idEmpleado: 7, idUsuario: 3, nombre: 'Agente Uno', pendientes: 2 }])
      : url.endsWith('/asignacion') ? respond({ success: true, mensaje: 'Asignación guardada.' }) : url.endsWith('/mensajes') ? respond([]) : respond([assigned]));
    vi.stubGlobal('fetch', fetch); mount('/tickets', supervisor);
    expect(await screen.findByRole('heading', { name: 'Asignación de tickets' })).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalle/ }));
    expect(await screen.findByLabelText('Agente responsable')).toHaveValue('7');
    expect(screen.queryByRole('button', { name: 'Iniciar atención' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar como resuelto' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Prioridad del caso'), 'Baja');
    await userEvent.type(screen.getByLabelText('Motivo de asignación o cambio'), 'Repartir la carga');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar asignación' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [, options] = fetch.mock.calls.find(([url]) => url.endsWith('/asignacion'));
    expect(JSON.parse(options.body)).toEqual({ idEmpleado: 7, prioridad: 'Baja', motivo: 'Repartir la carga' });
  });
  it('el agente atiende su asignación sin acceso a distribución ni gestión de usuarios', async () => {
    const fetch = vi.fn(url => url.endsWith('/mensajes') ? respond([]) : respond([assigned]));
    vi.stubGlobal('fetch', fetch); mount('/atencion', employee);
    expect(await screen.findByRole('heading', { name: 'Mis casos asignados' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuarios y roles' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reportes' })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalle/ }));
    expect(screen.getByRole('button', { name: 'Iniciar atención' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar ticket' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Agente responsable')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Nota interna/ })).toBeInTheDocument();
    expect(fetch.mock.calls.some(([url]) => url.endsWith('/agentes'))).toBe(false);
  });
  it('el administrador consulta la auditoría sin sustituir al supervisor ni al agente', async () => {
    vi.stubGlobal('fetch', vi.fn(url => url.endsWith('/mensajes') ? respond([]) : respond([assigned])));
    mount('/tickets', admin); await userEvent.click(await screen.findByRole('button', { name: /Ver detalle/ }));
    expect(screen.queryByRole('button', { name: /Nueva solicitud/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar atención' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Agente responsable')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tu respuesta')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver historial del caso' })).toBeInTheDocument();
  });
  it('el cliente confirma la solución sin controles internos ni asignaciones', async () => {
    const fetch = vi.fn((url, options) => url.endsWith('/estado') ? respond({ success: true }) : url.endsWith('/mensajes') ? respond([]) : respond([{ ...assigned, estado: 'RESUELTO' }]));
    vi.stubGlobal('fetch', fetch); mount('/mis-solicitudes', client);
    await userEvent.click(await screen.findByRole('button', { name: /Resueltos/ }));
    await userEvent.click(await screen.findByRole('button', { name: /Ver detalle/ }));
    expect(screen.queryByRole('checkbox', { name: /Nota interna/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /historial del caso/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar solución y cerrar' }));
    await userEvent.type(screen.getByLabelText('Motivo del cambio'), 'Funciona correctamente');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const [, options] = fetch.mock.calls.find(([url]) => url.endsWith('/estado'));
    expect(JSON.parse(options.body)).toEqual({ estado: 'CERRADO', motivo: 'Funciona correctamente' });
  });
});

describe('Migración React', () => {
  it('cambia el tema en el portal y conserva la preferencia al navegar al login', async () => {
    mount('/');
    const logo = screen.getAllByRole('img', { name: 'IMPULSA A365' })[0];
    expect(logo).toHaveAttribute('src', '/Imagenes/logo.jpg');
    await userEvent.click(screen.getByRole('button', { name: 'Activar tema oscuro' }));
    expect(document.documentElement).toHaveAttribute('data-bs-theme', 'dark');
    expect(localStorage.getItem('a365_theme')).toBe('dark');
    await userEvent.click(screen.getByRole('link', { name: 'Iniciar sesión', exact: true }));
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Activar tema claro' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('restaura el tema oscuro guardado al abrir una página', () => {
    localStorage.setItem('a365_theme', 'dark'); mount('/login');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
  it('consume el catálogo de departamentos y conserva el área histórica al editar', async () => {
    const fetch = vi.fn(url => respond(url.endsWith('/departamentos') ? ['Tecnología', 'Soporte', 'RRHH'] : [{ ...admin, departamento: 'Área histórica', activo: true }]));
    vi.stubGlobal('fetch', fetch); mount('/usuarios', admin);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar', exact: true }));
    const select = screen.getByRole('combobox', { name: 'Departamento' });
    expect(select).toHaveValue('Área histórica');
    expect(within(select).getByRole('option', { name: 'Recursos Humanos (RRHH)' })).toHaveValue('RRHH');
    await userEvent.selectOptions(select, 'Soporte');
    expect(select).toHaveValue('Soporte');
    expect(fetch.mock.calls.some(([url]) => url === '/api/usuarios/departamentos')).toBe(true);
  });
  it('bloquea guardar usuarios si el catálogo falla y permite recargarlo', async () => {
    let failed = true;
    vi.stubGlobal('fetch', vi.fn(url => url.endsWith('/departamentos') ? failed ? respond({ error: 'Catálogo no disponible' }, 500) : respond(['Soporte']) : respond([])));
    mount('/usuarios', admin); await screen.findByText('Sin resultados');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar usuario' }));
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los departamentos');
    failed = false; await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Departamento' })).toBeEnabled());
    expect(screen.getByRole('option', { name: 'Soporte' })).toBeInTheDocument();
  });
  it('pide iniciar sesión antes de consultar una ruta privada', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); mount('/tickets');
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument(); expect(fetch).not.toHaveBeenCalled();
  });
  it('rechaza una sesión corrupta y mantiene accesible el login', async () => {
    sessionStorage.setItem('a365_session', '{'); mount('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  });
  it('restringe usuarios al administrador y consulta solo los tickets del cliente', async () => {
    const fetch = vi.fn(() => respond([])); vi.stubGlobal('fetch', fetch); mount('/usuarios', client);
    expect(await screen.findByRole('heading', { name: 'Mis solicitudes' })).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/tickets?idUsuario=6', expect.any(Object)));
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument(); expect(fetch.mock.calls.some(([url]) => url === '/api/usuarios')).toBe(false);
  });
  it('verifica el código sin completarlo con el código de demostración', async () => {
    const events = userEvent.setup();
    const fetch = vi.fn(url => url.endsWith('/login') ? respond({ success: true, requires2FA: true, idUsuario: 6, correo: client.correo, codigoDemo: '123456' }) : url.endsWith('/verify-2fa') ? respond({ success: true, usuario: client }) : respond([]));
    vi.stubGlobal('fetch', fetch); mount('/login');
    await events.type(await screen.findByLabelText('Correo o código de usuario'), client.correo); await events.type(screen.getByLabelText('Contraseña'), 'Password123'); await events.click(screen.getByRole('button', { name: /Ingresar al sistema/ }));
    const input = await screen.findByLabelText('Código de verificación'); expect(input).toHaveValue(''); expect(screen.queryByText(/Demostración local/)).not.toBeInTheDocument();
    await events.type(input, '654321'); await events.click(screen.getByRole('button', { name: 'Verificar y entrar' }));
    expect(await screen.findByRole('heading', { name: 'Mis solicitudes' })).toBeInTheDocument(); expect(sessionStorage.getItem('a365_session')).toBeNull();
    const [, options] = fetch.mock.calls.find(([url]) => url.endsWith('/verify-2fa')); expect(JSON.parse(options.body).codigoOtp).toBe('654321'); expect(JSON.parse(options.body)).not.toHaveProperty('idUsuario'); expect(options.credentials).toBe('include'); expect(options.headers['X-CSRF-TOKEN']).toBe('test-csrf-token');
  });
  it('conserva el formulario cuando la API rechaza la creación y permite reintentar', async () => {
    const events = userEvent.setup(); let attempts = 0;
    vi.stubGlobal('fetch', vi.fn((_url, options) => options?.method === 'POST' ? ++attempts === 1 ? respond({ error: 'No se pudo guardar el ticket.' }, 500) : respond({ success: true, mensaje: 'Ticket registrado.' }, 201) : respond([])));
    mount('/mis-solicitudes', client); await screen.findByText('No hay solicitudes en este estado');
    await events.click(screen.getByRole('button', { name: /Nueva solicitud/ }));
    await events.type(screen.getByLabelText('Asunto'), 'Error de red'); await events.type(screen.getByLabelText('Descripción'), 'Necesito ayuda con el acceso.'); await events.click(screen.getByRole('button', { name: 'Registrar solicitud' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el ticket.'); expect(screen.getByLabelText('Asunto')).toHaveValue('Error de red'); expect(screen.getByRole('dialog')).toBeInTheDocument();
    await events.click(screen.getByRole('button', { name: 'Registrar solicitud' })); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); expect(attempts).toBe(2);
  });
  it('muestra mensajes con HTML como texto y no crea nodos ejecutables', async () => {
    const payload = '<img src=x onerror="alert(1)">';
    vi.stubGlobal('fetch', vi.fn(url => url.endsWith('/mensajes') ? respond([{ idMensaje: 1, autorNombre: 'Cliente', autorRol: 'CLIENTE', contenido: payload }]) : respond([ticket])));
    mount('/tickets', admin); await userEvent.click(await screen.findByRole('button', { name: /Ver detalle/ }));
    const dialog = screen.getByRole('dialog'); expect(await within(dialog).findByText(payload)).toBeInTheDocument(); expect(dialog.querySelector('img')).toBeNull();
  });
  it('muestra error de red con reintento y no aparenta un listado vacío', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockImplementation(() => respond([ticket])); vi.stubGlobal('fetch', fetch);
    mount('/tickets', admin); expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar'); await userEvent.click(screen.getByRole('button', { name: 'Reintentar' })); expect(await screen.findByText('No puedo acceder')).toBeInTheDocument();
  });
  it('elimina la sesión al salir y vuelve a proteger la ruta', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respond([]))); mount('/tickets', admin);
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' })); expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument(); expect(sessionStorage.getItem('a365_session')).toBeNull();
  });
  it('rechaza respuestas success:false aun con estado HTTP 200', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respond({ success: false, error: 'Validación fallida' })));
    await expect(request('/tickets')).rejects.toThrow('Validación fallida');
  });
});

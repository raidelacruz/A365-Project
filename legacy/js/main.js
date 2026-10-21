/**
 * IMPULSA A365 - Script Principal Conectado al Backend REST (http://localhost:8089/api)
 * Conecta Dashboard, Tickets, Incidencias, Perfil y Reportes a Supabase PostgreSQL.
 */

const A365_API = 'http://localhost:8089/api';
let activeTicketModalId = null;
let activeIncidenciaCodigo = null;

document.addEventListener('DOMContentLoaded', () => {
  initAccessibilityToolbar();
  initSidebar();
  initActiveNavLink();
  initPasswordToggles();
  aplicarSesionYPermisosPorRol();
  sincronizarVistasConBackend();
});

/**
 * Barra de Accesibilidad Senior-Friendly (A / A+ / A++) inyectada en el Top Navbar
 * para facilitar la lectura a adultos y adultos mayores en todas las interfaces internas.
 */
function initAccessibilityToolbar() {
  const savedScale = parseFloat(localStorage.getItem('a365_font_scale') || '1');
  document.documentElement.style.setProperty('--font-scale', savedScale);

  const navbarRight = document.querySelector('.top-navbar .navbar-right');
  if (!navbarRight || document.getElementById('a365AccessSwitcher')) return;

  const switcher = document.createElement('div');
  switcher.id = 'a365AccessSwitcher';
  switcher.className = 'd-none d-sm-flex align-items-center gap-1 bg-light border rounded-pill px-2 py-1 me-1';
  switcher.title = 'Tamaño de letra para lectura cómoda';
  switcher.innerHTML = `
    <span class="small fw-bold text-secondary me-1" style="font-size:0.78rem;"><i class="bi bi-universal-access me-1 text-primary"></i>Letra:</span>
    <button type="button" class="btn btn-sm rounded-pill px-2 py-0 fw-bold a365-font-btn ${savedScale === 1 ? 'btn-primary text-white' : 'btn-light'}" data-scale="1">A</button>
    <button type="button" class="btn btn-sm rounded-pill px-2 py-0 fw-bold a365-font-btn ${savedScale === 1.12 ? 'btn-primary text-white' : 'btn-light'}" data-scale="1.12">A+</button>
    <button type="button" class="btn btn-sm rounded-pill px-2 py-0 fw-bold a365-font-btn ${savedScale === 1.24 ? 'btn-primary text-white' : 'btn-light'}" data-scale="1.24">A++</button>
  `;

  navbarRight.insertBefore(switcher, navbarRight.firstChild);

  switcher.querySelectorAll('.a365-font-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sc = parseFloat(btn.getAttribute('data-scale') || '1');
      document.documentElement.style.setProperty('--font-scale', sc);
      localStorage.setItem('a365_font_scale', sc);
      switcher.querySelectorAll('.a365-font-btn').forEach(b => {
        b.classList.remove('btn-primary', 'text-white');
        b.classList.add('btn-light');
      });
      btn.classList.remove('btn-light');
      btn.classList.add('btn-primary', 'text-white');
    });
  });
}

function initSidebar() {
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (toggleBtn && sidebar && overlay) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    });
  }
}

function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
  const navLinks = document.querySelectorAll('.sidebar-menu .nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.toggle-password-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          if (icon) {
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
          }
        } else {
          input.type = 'password';
          if (icon) {
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
          }
        }
      }
    });
  });
}

function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  const toastId = 'toast_' + Date.now();
  const bgClass = type === 'success' ? 'bg-success text-white' : type === 'danger' ? 'bg-danger text-white' : 'bg-primary text-white';
  const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-envelope-check-fill';

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icon} fs-5"></i>
          <div>${message}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  const toastElement = document.getElementById(toastId);
  if (window.bootstrap && window.bootstrap.Toast) {
    const toast = new bootstrap.Toast(toastElement, { delay: 4500 });
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => toastElement.remove());
  } else {
    setTimeout(() => toastElement.remove(), 4500);
  }
}

function aplicarSesionYPermisosPorRol() {
  const rawUser = localStorage.getItem('a365_user');
  if (!rawUser) return;

  try {
    const user = JSON.parse(rawUser);
    const fullName = ((user.nombres || '') + ' ' + (user.apellidos || '')).trim() || user.correo;
    const initials = ((user.nombres || 'U')[0] + ((user.apellidos || '')[0] || '')).toUpperCase();
    const rol = (user.rol || 'EMPLEADO').toUpperCase();

    document.querySelectorAll('.user-profile-badge .user-name').forEach(el => el.innerText = fullName);
    document.querySelectorAll('.user-profile-badge .user-role').forEach(el => el.innerText = rol);
    document.querySelectorAll('.user-profile-badge .avatar-circle').forEach(el => el.innerText = initials);

    const alertMsg = localStorage.getItem('a365_login_alert');
    if (alertMsg) {
      localStorage.removeItem('a365_login_alert');
      setTimeout(() => {
        showToast('📧 Alerta de Seguridad: ' + alertMsg, 'info');
      }, 400);
    }

    if (rol === 'EMPLEADO') {
      document.querySelectorAll('.sidebar-menu a[href="usuarios.html"]').forEach(link => {
        const li = link.closest('li');
        if (li) li.style.display = 'none';
      });
      document.querySelectorAll('.sidebar-menu a[href="dashboard.html"]').forEach(link => {
        link.setAttribute('href', 'empleado.html');
      });
    }
  } catch (e) {
    console.error(e);
  }
}

function sincronizarVistasConBackend() {
  const path = window.location.pathname.split('/').pop() || 'dashboard.html';

  // 1. DASHBOARD: KPIs desde Supabase
  if (path === 'dashboard.html') {
    fetch(`${A365_API}/dashboard/resumen`)
      .then(res => res.json())
      .then(data => {
        const kpiValues = document.querySelectorAll('.kpi-card .kpi-value');
        if (kpiValues.length >= 4) {
          kpiValues[0].innerText = data.pendientes ?? 0;
          kpiValues[1].innerText = data.atendidos ?? 0;
          kpiValues[2].innerText = data.cancelados ?? 0;
          kpiValues[3].innerText = data.totalMes ?? 0;
        }
      })
      .catch(() => {});
  }

  // 1.B REPORTES: Porcentajes por categoría desde Supabase
  if (path === 'reportes.html') {
    fetch(`${A365_API}/dashboard/resumen`)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data.porCategoria) || !data.totalMes) return;
        const total = data.totalMes || 1;
        const bars = document.querySelectorAll('.col-lg-5 .card-custom-body > div');
        data.porCategoria.forEach((cat, idx) => {
          if (bars[idx]) {
            const pct = Math.round(((cat.total || 0) / total) * 100);
            const strong = bars[idx].querySelector('strong');
            const bar = bars[idx].querySelector('.progress-bar');
            if (strong) strong.innerText = `${pct}% (${cat.total})`;
            if (bar) bar.style.width = `${pct}%`;
          }
        });
      })
      .catch(() => {});
  }

  // 2. MESA DE AYUDA (tickets.html): Listar, crear, responder chat y resolver en Supabase
  if (path === 'tickets.html') {
    cargarTicketsEnVistaTickets();

    const nuevoTicketForm = document.getElementById('nuevoTicketForm');
    if (nuevoTicketForm) {
      nuevoTicketForm.addEventListener('submit', e => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('a365_user') || '{}');
        const payload = {
          idUsuario: user.idUsuario || 1,
          solicitanteNombre: ((user.nombres || 'Grace') + ' ' + (user.apellidos || 'Galán')).trim(),
          asunto: document.getElementById('ticketTitulo').value.trim(),
          categoria: document.getElementById('ticketCategoria').value,
          prioridad: document.getElementById('ticketPrioridad').value,
          descripcion: document.getElementById('ticketDescripcion').value.trim()
        };

        fetch(`${A365_API}/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(res => res.json())
          .then(data => {
            const modalEl = document.getElementById('nuevoTicketModal');
            if (modalEl && window.bootstrap) {
              const m = bootstrap.Modal.getInstance(modalEl);
              if (m) m.hide();
            }
            nuevoTicketForm.reset();
            showToast(data.mensaje || 'Ticket guardado en Supabase', 'success');
            cargarTicketsEnVistaTickets();
          });
      });
    }

    // Conectar botón "Marcar como Resuelto" y formulario de chat del modal detalleTicketModal
    const modalDetalle = document.getElementById('detalleTicketModal');
    if (modalDetalle) {
      const btnSuccess = modalDetalle.querySelector('.modal-footer .btn-success');
      if (btnSuccess) {
        btnSuccess.removeAttribute('onclick');
        btnSuccess.addEventListener('click', () => {
          if (!activeTicketModalId) return;
          resolverTicketDirecto(activeTicketModalId);
          bootstrap.Modal.getInstance(modalDetalle).hide();
        });
      }
      const replyForm = modalDetalle.querySelector('form');
      if (replyForm) {
        replyForm.removeAttribute('onsubmit');
        replyForm.addEventListener('submit', e => {
          e.preventDefault();
          const input = document.getElementById('chatReplyText');
          if (!input || !input.value.trim() || !activeTicketModalId) return;
          const user = JSON.parse(localStorage.getItem('a365_user') || '{}');
          fetch(`${A365_API}/tickets/${activeTicketModalId}/mensajes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idUsuario: user.idUsuario || 1,
              autorNombre: ((user.nombres || 'Grace') + ' ' + (user.apellidos || 'Galán')).trim(),
              autorRol: user.rol || 'Soporte',
              contenido: input.value.trim()
            })
          })
            .then(res => res.json())
            .then(() => {
              input.value = '';
              showToast('Respuesta guardada en Supabase', 'success');
              cargarHiloMensajesModal(activeTicketModalId);
            });
        });
      }
    }
  }

  // 3. MÓDULO DE INCIDENCIAS (incidencias.html): Listar, crear y aprobar/rechazar en Supabase
  if (path === 'incidencias.html') {
    cargarIncidenciasEnVista();

    const nuevaIncidenciaForm = document.getElementById('nuevaIncidenciaForm');
    if (nuevaIncidenciaForm) {
      nuevaIncidenciaForm.addEventListener('submit', e => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('a365_user') || '{}');
        const payload = {
          idUsuario: user.idUsuario || 1,
          registradoPor: ((user.nombres || 'Carlos') + ' ' + (user.apellidos || 'Mendoza')).trim(),
          tipo: document.getElementById('incTipo').value,
          titulo: document.getElementById('incTitulo').value.trim(),
          detalle: document.getElementById('incDetalle').value.trim()
        };

        fetch(`${A365_API}/incidencias`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(res => res.json())
          .then(data => {
            const modalEl = document.getElementById('nuevaIncidenciaModal');
            if (modalEl && window.bootstrap) {
              const m = bootstrap.Modal.getInstance(modalEl);
              if (m) m.hide();
            }
            nuevaIncidenciaForm.reset();
            showToast(data.mensaje || 'Incidencia registrada en Supabase', 'success');
            cargarIncidenciasEnVista();
          });
      });
    }

    // Conectar botones Aprobar / Rechazar del modal revisarIncidenciaModal a Supabase
    const modalRev = document.getElementById('revisarIncidenciaModal');
    if (modalRev) {
      const btnRechazar = modalRev.querySelector('.modal-footer .btn-outline-danger');
      const btnAprobar = modalRev.querySelector('.modal-footer .btn-success');
      if (btnRechazar) {
        btnRechazar.removeAttribute('onclick');
        btnRechazar.addEventListener('click', () => actualizarEstadoIncidenciaSupabase('Rechazada'));
      }
      if (btnAprobar) {
        btnAprobar.removeAttribute('onclick');
        btnAprobar.addEventListener('click', () => actualizarEstadoIncidenciaSupabase('Aprobada'));
      }
    }
  }

  // 4. PERFIL DE USUARIO (perfil.html): Cargar y guardar en Supabase
  if (path === 'perfil.html') {
    const user = JSON.parse(localStorage.getItem('a365_user') || '{"idUsuario":1}');
    const idUsuario = user.idUsuario || 1;

    fetch(`${A365_API}/usuarios/${idUsuario}`)
      .then(res => res.json())
      .then(u => {
        if (!u || !u.idUsuario) return;
        const fullName = ((u.nombres || '') + ' ' + (u.apellidos || '')).trim();
        const initials = ((u.nombres || 'U')[0] + ((u.apellidos || '')[0] || '')).toUpperCase();

        const titleEl = document.querySelector('.profile-content h4');
        const badgeEl = document.querySelector('.profile-content .badge');
        const avatarLg = document.querySelector('.profile-avatar-wrap .avatar-lg');
        if (titleEl) titleEl.innerText = fullName;
        if (badgeEl) badgeEl.innerText = (u.rol || 'USUARIO') + ' • ' + (u.departamento || 'General');
        if (avatarLg) avatarLg.innerText = initials;

        if (document.getElementById('profNombre')) document.getElementById('profNombre').value = fullName;
        if (document.getElementById('profEmail')) document.getElementById('profEmail').value = u.correo || '';
        if (document.getElementById('profCelular')) document.getElementById('profCelular').value = u.telefono || '';
        if (document.getElementById('profDireccion')) document.getElementById('profDireccion').value = u.direccion || 'Lima, Perú';
        if (document.getElementById('profDni')) document.getElementById('profDni').value = u.dniRuc || '';
      })
      .catch(() => {});

    const perfilForm = document.getElementById('perfilForm');
    if (perfilForm) {
      perfilForm.addEventListener('submit', e => {
        e.preventDefault();
        const payload = {
          nombreCompleto: document.getElementById('profNombre').value.trim(),
          correo: document.getElementById('profEmail').value.trim(),
          telefono: document.getElementById('profCelular').value.trim(),
          dniRuc: document.getElementById('profDni').value.trim()
        };

        fetch(`${A365_API}/usuarios/${idUsuario}/perfil`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(res => res.json())
          .then(data => {
            if (!data.success) {
              showToast(data.error || 'Error al actualizar perfil', 'danger');
              return;
            }
            const updatedUser = Object.assign({}, user, {
              nombres: data.nombres,
              apellidos: data.apellidos,
              correo: data.correo,
              telefono: data.telefono,
              dniRuc: data.dniRuc
            });
            localStorage.setItem('a365_user', JSON.stringify(updatedUser));
            aplicarSesionYPermisosPorRol();
            const titleEl = document.querySelector('.profile-content h4');
            if (titleEl) titleEl.innerText = payload.nombreCompleto;
            showToast(data.mensaje || 'Perfil actualizado en Supabase', 'success');
          });
      });
    }
  }
}

function cargarTicketsEnVistaTickets() {
  const containerPendientes = document.getElementById('ticketsListContainer');
  const paneCompletados = document.getElementById('completados-pane');
  const paneCancelados = document.getElementById('cancelados-pane');
  if (!containerPendientes) return;

  fetch(`${A365_API}/tickets`)
    .then(res => res.json())
    .then(tickets => {
      if (!Array.isArray(tickets)) return;

      const pendientes = tickets.filter(t => t.estado !== 'RESUELTO' && t.estado !== 'CERRADO' && t.estado !== 'CANCELADO');
      const completados = tickets.filter(t => t.estado === 'RESUELTO' || t.estado === 'CERRADO');
      const cancelados = tickets.filter(t => t.estado === 'CANCELADO');

      // Actualizar contadores de las 3 pestañas
      const pendBtnBadge = document.querySelector('#pendientes-tab .badge');
      const compBtnBadge = document.querySelector('#completados-tab .badge');
      const cancBtnBadge = document.querySelector('#cancelados-tab .badge');
      if (pendBtnBadge) pendBtnBadge.innerText = pendientes.length;
      if (compBtnBadge) compBtnBadge.innerText = completados.length;
      if (cancBtnBadge) cancBtnBadge.innerText = cancelados.length;

      // Renderizar PENDIENTES (cuando se marca resuelto, desaparece de aquí automáticamente)
      containerPendientes.innerHTML = '';
      if (pendientes.length === 0) {
        containerPendientes.innerHTML = `
          <div class="card-custom text-center py-5">
            <i class="bi bi-emoji-smile text-success fs-1 mb-2"></i>
            <h5 class="fw-bold">¡No hay tickets pendientes por atender!</h5>
            <p class="text-muted mb-0">Todos los tickets han sido resueltos y movidos a la pestaña de Completados.</p>
          </div>
        `;
      } else {
        pendientes.forEach(t => containerPendientes.appendChild(crearTarjetaTicketHTML(t, true)));
      }

      // Renderizar COMPLETADOS / RESUELTOS
      if (paneCompletados) {
        paneCompletados.innerHTML = '<div class="d-flex flex-column gap-3" id="ticketsCompletadosContainer"></div>';
        const compContainer = document.getElementById('ticketsCompletadosContainer');
        if (completados.length === 0) {
          compContainer.innerHTML = `
            <div class="card-custom text-center py-5">
              <i class="bi bi-check-circle text-success fs-1 mb-2"></i>
              <h5>Sin tickets resueltos aún</h5>
              <p class="text-muted small mb-0">Cuando marques un ticket como Resuelto, pasará automáticamente a esta lista.</p>
            </div>
          `;
        } else {
          completados.forEach(t => compContainer.appendChild(crearTarjetaTicketHTML(t, false)));
        }
      }

      // Renderizar CANCELADOS
      if (paneCancelados) {
        paneCancelados.innerHTML = '<div class="d-flex flex-column gap-3" id="ticketsCanceladosContainer"></div>';
        const cancContainer = document.getElementById('ticketsCanceladosContainer');
        if (cancelados.length === 0) {
          cancContainer.innerHTML = `
            <div class="card-custom text-center py-5">
              <i class="bi bi-x-circle text-danger fs-1 mb-2"></i>
              <h5>0 Tickets Cancelados</h5>
              <p class="text-muted small mb-0">Solicitudes duplicadas o desestimadas aparecerán aquí.</p>
            </div>
          `;
        } else {
          cancelados.forEach(t => cancContainer.appendChild(crearTarjetaTicketHTML(t, false)));
        }
      }
    })
    .catch(() => {});
}

function crearTarjetaTicketHTML(t, mostrarBotonResolver) {
  const prioLower = (t.prioridad || 'media').toLowerCase();
  const codigoClean = (t.codigo || 'TK-000').replace('#', '');
  let statusClass = 'badge-status-pendiente';
  let statusLabel = t.estado || 'ABIERTO';
  let iconBg = '#e0f2fe';
  let iconColor = '#0284c7';
  let iconName = 'bi-ticket-perforated';

  if (statusLabel === 'EN_PROCESO') {
    statusClass = 'badge-status-proceso';
    statusLabel = 'En Proceso';
    iconBg = '#fef3c7';
    iconColor = '#d97706';
    iconName = 'bi-hourglass-split';
  } else if (statusLabel === 'RESUELTO' || statusLabel === 'CERRADO') {
    statusClass = 'badge-status-aprobada';
    statusLabel = 'Resuelto ✓';
    iconBg = '#dcfce7';
    iconColor = '#15803d';
    iconName = 'bi-patch-check-fill';
  } else if (statusLabel === 'CANCELADO') {
    statusClass = 'badge bg-danger';
    statusLabel = 'Cancelado';
    iconBg = '#fee2e2';
    iconColor = '#dc2626';
    iconName = 'bi-x-octagon-fill';
  }

  const card = document.createElement('div');
  card.className = 'card-custom mb-0 ticket-card';
  card.setAttribute('data-priority', prioLower);
  card.setAttribute('data-search', `${codigoClean} ${t.asunto} ${t.solicitante} ${t.categoria}`.toLowerCase());
  card.innerHTML = `
    <div class="card-custom-body p-3 p-md-4">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-start gap-3">
          <div class="avatar-circle" style="background: ${iconBg}; color: ${iconColor}; width: 48px; height: 48px; font-size: 1.3rem;">
            <i class="bi ${iconName}"></i>
          </div>
          <div>
            <div class="d-flex align-items-center gap-2 mb-1">
              <span class="badge bg-light text-dark border fw-bold" style="font-size:0.85rem;">#${codigoClean}</span>
              <span class="small text-muted fw-semibold">${t.categoria || 'Soporte'}</span>
            </div>
            <h6 class="fw-bold text-dark mb-1" style="font-size:1.05rem;">${t.asunto}</h6>
            <div class="text-muted small">
              <span>Cliente: <strong class="text-dark">${t.solicitante || 'Cliente'}</strong></span>
              <span class="mx-1">•</span>
              <span><i class="bi bi-clock me-1"></i>${t.fecha || ''}</span>
            </div>
          </div>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-2">
          <span class="badge-priority-${prioLower}">${t.prioridad}</span>
          <span class="${statusClass}">${statusLabel}</span>
          ${mostrarBotonResolver ? `
            <button class="btn btn-success d-flex align-items-center gap-1 fw-bold px-3" onclick="resolverTicketDirecto(${t.idTicket})" title="Marcar como Resuelto y mover a Completados">
              <i class="bi bi-check2-circle"></i>
              <span>Resolver</span>
            </button>
          ` : ''}
          <button class="btn btn-outline-primary d-flex align-items-center gap-2 fw-bold px-3" data-bs-toggle="modal" data-bs-target="#detalleTicketModal"
            onclick="abrirDetalleTicketSupabase(${t.idTicket}, '${codigoClean}', '${(t.asunto || '').replace(/'/g, '')}', '${t.prioridad}', '${statusLabel}', '${(t.solicitante || 'Cliente').replace(/'/g, '')}', '${(t.descripcion || '').replace(/'/g, '')}')">
            <i class="bi bi-chat-dots-fill"></i>
            <span>Ver Chat / Hilo</span>
          </button>
        </div>
      </div>
    </div>
  `;
  return card;
}

function abrirDetalleTicketSupabase(idTicket, codigo, titulo, prioridad, estado, usuario, descripcion) {
  activeTicketModalId = idTicket;
  if (typeof cargarDetalleTicket === 'function') {
    cargarDetalleTicket(codigo, titulo, prioridad, estado, usuario);
  }
  const descEl = document.getElementById('modalTicketDescText');
  if (descEl) {
    descEl.innerText = descripcion || 'Solicitud registrada por el cliente.';
  }
  cargarHiloMensajesModal(idTicket);
}

function cargarHiloMensajesModal(idTicket) {
  const modal = document.getElementById('detalleTicketModal');
  if (!modal) return;
  const chatBox = modal.querySelector('.bg-light.rounded-3.mb-3') || document.getElementById('adminChatHistoryBox');
  if (!chatBox) return;

  chatBox.innerHTML = '<div class="text-center py-3 text-muted small">Cargando conversación en tiempo real...</div>';

  fetch(`${A365_API}/tickets/${idTicket}/mensajes`)
    .then(res => res.json())
    .then(msgs => {
      chatBox.innerHTML = '';
      if (!Array.isArray(msgs) || msgs.length === 0) {
        chatBox.innerHTML = `
          <div class="text-center py-4 text-muted">
            <i class="bi bi-chat-square-dots fs-3 d-block mb-1"></i>
            Aún no hay mensajes en este hilo. Escribe abajo para comunicarte con el cliente.
          </div>
        `;
        return;
      }
      msgs.forEach(m => {
        const rolUpper = (m.autorRol || '').toUpperCase();
        const isClient = rolUpper.includes('CLIENTE') || rolUpper.includes('USUARIO');
        const bubbleBg = isClient ? '#ffffff' : '#e0f2fe';
        const borderCol = isClient ? '#cbd5e1' : '#7dd3fc';
        const alignClass = isClient ? 'me-auto' : 'ms-auto';
        const badgeRol = isClient
          ? '<span class="badge bg-secondary-subtle text-dark border">Cliente</span>'
          : '<span class="badge bg-primary text-white">Soporte A365</span>';

        chatBox.innerHTML += `
          <div class="mb-3 ${alignClass}" style="max-width: 88%;">
            <div class="d-flex justify-content-between align-items-center small text-muted mb-1 gap-2">
              <div><strong class="text-dark">${m.autorNombre}</strong> ${badgeRol}</div>
              <span>${m.fecha || ''}</span>
            </div>
            <div class="p-3 rounded-4 shadow-sm" style="background-color: ${bubbleBg}; border: 1.5px solid ${borderCol}; font-size: 0.98rem; color: #0f172a;">
              ${m.contenido}
            </div>
          </div>
        `;
      });
      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

function resolverTicketDirecto(idTicket) {
  fetch(`${A365_API}/tickets/${idTicket}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'RESUELTO' })
  })
    .then(res => res.json())
    .then(() => {
      showToast('✅ Ticket RESUELTO: Movido de Pendientes a Completados', 'success');
      cargarTicketsEnVistaTickets();
    });
}

function cargarIncidenciasEnVista() {
  const list = document.getElementById('incidenciasList');
  if (!list) return;

  fetch(`${A365_API}/incidencias`)
    .then(res => res.json())
    .then(items => {
      if (!Array.isArray(items) || items.length === 0) return;
      list.innerHTML = '';
      const countEl = document.getElementById('incidenciasCount');
      if (countEl) countEl.innerText = items.length;

      items.forEach(inc => {
        const isElim = (inc.tipo || '').toLowerCase().includes('elim');
        const badgeColor = isElim ? 'background-color: #fee2e2; color: #b91c1c;' : 'background-color: #e0f2fe; color: #0369a1;';
        const iconClass = isElim ? 'bi-trash3' : 'bi-arrow-repeat';
        let statusClass = 'badge-status-pendiente';
        if (inc.estado === 'Aprobada') statusClass = 'badge-status-aprobada';
        else if (inc.estado === 'En revisión') statusClass = 'badge-status-proceso';
        else if (inc.estado === 'Rechazada') statusClass = 'badge bg-danger';

        const div = document.createElement('div');
        div.className = 'card-custom mb-0 incidencia-card';
        div.setAttribute('data-type', isElim ? 'eliminacion' : 'actualizacion');
        div.setAttribute('data-search', `${inc.codigo} ${inc.titulo} ${inc.registradoPor}`.toLowerCase());
        div.innerHTML = `
          <div class="card-custom-body p-3 p-md-4">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div class="d-flex align-items-center gap-3">
                <div class="avatar-circle" style="${badgeColor} width: 44px; height: 44px; font-size: 1.2rem;">
                  <i class="bi ${iconClass}"></i>
                </div>
                <div>
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge" style="${badgeColor} font-weight: 700;">[${inc.tipo}]</span>
                    <h6 class="fw-bold text-dark mb-0">${inc.titulo}</h6>
                  </div>
                  <div class="text-muted small">
                    <span>Registrado por: <strong>${inc.registradoPor}</strong></span>
                    <span class="mx-1">•</span>
                    <span>${inc.fecha || ''}</span>
                  </div>
                </div>
              </div>
              <div class="d-flex align-items-center gap-3">
                <span class="${statusClass}">${inc.estado}</span>
                <button class="btn btn-sm btn-outline-secondary px-3" data-bs-toggle="modal" data-bs-target="#revisarIncidenciaModal"
                  onclick="seleccionarIncidenciaParaRevision('${inc.codigo}', '${(inc.titulo || '').replace(/'/g, '')}', '${inc.tipo}', '${inc.estado}', '${(inc.registradoPor || '').replace(/'/g, '')}', '${(inc.detalle || '').replace(/'/g, '')}')">
                  Revisar
                </button>
              </div>
            </div>
          </div>
        `;
        list.appendChild(div);
      });
    })
    .catch(() => {});
}

function seleccionarIncidenciaParaRevision(codigo, titulo, tipo, estado, usuario, detalle) {
  activeIncidenciaCodigo = codigo;
  if (typeof abrirRevision === 'function') {
    abrirRevision(codigo, titulo, tipo, estado, usuario, detalle);
  }
}

function actualizarEstadoIncidenciaSupabase(nuevoEstado) {
  const codigo = activeIncidenciaCodigo || (document.getElementById('modalIncCode') && document.getElementById('modalIncCode').innerText);
  if (!codigo) return;

  fetch(`${A365_API}/incidencias/${codigo}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: nuevoEstado })
  })
    .then(res => res.json())
    .then(data => {
      const modalEl = document.getElementById('revisarIncidenciaModal');
      if (modalEl && window.bootstrap) {
        const m = bootstrap.Modal.getInstance(modalEl);
        if (m) m.hide();
      }
      showToast(data.mensaje || ('Incidencia ' + nuevoEstado), nuevoEstado === 'Aprobada' ? 'success' : 'danger');
      cargarIncidenciasEnVista();
    });
}

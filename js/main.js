/**
 * IMPULSA A365 - Script Principal Compartido (Vanilla JS)
 * Manejo de navegación, interactividad, filtros, modales y almacenamiento local simulado.
 */

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initActiveNavLink();
  initPasswordToggles();
  initFormSimulations();
});

// Manejo del sidebar responsivo
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

// Resaltar enlace activo según la URL
function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
  const navLinks = document.querySelectorAll('.sidebar-menu .nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Alternar visualización de contraseñas (ojo)
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

// Notificación Toast interactiva y flotante
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
  const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';

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
    const toast = new bootstrap.Toast(toastElement, { delay: 3500 });
    toast.show();
    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  } else {
    setTimeout(() => { toastElement.remove(); }, 3500);
  }
}

// Simulaciones de envío de formularios en toda la aplicación
function initFormSimulations() {
  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Ingresando...';
      }
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    });
  }

  // Nuevo Ticket Form
  const nuevoTicketForm = document.getElementById('nuevoTicketForm');
  if (nuevoTicketForm) {
    nuevoTicketForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const modalEl = document.getElementById('nuevoTicketModal');
      if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      nuevoTicketForm.reset();
      showToast('¡Ticket registrado exitosamente! Código asignado: #TK-2026-004');
    });
  }

  // Nueva Incidencia Form
  const nuevaIncidenciaForm = document.getElementById('nuevaIncidenciaForm');
  if (nuevaIncidenciaForm) {
    nuevaIncidenciaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const modalEl = document.getElementById('nuevaIncidenciaModal');
      if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      nuevaIncidenciaForm.reset();
      showToast('¡Incidencia registrada correctamente para revisión técnica!');
    });
  }

  // Nuevo Usuario Form
  const nuevoUsuarioForm = document.getElementById('nuevoUsuarioForm');
  if (nuevoUsuarioForm) {
    nuevoUsuarioForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const modalEl = document.getElementById('nuevoUsuarioModal');
      if (modalEl && window.bootstrap) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      nuevoUsuarioForm.reset();
      showToast('¡Nuevo usuario agregado a la plataforma con éxito!');
    });
  }

  // Perfil Form
  const perfilForm = document.getElementById('perfilForm');
  if (perfilForm) {
    perfilForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Datos de perfil actualizados correctamente');
    });
  }

  // Configuración Form
  const configuracionForm = document.getElementById('configuracionForm');
  if (configuracionForm) {
    configuracionForm.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Configuraciones guardadas exitosamente');
    });
  }
}

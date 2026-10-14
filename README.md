# IMPULSA A365 - Frontend de Vistas del Avance 2

Prototipo de vistas e interfaces de usuario desarrolladas en **HTML5, CSS3 y Vanilla JavaScript**, diseñadas en estricta fidelidad con los wireframes y maquetas de **Figma** presentados en el **Segundo Avance (APF2)** del proyecto:
> *"Desarrollo de un Aplicativo Web para mejorar la Gestión de Ventas en la empresa IMPULSA A365 S.A.C."*

---

## 🚀 Cómo Visualizar el Proyecto

No requiere instalación de librerías ni dependencias complejas. Puedes abrir cualquier vista directamente en tu navegador favorito:
1. Haz doble clic en [`index.html`](index.html) o [`login.html`](login.html).
2. O utiliza una extensión como **Live Server** en VS Code.

---

## 📂 Vistas Desarrolladas e Interconectadas

| # | Archivo | Vista | Descripción y Funcionalidad |
|---|---------|-------|-----------------------------|
| 1 | [`login.html`](login.html) | **Inicio de Sesión** | Formulario con código institucional, contraseña (con botón de mostrar/ocultar), enlace a recuperación y panel lateral corporativo con métricas en tiempo real. |
| 2 | [`recuperar-clave.html`](recuperar-clave.html) | **Recuperación de Clave** | Flujo de recuperación mediante correo institucional vinculado a la tabla `recuperacion_clave`. |
| 3 | [`dashboard.html`](dashboard.html) | **Panel Principal** | 4 tarjetas KPI (Pendientes, Atendidos, Cancelados, Total Mes), mini-calendario con agenda, estado de tickets activos y línea de tiempo (*timeline*) del día. |
| 4 | [`tickets.html`](tickets.html) | **Gestión de Tickets** | Mesa de ayuda con buscador interactivo, filtro por prioridad, pestañas de estado (*Pendientes*, *Completados*, *Cancelados*), modal para registrar nuevo ticket y modal con historial/chat técnico. |
| 5 | [`incidencias.html`](incidencias.html) | **Módulo de Incidencias** | Listado de incidencias con badges de tipo (*Actualización*, *Eliminación*), estados (*Pendiente*, *En revisión*, *Aprobada*), modal de registro y modal de auditoría/aprobación. |
| 6 | [`reportes.html`](reportes.html) | **Reportes y Analítica** | 3 tarjetas métricas analíticas (Resolución promedio 4.2h, Tickets por agente 12.5, CSAT 4.8/5), gráfico mensual interactivo con Chart.js, desglose porcentual por categorías y catálogo de reportes clave (R01 a R05). |
| 7 | [`usuarios.html`](usuarios.html) | **Registro de Usuarios** | Directorio institucional de colaboradores (5 usuarios del Figma), buscador en vivo, estados activos/inactivos, modal para agregar usuario y modal de edición. |
| 8 | [`perfil.html`](perfil.html) | **Perfil de Usuario** | Cabecera azul, avatar institucional grande editable (`GG`), formulario de actualización de datos de Grace Galán (Administradora). |
| 9 | [`configuracion.html`](configuracion.html) | **Configuración** | Toggles interactivos para notificaciones push, correo y sonido; selector de idioma, modal de cambio de contraseña y visor de sesiones activas. |

---

## 🎨 Tecnologías y Estilos
- **HTML5 & CSS3 Vanilla** (`css/styles.css`): Variables CSS para la paleta corporativa `#0f172a` (navy) y `#dc2626` (rojo A365).
- **Bootstrap 5.3.3 (CDN)**: Grid responsivo y componentes accesibles.
- **Bootstrap Icons 1.11.3 (CDN)**: Iconografía corporativa.
- **Chart.js (CDN)**: Gráficos interactivos en la sección de analítica.
- **JavaScript Vanilla** (`js/main.js`): Navegación activa, sidebar móvil, filtros de búsqueda en vivo y modales interactivos con notificaciones Toast.
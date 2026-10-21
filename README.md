# IMPULSA A365 — Frontend React

Aplicación de mesa de ayuda migrada a React + Vite, con Bootstrap 5 instalado localmente. Conserva los contratos de la API REST de backend-a365 (Spring Boot / PostgreSQL).

## Ejecutar

Requisitos: Node.js 22.12 o superior y npm. El backend necesita Java 17 o superior y Maven.

```powershell
# Terminal 1, desde backend-a365
mvn spring-boot:run

# Terminal 2, desde frontend-a365
npm install
npm run dev
```

Abrir http://localhost:5173. No abrir index.html con doble clic ni Live Server: React necesita el servidor de Vite.

Vite reenvía /api a http://localhost:8089 durante el desarrollo. Para otro backend, copiar .env.example a .env.local y ajustar API_PROXY_TARGET. VITE_API_URL cambia la dirección pública de la API. Los valores VITE_* son públicos y nunca deben contener credenciales.

```powershell
npm test
npm run build
npm run preview
```

El build está en dist/. En producción, configurar el servidor para reenviar /api al backend y las rutas del frontend a index.html. El proxy de Vite no funciona en preview ni en producción. Para usar preview con un backend separado, compilar con VITE_API_URL apuntando a su URL pública y configurar CORS en el backend.

## Organización

- src/components: layout, navegación, diálogos nativos, formularios y mensajes compartidos.
- src/context: sesión de la interfaz y permisos de navegación.
- src/hooks: carga de recursos con cancelación y reintento.
- src/pages: todas las vistas React.
- src/services: cliente de API y validación de respuestas.
- src/test: pruebas de integración con API simulada.
- src/styles.css: identidad visual, responsive, accesibilidad e impresión.
- legacy: versión Vanilla original y sus cambios locales preservados; no forma parte del build.
- public: recursos estáticos.

## Rutas migradas

- /: portal público de soporte.
- /login, /registro, /recuperar-clave: acceso con verificación, alta de cliente y recuperación.
- /dashboard: resumen para administrador y supervisor.
- /tickets, /atencion: bandeja de soporte, creación, conversación y estados.
- /mis-solicitudes: solicitudes del usuario actual.
- /incidencias: registro, consulta y revisión por supervisor/administrador.
- /usuarios: directorio, alta, edición y activación/desactivación para administrador.
- /perfil: datos personales.
- /configuracion: preferencias, contraseña, accesos y correo saliente para administrador.
- /reportes: filtros de fechas, indicadores de tickets reales, descarga CSV e impresión para guardar como PDF desde el navegador.

Los enlaces antiguos como tickets.html redirigen a su ruta React equivalente. En producción necesitan el mismo fallback a index.html.

## Sesión y permisos

La identidad se consulta en GET /api/auth/me. React no confía en roles o usuarios guardados en sessionStorage. Las peticiones incluyen la cookie HttpOnly de sesión y obtienen un token CSRF antes de operaciones de escritura. Cerrar sesión invalida la sesión en el servidor; un 401 de una ruta privada vuelve al login.

Las contraseñas nuevas y los restablecimientos usan BCrypt. El backend migra automáticamente las claves antiguas al arrancar, conservando la misma contraseña. La política de ocho caracteres se aplica a claves nuevas, no bloquea el acceso con las claves históricas ya migradas.

La verificación requiere el código enviado por correo y la misma sesión donde se ingresó la contraseña. No se devuelven códigos en la API. Si falla el envío, se informa el problema. La recuperación también debe completarse en la misma ventana. Las cookies de localhost y 127.0.0.1 son distintas: usa siempre la misma dirección al navegar.

## Funcionalidades pendientes

Quedan pendientes asignación a técnicos, adjuntos, CSAT, historial completo y notificaciones de tickets. EMPLEADO mantiene la función de atención del sistema previo; separar empleado solicitante y técnico exige ampliar roles.

Los reportes no inventan SLA, satisfacción ni tiempos de resolución. CSV no sustituye el .xlsx requerido; el PDF se obtiene mediante impresión. totalMes de la API cuenta todos los tickets y se presenta como total general.

## Verificación

Las pruebas usan respuestas simuladas para comprobar navegación por rol, login, errores, conservación de formularios y renderizado de mensajes como texto. No confirman conexión a Supabase ni envío de correo. La validación completa requiere el backend, la base de datos y cuentas configuradas.

## Identidad, apariencia y departamentos

La marca usa public/Imagenes/logo.jpg en las vistas React. El botón de sol/luna está en el portal, acceso y cabecera interna. La preferencia claro/oscuro se guarda en localStorage (a365_theme); al entrar por primera vez se toma el tema del sistema.

Crear y editar usuarios consulta GET /api/usuarios/departamentos. El backend devuelve Tecnología, Soporte, Finanzas, Operaciones, RRHH, Externo y General, junto con áreas históricas adicionales de usuarios y empleados. Se unifican mayúsculas y acentos para no duplicar categorías. Los datos guardados no se modifican. Actualmente son columnas de texto; no existe una tabla de departamentos ni se requiere migración SQL para este selector.

Tras actualizar el backend, reiniciarlo con mvn spring-boot:run para habilitar el nuevo endpoint. Si el catálogo falla, el formulario muestra un error y permite reintentar.

## Puerto de desarrollo

Vite usa el puerto fijo 5173 (strictPort). Si ya está ocupado, detén la instancia anterior con Ctrl+C antes de iniciar otra. Abre http://127.0.0.1:5173 o http://localhost:5173; no reutilices una pestaña antigua en 5174. El backend admite esos orígenes concretos y conserva la protección CSRF. Después de reiniciar Vite, recarga la pestaña para renovar la conexión de desarrollo.

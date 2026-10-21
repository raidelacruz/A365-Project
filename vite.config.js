import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Los enlaces .html existentes entran en React tanto en desarrollo como en preview.
function legacyLinks() {
  const rewrite = (req, _res, next) => {
    if (/^\/(login|recuperar-clave|dashboard|tickets|empleado|incidencias|reportes|usuarios|perfil|configuracion)\.html(?:\?|$)/.test(req.url || '')) req.url = '/index.html';
    next();
  };
  return { name: 'a365-legacy-links', configureServer(server) { server.middlewares.use(rewrite); }, configurePreviewServer(server) { server.middlewares.use(rewrite); } };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), legacyLinks()],
    // Mantener el mismo origen que admite el backend y el WebSocket de desarrollo.
    // Si ya hay otra instancia, se informa el conflicto en lugar de saltar a 5174.
    server: { port: 5173, strictPort: true, proxy: { '/api': { target: env.API_PROXY_TARGET || 'http://localhost:8089', changeOrigin: true } } },
    test: { environment: 'jsdom', setupFiles: './src/test/setup.js', css: false },
  };
});

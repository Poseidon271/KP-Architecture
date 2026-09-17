import { defineConfig } from 'vite';
import { resolve } from 'path';
import { app } from './server.js';

export default defineConfig({
  server: {
    port: 5173
  },
  plugins: [
    {
      name: 'kpa-express-api',
      configureServer(server) {
        // Mount Express API handlers directly into Vite Connect middleware pipeline
        server.middlewares.use(app);
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  }
});

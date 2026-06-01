// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'static',
  build: {
    format: 'file',   // outputs /tarifs.html not /tarifs/index.html
  },
  compressHTML: false, // keep output readable for debugging
  vite: {
    plugins: [
      {
        name: 'save-schedule-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const pathname = req.url ? new URL(req.url, 'http://localhost').pathname : '';
            if (pathname === '/api/save-schedule' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  if (!data || !data.schedule) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Données invalides ou manquantes' }));
                    return;
                  }
                  const filePath = path.join(__dirname, 'src', 'data', 'schedule.json');
                  fs.writeFileSync(filePath, JSON.stringify(data.schedule, null, 2), 'utf8');
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, message: 'Planning enregistré avec succès' }));
                } catch (err) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, message: err.message }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ]
  }
});

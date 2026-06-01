// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import crypto from 'crypto';

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
        name: 'aqa-admin-endpoints-middleware',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const pathname = req.url ? new URL(req.url, 'http://localhost').pathname : '';
            const apiRoutes = [
              '/api/save-schedule',
              '/api/save-formation',
              '/api/save-infrastructure',
              '/api/save-counters',
              '/api/deploy',
              '/api/admin-auth',
              '/api/verify-token',
              '/api/admin-config',
              '/api/save-admin-config'
            ];

            if (apiRoutes.includes(pathname)) {
              const ADMIN_CONFIG_PATH = path.join(__dirname, 'admin-config.json');
              function loadAdminConfig() {
                try {
                  return JSON.parse(fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8'));
                } catch(e) {
                  return {
                    passwordHash: '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5',
                    loginSlug: 'aqacontrol2026',
                    extraSlugs: []
                  };
                }
              }
              function saveAdminConfig(cfg) {
                fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
              }

              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const data = body ? JSON.parse(body) : {};

                  if (pathname === '/api/save-schedule' && req.method === 'POST') {
                    if (!data || !data.schedule) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, message: 'Données invalides ou manquantes' }));
                      return;
                    }
                    const filePath = path.join(__dirname, 'src', 'data', 'schedule.json');
                    fs.writeFileSync(filePath, JSON.stringify(data.schedule, null, 2), 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Planning enregistré avec succès' }));
                  }

                  else if (pathname === '/api/save-formation' && req.method === 'POST') {
                    if (!data || !data.formations) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, message: 'Données invalides ou manquantes' }));
                      return;
                    }
                    const filePath = path.join(__dirname, 'src', 'data', 'formation.json');
                    fs.writeFileSync(filePath, JSON.stringify(data.formations, null, 2), 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Formations enregistrées avec succès' }));
                  }

                  else if (pathname === '/api/save-infrastructure' && req.method === 'POST') {
                    if (!data || !data.infrastructures) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, message: 'Données invalides ou manquantes' }));
                      return;
                    }
                    const filePath = path.join(__dirname, 'src', 'data', 'infrastructure.json');
                    fs.writeFileSync(filePath, JSON.stringify(data.infrastructures, null, 2), 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Infrastructures enregistrées avec succès' }));
                  }

                  else if (pathname === '/api/save-counters' && req.method === 'POST') {
                    if (!data || !data.counters) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, message: 'Données invalides ou manquantes' }));
                      return;
                    }
                    const filePath = path.join(__dirname, 'src', 'data', 'counters.json');
                    fs.writeFileSync(filePath, JSON.stringify(data.counters, null, 2), 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Compteurs enregistrés avec succès' }));
                  }

                  else if (pathname === '/api/deploy' && req.method === 'POST') {
                    const batPath = path.join(__dirname, 'deploy-now.bat');
                    exec(`"${batPath}" < nul`, (error, stdout, stderr) => {
                      if (error) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: error.message, stdout, stderr }));
                      } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Déploiement exécuté avec succès', stdout }));
                      }
                    });
                  }

                  else if (pathname === '/api/admin-auth' && req.method === 'POST') {
                    const { password } = data;
                    if (!password) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Mot de passe requis' }));
                      return;
                    }
                    const cfg = loadAdminConfig();
                    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
                    const expectedHash = cfg.passwordHash || '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5';

                    if (inputHash !== expectedHash) {
                      res.writeHead(401, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Mot de passe incorrect' }));
                      return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, token: expectedHash }));
                  }

                  else if (pathname === '/api/verify-token' && req.method === 'GET') {
                    const authHeader = req.headers['authorization'];
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                      res.writeHead(401, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Non autorisé' }));
                      return;
                    }
                    const token = authHeader.slice(7);
                    const cfg = loadAdminConfig();
                    const expectedHash = cfg.passwordHash || '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5';

                    if (token !== expectedHash) {
                      res.writeHead(403, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Jeton invalide' }));
                      return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, valid: true }));
                  }

                  else if (pathname === '/api/admin-config' && req.method === 'GET') {
                    const cfg = loadAdminConfig();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ loginSlug: cfg.loginSlug, extraSlugs: cfg.extraSlugs || [] }));
                  }

                  else if (pathname === '/api/save-admin-config' && req.method === 'POST') {
                    const authHeader = req.headers['authorization'];
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                      res.writeHead(401, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Non autorisé' }));
                      return;
                    }
                    const token = authHeader.slice(7);
                    const cfg = loadAdminConfig();
                    const expectedHash = cfg.passwordHash || '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5';

                    if (token !== expectedHash) {
                      res.writeHead(403, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Jeton invalide' }));
                      return;
                    }

                    const { passwordHash, loginSlug, extraSlugs } = data;
                    if (passwordHash) cfg.passwordHash = passwordHash;
                    if (loginSlug) cfg.loginSlug = loginSlug;
                    if (extraSlugs !== undefined) cfg.extraSlugs = extraSlugs;

                    saveAdminConfig(cfg);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Configuration mise à jour' }));
                  } else {
                    res.writeHead(405, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Méthode non autorisée' }));
                  }
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

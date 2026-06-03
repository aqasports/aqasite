import os

config_path = r"c:\Users\dell\Desktop\aqasportsdotpro\astro.config.mjs"

with open(config_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add bcrypt import at top
old_import = "import crypto from 'crypto';"
new_import = "import crypto from 'crypto';\nimport bcrypt from 'bcryptjs';"

if old_import in content:
    content = content.replace(old_import, new_import)
    print("Step 1: Added bcrypt import to top.")

# 2. Find configureServer block boundaries and replace
start_token = "        configureServer(server) {"
# The end is the closing brace of configureServer. We'll search relative to start
start_idx = content.find(start_token)

if start_idx != -1:
    # We find the end of the configureServer block.
    # Looking at the structure:
    #           server.middlewares.use((req, res, next) => {
    #              ...
    #           }); // closing of server.middlewares.use
    #         } // closing of configureServer(server)
    # This ends with:
    #             }
    #           });
    #         }
    # Let's search for this relative to start_idx
    search_area = content[start_idx:start_idx+15000]
    
    # We search for the pattern ending configureServer:
    #             } else {
    #               next();
    #             }
    #           });
    #         }
    # Since line endings could be CRLF, we search for 'next();' and find the following braces
    next_idx_rel = search_area.find("next();")
    if next_idx_rel != -1:
        # Find closing brace for: } else { next(); }
        brace1 = search_area.find("}", next_idx_rel)
        # Find closing brace/parenthesis for: });
        brace2 = search_area.find("}", brace1 + 1)
        # Find closing brace for: } (configureServer)
        brace3 = search_area.find("}", brace2 + 1)
        
        if brace3 != -1:
            end_idx = start_idx + brace3 + 1
            
            new_configure_server = """        configureServer(server) {
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
              '/api/save-admin-config',
              '/api/admin-data'
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
                  const JWT_SECRET = process.env.JWT_SECRET || 'aqa-sports-default-jwt-secret-key-2026';

                  function signToken(payload) {
                    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
                    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
                    const signature = crypto.createHmac('sha256', JWT_SECRET)
                      .update(`${header}.${body}`)
                      .digest('base64url');
                    return `${header}.${body}.${signature}`;
                  }

                  function verifyToken(token) {
                    try {
                      const [header, body, signature] = token.split('.');
                      if (!header || !body || !signature) return null;
                      const expectedSig = crypto.createHmac('sha256', JWT_SECRET)
                        .update(`${header}.${body}`)
                        .digest('base64url');
                      if (signature !== expectedSig) return null;
                      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
                      if (payload.exp && Date.now() > payload.exp) return null;
                      return payload;
                    } catch (e) {
                      return null;
                    }
                  }

                  function verifyPassword(password, storedHash) {
                    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
                    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
                      return bcrypt.compareSync(inputHash, storedHash);
                    }
                    return inputHash === storedHash;
                  }

                  // Auth verification for all routes except admin-auth
                  let isAuthorized = false;
                  if (pathname === '/api/admin-auth') {
                    isAuthorized = true;
                  } else {
                    const authHeader = req.headers['authorization'];
                    if (authHeader && authHeader.startsWith('Bearer ')) {
                      const token = authHeader.slice(7);
                      const decoded = verifyToken(token);
                      if (decoded && decoded.isAdmin) {
                        isAuthorized = true;
                      }
                    }
                  }

                  if (!isAuthorized) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Non autorisé ou session expirée' }));
                    return;
                  }

                  // 1. Authenticate (admin-auth)
                  if (pathname === '/api/admin-auth' && req.method === 'POST') {
                    const { password } = data;
                    if (!password) {
                      res.writeHead(400, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Mot de passe requis' }));
                      return;
                    }
                    const cfg = loadAdminConfig();
                    const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'AqaSports2026!').digest('hex');

                    if (!verifyPassword(password, storedHash)) {
                      res.writeHead(401, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Mot de passe incorrect' }));
                      return;
                    }

                    // Auto-migrate SHA-256 legacy hashes
                    if (!storedHash.startsWith('$2a$') && !storedHash.startsWith('$2b$')) {
                      const inputHash = crypto.createHash('sha256').update(password).digest('hex');
                      cfg.passwordHash = bcrypt.hashSync(inputHash, 12);
                      saveAdminConfig(cfg);
                    }

                    const token = signToken({ isAdmin: true, exp: Date.now() + 2 * 60 * 60 * 1000 });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, token }));
                  }

                  // 2. Verify token
                  else if (pathname === '/api/verify-token' && req.method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, valid: true }));
                  }

                  // 3. Get admin-config (gated)
                  else if (pathname === '/api/admin-config' && req.method === 'GET') {
                    const cfg = loadAdminConfig();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ loginSlug: cfg.loginSlug, extraSlugs: cfg.extraSlugs || [] }));
                  }

                  // 4. Save admin-config (requires current password validation)
                  else if (pathname === '/api/save-admin-config' && req.method === 'POST') {
                    const { currentPassword, passwordHash, loginSlug, extraSlugs } = data;
                    const cfg = loadAdminConfig();
                    const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'AqaSports2026!').digest('hex');

                    if (!currentPassword || !verifyPassword(currentPassword, storedHash)) {
                      res.writeHead(401, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Mot de passe actuel incorrect' }));
                      return;
                    }

                    if (passwordHash) {
                      cfg.passwordHash = bcrypt.hashSync(passwordHash, 12);
                    }
                    if (loginSlug) cfg.loginSlug = loginSlug;
                    if (extraSlugs !== undefined) cfg.extraSlugs = extraSlugs;

                    saveAdminConfig(cfg);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Configuration mise à jour' }));
                  }

                  // 5. Get admin-data
                  else if (pathname === '/api/admin-data' && req.method === 'GET') {
                    const schedule = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'schedule.json'), 'utf8'));
                    const formations = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'formation.json'), 'utf8'));
                    const infrastructures = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'infrastructure.json'), 'utf8'));
                    const counters = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'counters.json'), 'utf8'));
                    const cfg = loadAdminConfig();

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                      success: true,
                      schedule,
                      formations,
                      infrastructures,
                      counters,
                      config: {
                        loginSlug: cfg.loginSlug,
                        extraSlugs: cfg.extraSlugs || []
                      }
                    }));
                  }

                  // 6. Save schedule
                  else if (pathname === '/api/save-schedule' && req.method === 'POST') {
                    const filePath = path.join(__dirname, 'src', 'data', 'schedule.json');
                    fs.writeFileSync(filePath, JSON.stringify(data.schedule, null, 2), 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Planning enregistré avec succès' }));
                  }

                  // 7. Save formation
                  else if (pathname === '/api/save-formation' && req.method === 'POST') {
                    const filePath = path.join(__dirname, 'src', 'data', 'formation.json');
                    fs.writeFileSync(filePath, JSON.stringify(data.formations, null, 2), 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Formations enregistrées avec succès' }));
                  }

                  // 8. Save infrastructure
                  else if (pathname === '/api/save-infrastructure' && req.method === 'POST') {
                    const filePath = path.join(__dirname, 'src', 'data', 'infrastructure.json');
                    fs.writeFileSync(filePath, JSON.stringify(data.infrastructures, null, 2), 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Infrastructures enregistrées avec succès' }));
                  }

                  // 9. Save counters
                  else if (pathname === '/api/save-counters' && req.method === 'POST') {
                    const filePath = path.join(__dirname, 'src', 'data', 'counters.json');
                    fs.writeFileSync(filePath, JSON.stringify(data.counters, null, 2), 'utf8');
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Compteurs enregistrés avec succès' }));
                  }

                  // 10. Deploy (gated + password check)
                  else if (pathname === '/api/deploy' && req.method === 'POST') {
                    const { password } = data;
                    const cfg = loadAdminConfig();
                    const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'AqaSports2026!').digest('hex');

                    if (!password || !verifyPassword(password, storedHash)) {
                      res.writeHead(401, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ success: false, error: 'Mot de passe incorrect pour le déploiement' }));
                      return;
                    }

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

                  else {
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
        }"""
            
            content = content[:start_idx] + new_configure_server + content[end_idx:]
            print("Step 2: Successfully updated configureServer function.")
        else:
            print("Step 2 Warning: Could not find configureServer end braces.")
    else:
        print("Step 2 Warning: Could not find next() reference.")
else:
    print("Step 2 Warning: Could not find start of configureServer.")

with open(config_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patching complete.")

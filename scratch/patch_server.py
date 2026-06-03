import os

server_path = r"c:\Users\dell\Desktop\aqasportsdotpro\server.js"

with open(server_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Require bcryptjs and setup JWT constants
old_imports = """const path = require('path');
const crypto = require('crypto');"""
new_imports = """const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'aqa-sports-default-jwt-secret-key-2026';"""

if old_imports in content:
    content = content.replace(old_imports, new_imports)
    print("Step 1: Added bcryptjs and JWT_SECRET.")
else:
    print("Step 1 Warning: Imports not found.")

# 2. Add login rate limiter
old_limiter = "app.use('/api/', limiter);"
new_limiter = """app.use('/api/', limiter);

// Rate limiter specifically for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: { success: false, error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.' }
});

// Rate limiter specifically for manual deployments
const deployLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 manual deploys
  message: { success: false, error: 'Trop de demandes de déploiement. Veuillez patienter.' }
});"""

if old_limiter in content:
    content = content.replace(old_limiter, new_limiter)
    print("Step 2: Added login and deploy rate limiters.")
else:
    print("Step 2 Warning: Limiter path not found.")

# 3. Replace Auth layer in server.js
start_token = "// ==================== ADMIN AUTH ===================="
end_token = "// API routes"

start_idx = content.find(start_token)
end_idx = content.find(end_token)

if start_idx != -1 and end_idx != -1:
    new_auth_block = """// ==================== ADMIN AUTH ====================

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

// Middleware: verify admin bearer token (enforced in dev and production)
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded || !decoded.isAdmin) {
    return res.status(403).json({ success: false, error: 'Jeton invalide ou expiré' });
  }
  req.admin = decoded;
  next();
}

// POST /api/admin-auth — login and exchange password for JWT
app.post('/api/admin-auth', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, error: 'Mot de passe requis' });

  const cfg = loadAdminConfig();
  const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'AqaSports2026!').digest('hex');

  if (!verifyPassword(password, storedHash)) {
    return res.status(401).json({ success: false, error: 'Mot de passe incorrect' });
  }

  // Auto-migrate legacy SHA-256 config file hashes to bcrypt
  if (!storedHash.startsWith('$2a$') && !storedHash.startsWith('$2b$')) {
    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    cfg.passwordHash = bcrypt.hashSync(inputHash, 12);
    saveAdminConfig(cfg);
  }

  const token = signToken({ isAdmin: true, exp: Date.now() + 2 * 60 * 60 * 1000 }); // 2 hours
  res.json({ success: true, token });
});

// GET /api/verify-token — check if a token is still valid
app.get('/api/verify-token', verifyAdminToken, (req, res) => {
  res.json({ success: true, valid: true });
});

// GET /api/admin-config — returns config (gated for security)
app.get('/api/admin-config', verifyAdminToken, (req, res) => {
  const cfg = loadAdminConfig();
  res.json({ loginSlug: cfg.loginSlug, extraSlugs: cfg.extraSlugs || [] });
});

// POST /api/save-admin-config — update password hash and/or login slug (requires current password verification)
app.post('/api/save-admin-config', verifyAdminToken, (req, res) => {
  try {
    const { currentPassword, passwordHash, loginSlug, extraSlugs } = req.body;
    const cfg = loadAdminConfig();
    const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'AqaSports2026!').digest('hex');

    if (!currentPassword || !verifyPassword(currentPassword, storedHash)) {
      return res.status(401).json({ success: false, error: 'Mot de passe actuel incorrect' });
    }

    if (passwordHash) {
      // The frontend sends client-computed SHA-256 of the new password.
      // We bcrypt-hash it on the server before saving to the configuration.
      cfg.passwordHash = bcrypt.hashSync(passwordHash, 12);
    }
    if (loginSlug) cfg.loginSlug = loginSlug;
    if (extraSlugs !== undefined) cfg.extraSlugs = extraSlugs;

    saveAdminConfig(cfg);
    res.json({ success: true, message: 'Configuration mise à jour' });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin-data — returns all administrative data (gated behind JWT)
app.get('/api/admin-data', verifyAdminToken, (req, res) => {
  try {
    const schedule = JSON.parse(fs2.readFileSync(path.join(__dirname, 'src', 'data', 'schedule.json'), 'utf8'));
    const formations = JSON.parse(fs2.readFileSync(path.join(__dirname, 'src', 'data', 'formation.json'), 'utf8'));
    const infrastructures = JSON.parse(fs2.readFileSync(path.join(__dirname, 'src', 'data', 'infrastructure.json'), 'utf8'));
    const counters = JSON.parse(fs2.readFileSync(path.join(__dirname, 'src', 'data', 'counters.json'), 'utf8'));
    const cfg = loadAdminConfig();

    res.json({
      success: true,
      schedule,
      formations,
      infrastructures,
      counters,
      config: {
        loginSlug: cfg.loginSlug,
        extraSlugs: cfg.extraSlugs || []
      }
    });
  } catch(err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
"""
    content = content[:start_idx] + new_auth_block + "\n" + content[end_idx:]
    print("Step 3: Replaced Auth block and added secure admin-data API.")
else:
    print("Step 3 Warning: Auth boundaries not found.")

# 4. Update deploy endpoint
old_deploy = """// Deploy endpoint (Git trigger)
app.post('/api/deploy', verifyAdminToken, (req, res) => {
  try {
    const { exec } = require('child_process');
    const path = require('path');
    const batPath = path.join(__dirname, 'deploy-now.bat');
    exec(`"${batPath}" < nul`, (error, stdout, stderr) => {
      if (error) {
        res.status(500).json({ success: false, message: error.message, stdout, stderr });
      } else {
        res.status(200).json({ success: true, message: 'Déploiement exécuté avec succès', stdout });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});"""

new_deploy = """// Deploy endpoint (Git trigger - requires JWT + password verification + rate limit)
app.post('/api/deploy', verifyAdminToken, deployLimiter, (req, res) => {
  try {
    const { password } = req.body;
    const cfg = loadAdminConfig();
    const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'AqaSports2026!').digest('hex');

    if (!password || !verifyPassword(password, storedHash)) {
      return res.status(401).json({ success: false, error: 'Mot de passe incorrect pour le déploiement' });
    }

    const { exec } = require('child_process');
    const path = require('path');
    const batPath = path.join(__dirname, 'deploy-now.bat');
    exec(`"${batPath}" < nul`, (error, stdout, stderr) => {
      if (error) {
        res.status(500).json({ success: false, message: error.message, stdout, stderr });
      } else {
        res.status(200).json({ success: true, message: 'Déploiement exécuté avec succès', stdout });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});"""

if old_deploy in content:
    content = content.replace(old_deploy, new_deploy)
    print("Step 4: Secured deploy endpoint with password checks and rate limiting.")
else:
    # Try normalized spacing
    normalized_old = old_deploy.replace("\r\n", "\n")
    normalized_content = content.replace("\r\n", "\n")
    if normalized_old in normalized_content:
        normalized_content = normalized_content.replace(normalized_old, new_deploy)
        content = normalized_content
        print("Step 4: Secured deploy endpoint (spacing normalized).")
    else:
        print("Step 4 Warning: Deploy endpoint pattern not matched.")

with open(server_path, "w", encoding="utf-8") as f:
    f.write(content)

print("server.js patching completed.")

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const messageRouter = require('./api/send-message');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS configuration
const allowedOrigins = [
  'https://aqasports.pro',
  'https://www.aqasports.pro',
  'https://aqasports.com',
  'https://www.aqasports.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4321',
  'http://127.0.0.1:4321'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (same-origin, curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true
}));

// Rate limiting - generous limit for admin API
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100, // 100 requests per minute (admin needs many saves)
  message: { success: false, error: 'Trop de requêtes, veuillez réessayer plus tard' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ==================== ADMIN CONFIG ====================
const fs2 = require('fs');
const ADMIN_CONFIG_PATH = path.join(__dirname, 'admin-config.json');

function loadAdminConfig() {
  try {
    return JSON.parse(fs2.readFileSync(ADMIN_CONFIG_PATH, 'utf8'));
  } catch(e) {
    return { passwordHash: process.env.ADMIN_PASSWORD ? crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest('hex') : '', loginSlug: 'aqacontrol2026', extraSlugs: [] };
  }
}

function saveAdminConfig(cfg) {
  fs2.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

let adminConfig = loadAdminConfig();

// Dynamic slug routing — serve admin page at custom slugs BEFORE static files
app.use((req, res, next) => {
  let slug = req.path.replace(/^\//, '').replace(/\.html$/, '');
  // Strip language prefix if present (e.g. en/aqacontrol2026 -> aqacontrol2026)
  slug = slug.replace(/^(en|ar|fr)\//, '');

  const cfg = loadAdminConfig();
  const allSlugs = [cfg.loginSlug, ...(cfg.extraSlugs || [])].filter(Boolean);
  
  // If the default aqacontrol2026 is accessed but the configured slug has changed, return 404
  if (slug === 'aqacontrol2026' && cfg.loginSlug !== 'aqacontrol2026') {
    const errorPage = path.join(__dirname, 'dist', '404.html');
    if (fs2.existsSync(errorPage)) {
      return res.status(404).sendFile(errorPage);
    }
    return res.status(404).send('404 Not Found');
  }

  if (allSlugs.includes(slug)) {
    return res.sendFile(path.join(__dirname, 'dist', 'aqacontrol2026.html'));
  }
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'dist'), { extensions: ['html'] }));
app.use(express.static(path.join(__dirname)));

// ==================== ADMIN AUTH ====================
// Token is the SHA-256 hash of the password (from admin-config.json or env)
function getAdminToken() {
  const cfg = loadAdminConfig();
  return cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'changeme').digest('hex');
}

// Middleware: verify admin bearer token (only enforced in production)
function verifyAdminToken(req, res, next) {
  if (process.env.NODE_ENV !== 'production') return next();
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }
  const token = authHeader.slice(7);
  if (token !== getAdminToken()) {
    return res.status(403).json({ success: false, error: 'Jeton invalide' });
  }
  next();
}

// POST /api/admin-auth — exchange password for token (legacy, kept for compatibility)
app.post('/api/admin-auth', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, error: 'Mot de passe requis' });
  const inputHash = crypto.createHash('sha256').update(password).digest('hex');
  if (inputHash !== getAdminToken()) {
    return res.status(401).json({ success: false, error: 'Mot de passe incorrect' });
  }
  res.json({ success: true, token: getAdminToken() });
});

// GET /api/admin-config — returns public config (slug only, no hash)
app.get('/api/admin-config', (req, res) => {
  const cfg = loadAdminConfig();
  res.json({ loginSlug: cfg.loginSlug, extraSlugs: cfg.extraSlugs || [] });
});

// POST /api/save-admin-config — update password hash and/or login slug
app.post('/api/save-admin-config', verifyAdminToken, (req, res) => {
  try {
    const { passwordHash, loginSlug, extraSlugs } = req.body;
    const cfg = loadAdminConfig();
    if (passwordHash) cfg.passwordHash = passwordHash;
    if (loginSlug) cfg.loginSlug = loginSlug;
    if (extraSlugs !== undefined) cfg.extraSlugs = extraSlugs;
    saveAdminConfig(cfg);
    res.json({ success: true, message: 'Configuration mise à jour' });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/verify-token — check if a token is still valid
app.get('/api/verify-token', verifyAdminToken, (req, res) => {
  res.json({ success: true, valid: true });
});

// API routes
app.use('/api', messageRouter);

// Get schedule endpoint
app.get('/api/schedule', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'src', 'data', 'schedule.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(data);
    } else {
      res.status(404).json({ success: false, message: 'Planning introuvable' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save schedule endpoint
app.post('/api/save-schedule', verifyAdminToken, (req, res) => {
  try {
    const data = req.body;

    if (!data || !data.schedule) {
      return res.status(400).json({ success: false, message: 'Données invalides ou manquantes' });
    }

    // Write to schedule.json
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'src', 'data', 'schedule.json');
    fs.writeFileSync(filePath, JSON.stringify(data.schedule, null, 2), 'utf8');

    res.status(200).json({ success: true, message: 'Planning enregistré avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save formation endpoint
app.post('/api/save-formation', verifyAdminToken, (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.formations) {
      return res.status(400).json({ success: false, message: 'Données invalides ou manquantes' });
    }
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'src', 'data', 'formation.json');
    fs.writeFileSync(filePath, JSON.stringify(data.formations, null, 2), 'utf8');
    res.status(200).json({ success: true, message: 'Formations enregistrées avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save infrastructure endpoint
app.post('/api/save-infrastructure', verifyAdminToken, (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.infrastructures) {
      return res.status(400).json({ success: false, message: 'Données invalides ou manquantes' });
    }
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'src', 'data', 'infrastructure.json');
    fs.writeFileSync(filePath, JSON.stringify(data.infrastructures, null, 2), 'utf8');
    res.status(200).json({ success: true, message: 'Infrastructures enregistrées avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save counters endpoint
app.post('/api/save-counters', verifyAdminToken, (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.counters) {
      return res.status(400).json({ success: false, message: 'Données invalides ou manquantes' });
    }
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'src', 'data', 'counters.json');
    fs.writeFileSync(filePath, JSON.stringify(data.counters, null, 2), 'utf8');
    res.status(200).json({ success: true, message: 'Compteurs enregistrés avec succès' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Deploy endpoint (Git trigger)
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
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: 'Erreur serveur interne' 
  });
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
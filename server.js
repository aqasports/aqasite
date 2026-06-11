require('dotenv').config();

const express = require('express');

const cors = require('cors');

const helmet = require('helmet');

const rateLimit = require('express-rate-limit');

const path = require('path');

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('FATAL: ADMIN_PASSWORD environment variable is not set');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;


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
});



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

    return { passwordHash: crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex'), loginSlug: 'aqacontrol2026', extraSlugs: [] };

  }

}



function saveAdminConfig(cfg) {

  fs2.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');

}



let adminConfig = loadAdminConfig();






// ==================== ADMIN AUTH ====================

const jwt = require('jsonwebtoken');

function signToken(payload) {
  const cleanPayload = { ...payload };
  const options = {};
  if (cleanPayload.exp) {
    const diffMs = cleanPayload.exp - Date.now();
    if (diffMs > 0) {
      options.expiresIn = Math.floor(diffMs / 1000);
    }
    delete cleanPayload.exp;
  }
  return jwt.sign(cleanPayload, JWT_SECRET, options);
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
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
  const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

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
    const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

    const requiresVerification = passwordHash || currentPassword;
    if (requiresVerification) {
      if (!currentPassword || !verifyPassword(currentPassword, storedHash)) {
        return res.status(401).json({ success: false, error: 'Mot de passe actuel incorrect' });
      }
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

// API routes

app.use('/api', messageRouter);

const membersRouter = require('./api/members');
app.use('/api', membersRouter);



async function supabaseFetch(urlPath, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables not set');
  }
  const url = `${SUPABASE_URL}/rest/v1/${urlPath}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  };
  const res = await fetch(url, {
    ...options,
    headers
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase Error (${res.status}): ${errorText}`);
  }
  if (res.status === 204) return [];
  return res.json();
}

async function getMergedSchedule() {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, 'src', 'data', 'schedule.json');
  let scheduleData = {};
  if (fs.existsSync(filePath)) {
    try {
      scheduleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error('Failed to parse schedule.json baseline:', e);
    }
  }

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const dbSlots = await supabaseFetch('schedule');
      if (dbSlots && Array.isArray(dbSlots)) {
        dbSlots.forEach(dbSlot => {
          const pool = scheduleData[dbSlot.pool_key];
          if (pool && pool.categories && pool.categories[dbSlot.category]) {
            const cat = pool.categories[dbSlot.category];
            if (cat.coaches) {
              const coach = cat.coaches.find(c => c.name === dbSlot.coach_name);
              if (coach && coach.slots) {
                const slot = coach.slots.find(s => s.day === dbSlot.day && s.time === dbSlot.time);
                if (slot) {
                  slot.taken = dbSlot.taken;
                  slot.total = dbSlot.total;
                  if (dbSlot.slot_type) slot.type = dbSlot.slot_type;
                }
              }
            }
          }
        });
      }
    } catch (e) {
      console.error('Failed to merge schedule from Supabase:', e);
    }
  }
  return scheduleData;
}

// Get schedule endpoint
app.get('/api/schedule', async (req, res) => {
  try {
    const schedule = await getMergedSchedule();
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(schedule);
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

app.post('/api/deploy', verifyAdminToken, deployLimiter, (req, res) => {
  const { password } = req.body;
  const cfg = loadAdminConfig();
  const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

  if (!password || !verifyPassword(password, storedHash)) {
    return res.status(401).json({ success: false, error: 'Mot de passe incorrect pour le déploiement' });
  }

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

    return res.sendFile(path.join(__dirname, 'dist', `${slug}.html`));

  }

  next();

});



// Static files

app.use((req, res, next) => {
  let cleanPath = req.path;
  if (cleanPath.endsWith('/')) {
    cleanPath = cleanPath.slice(0, -1);
  }
  if (!cleanPath) {
    return next();
  }
  const filePath = path.join(__dirname, 'dist', cleanPath + '.html');
  if (fs2.existsSync(filePath) && fs2.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'dist'), { extensions: ['html'] }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname)));



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
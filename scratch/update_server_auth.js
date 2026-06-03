const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/dell/Desktop/aqasportsdotpro/server.js';
let content = fs.readFileSync(filePath, 'utf8');

// Insert Admin variables & Middleware
const insertPoint = `// API routes
app.use('/api', messageRouter);`;

const authLogic = `// API routes
app.use('/api', messageRouter);

// ==================== ADMIN SECURITY & AUTHENTICATION ====================
const crypto = require('crypto');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AqaSports2026!';
const ADMIN_TOKEN = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

// Auth credentials verification
app.post('/api/admin-auth', (req, res) => {
  try {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.status(200).json({ success: true, token: ADMIN_TOKEN });
    } else {
      res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Auth token validity verification
app.post('/api/verify-token', (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader === \`Bearer \${ADMIN_TOKEN}\`) {
      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'Non autorisé' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Middleware to verify admin token for write operations
const verifyAdminToken = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== \`Bearer \${ADMIN_TOKEN}\`) {
      return res.status(401).json({ success: false, message: 'Non autorisé' });
    }
  }
  next();
};`;

if (!content.includes(insertPoint)) {
  console.error("Could not find insert point in server.js");
  process.exit(1);
}

content = content.replace(insertPoint, authLogic);

// Add middleware to endpoints
content = content.replace("app.post('/api/save-schedule', (req, res) => {", "app.post('/api/save-schedule', verifyAdminToken, (req, res) => {");
content = content.replace("app.post('/api/save-formation', (req, res) => {", "app.post('/api/save-formation', verifyAdminToken, (req, res) => {");
content = content.replace("app.post('/api/save-infrastructure', (req, res) => {", "app.post('/api/save-infrastructure', verifyAdminToken, (req, res) => {");
content = content.replace("app.post('/api/save-counters', (req, res) => {", "app.post('/api/save-counters', verifyAdminToken, (req, res) => {");
content = content.replace("app.post('/api/deploy', (req, res) => {", "app.post('/api/deploy', verifyAdminToken, (req, res) => {");

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated server.js with authentication protection!");

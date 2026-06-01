require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const messageRouter = require('./api/send-message');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://aqasports.pro', 'https://www.aqasports.pro']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.MAX_REQUESTS_PER_MINUTE || 10,
  message: { success: false, error: 'Trop de requêtes, veuillez réessayer plus tard' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname)));

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
app.post('/api/save-schedule', (req, res) => {
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
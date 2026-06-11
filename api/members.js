// api/members.js
// Express Router for AQA Sports Academy Member Area ERP

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');

// Configure multer for local uploads in the uploads directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `action-${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit: 5MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Uniquement les formats d\'image jpeg, jpg, png, webp et gif sont autorises'));
  }
});

const router = express.Router();

const MEMBERS_FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'members.json');
const SCHEDULE_FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'schedule.json');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

// Simple in-memory counter for member login attempts
const loginAttempts = new Map(); // email -> {count, resetAt}

// Helper: sanitize user inputs to prevent XSS and limit length
function sanitize(str, maxLength = 500) {
  if (!str) return '';
  return String(str)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .slice(0, maxLength);
}

// Helper: load members from local JSON file
function loadMembers() {
  try {
    if (!fs.existsSync(MEMBERS_FILE_PATH)) {
      fs.writeFileSync(MEMBERS_FILE_PATH, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(MEMBERS_FILE_PATH, 'utf8');
    return JSON.parse(data || '[]');
  } catch (e) {
    console.error('Error reading members database:', e);
    return [];
  }
}

// Helper: save members to local JSON file
function saveMembers(members) {
  try {
    fs.writeFileSync(MEMBERS_FILE_PATH, JSON.stringify(members, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing members database:', e);
    return false;
  }
}

// Helper: adjust schedule slot taken count
function adjustSlotTaken(poolKey, category, coachName, day, time, increment) {
  try {
    if (!fs.existsSync(SCHEDULE_FILE_PATH)) return false;
    const data = JSON.parse(fs.readFileSync(SCHEDULE_FILE_PATH, 'utf8'));

    const pool = data[poolKey];
    if (!pool) return false;
    const cat = pool.categories[category];
    if (!cat) return false;
    const coach = cat.coaches.find(c => c.name === coachName);
    if (!coach) return false;
    const slot = coach.slots.find(s => s.day === day && s.time === time);
    if (!slot) return false;

    slot.taken = Math.max(0, Math.min(slot.total, (slot.taken || 0) + increment));
    
    fs.writeFileSync(SCHEDULE_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error adjusting slot taken count:', e);
    return false;
  }
}

const jwt = require('jsonwebtoken');

// JWT Sign and Verify Helpers
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

// Middleware: verify member bearer token
function verifyMemberToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Non autorise' });
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded || !decoded.id) {
    return res.status(403).json({ success: false, error: 'Session invalide ou expiree' });
  }
  req.member = decoded;
  next();
}

// Middleware: verify admin bearer token
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Non autorise' });
  }
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded || !decoded.isAdmin) {
    return res.status(403).json({ success: false, error: 'Acces administrateur requis' });
  }
  req.admin = decoded;
  next();
}

// ==================== MEMBER PORTAL API ROUTES ====================

// POST /api/member/register
router.post('/member/register', (req, res) => {
  try {
    const { email, password, fullName, phone, birthDate, gender, isAqaMember } = req.body;

    if (!email || !password || !fullName || !gender) {
      return res.status(400).json({ success: false, error: 'Veuillez remplir tous les champs obligatoires' });
    }

    const safeEmail = sanitize(email, 150).toLowerCase();
    const safeFullName = sanitize(fullName, 100);
    const safePhone = sanitize(phone, 30);
    const safeBirthDate = sanitize(birthDate, 20);
    const safeGender = sanitize(gender, 20);

    const members = loadMembers();
    const existing = members.find(m => m.email.toLowerCase() === safeEmail);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Un compte existe deja avec cette adresse email' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const isMemberBool = isAqaMember === true || isAqaMember === 'true';
    const status = isMemberBool ? 'pending' : 'active';
    const tier = isMemberBool ? 'Silver' : 'Non-Membre';

    const newMember = {
      id: crypto.randomBytes(16).toString('hex'),
      email: safeEmail,
      passwordHash,
      fullName: safeFullName,
      phone: safePhone,
      birthDate: safeBirthDate,
      gender: safeGender,
      isAqaMember: isMemberBool,
      status,
      membershipTier: tier,
      xp: 0,
      badges: [],
      subscription: {
        category: gender,
        poolKey: '',
        coachName: '',
        slotDay: '',
        slotTime: '',
        startDate: '',
        endDate: '',
        status: 'inactive'
      },
      presence: [],
      suiviTechnique: {
        respiration: 0,
        battement: 0,
        bras: 0,
        endurance: 0,
        comments: ''
      },
      gallery: [],
      createdAt: new Date().toISOString()
    };

    members.push(newMember);
    saveMembers(members);

    res.json({
      success: true,
      status,
      message: isMemberBool 
        ? 'Inscription reussie. Votre compte est en attente de validation par l\'administrateur.'
        : 'Inscription reussie. Bienvenue dans la communaute AQA !'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/member/login
router.post('/member/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Champs manquants' });
    }

    const emailKey = email.toLowerCase();
    const attempts = loginAttempts.get(emailKey) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
    if (Date.now() > attempts.resetAt) {
      attempts.count = 0;
      attempts.resetAt = Date.now() + 15 * 60 * 1000;
    }
    if (attempts.count >= 5) {
      return res.status(429).json({ success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
    }
    attempts.count++;
    loginAttempts.set(emailKey, attempts);

    const members = loadMembers();
    const user = members.find(m => m.email.toLowerCase() === emailKey);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    // Successful login - clear rate limit attempts
    loginAttempts.delete(emailKey);

    const token = signToken({
      id: user.id,
      email: user.email,
      isAqaMember: user.isAqaMember,
      status: user.status,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      token,
      member: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isAqaMember: user.isAqaMember,
        status: user.status,
        membershipTier: user.membershipTier
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/member/profile
router.get('/member/profile', verifyMemberToken, (req, res) => {
  try {
    const members = loadMembers();
    const user = members.find(m => m.id === req.member.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Compte introuvable' });
    }

    // Return profile without password hash
    const profile = { ...user };
    delete profile.passwordHash;

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/member/change-subscription
router.post('/member/change-subscription', verifyMemberToken, (req, res) => {
  try {
    const { tier, poolKey, coachName, slotDay, slotTime } = req.body;
    if (!tier || !poolKey || !coachName || !slotDay || !slotTime) {
      return res.status(400).json({ success: false, error: 'Informations de changement de formule incompletes' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === req.member.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    const safeTier = sanitize(tier, 50);
    const safePoolKey = sanitize(poolKey, 50);
    const safeCoachName = sanitize(coachName, 100);
    const safeSlotDay = sanitize(slotDay, 30);
    const safeSlotTime = sanitize(slotTime, 30);

    // Read schedule.json to check slot availability
    if (!fs.existsSync(SCHEDULE_FILE_PATH)) {
      return res.status(500).json({ success: false, error: 'Fichier planning introuvable' });
    }
    const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE_PATH, 'utf8'));
    const pool = schedule[safePoolKey];
    if (!pool) {
      return res.status(400).json({ success: false, error: 'Piscine introuvable' });
    }
    const category = user.gender || 'homme';
    const cat = pool.categories[category];
    if (!cat) {
      return res.status(400).json({ success: false, error: 'Catégorie introuvable pour cette piscine' });
    }
    const coach = cat.coaches.find(c => c.name === safeCoachName);
    if (!coach) {
      return res.status(400).json({ success: false, error: 'Entraîneur introuvable' });
    }
    const slot = coach.slots.find(s => s.day === safeSlotDay && s.time === safeSlotTime);
    if (!slot) {
      return res.status(400).json({ success: false, error: 'Créneau introuvable dans le planning' });
    }
    if ((slot.taken || 0) >= slot.total) {
      return res.status(400).json({ success: false, error: 'Ce créneau est déjà complet (plus de places disponibles)' });
    }

    user.subscriptionChangeRequest = {
      tier: safeTier,
      poolKey: safePoolKey,
      coachName: safeCoachName,
      slotDay: safeSlotDay,
      slotTime: safeSlotTime,
      status: 'pending',
      requestedAt: new Date().toISOString()
    };

    saveMembers(members);

    res.json({
      success: true,
      message: 'Votre demande de modification de formule/creneau a bien ete soumise.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/member/public-stats (QR-code scanning endpoint)
router.get('/member/public-stats', (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID requis' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Compte inactif ou non valide' });
    }

    // Safe details only
    const stats = {
      fullName: user.fullName,
      membershipTier: user.membershipTier,
      xp: user.xp || 0,
      badges: user.badges || [],
      subscription: {
        category: user.subscription.category,
        poolKey: user.subscription.poolKey,
        coachName: user.subscription.coachName,
        slotDay: user.subscription.slotDay,
        slotTime: user.subscription.slotTime,
        status: user.subscription.status
      },
      presence: user.presence || [],
      suiviTechnique: user.suiviTechnique || { respiration: 0, battement: 0, bras: 0, endurance: 0, comments: '' }
    };

    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== ADMIN ERP MANAGEMENT ROUTES ====================

// GET /api/admin/members
router.get('/admin/members', verifyAdminToken, (req, res) => {
  try {
    const members = loadMembers();
    const safeMembers = members.map(m => {
      const copy = { ...m };
      delete copy.passwordHash;
      return copy;
    });
    res.json({ success: true, members: safeMembers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/members/approve
router.post('/admin/members/approve', verifyAdminToken, (req, res) => {
  try {
    const { memberId, membershipTier, poolKey, coachName, slotDay, slotTime, endDate } = req.body;
    if (!memberId || !membershipTier || !poolKey || !coachName || !slotDay || !slotTime || !endDate) {
      return res.status(400).json({ success: false, error: 'Tous les parametres d\'inscription sont requis' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === memberId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    const safeMembershipTier = sanitize(membershipTier, 50);
    const safePoolKey = sanitize(poolKey, 50);
    const safeCoachName = sanitize(coachName, 100);
    const safeSlotDay = sanitize(slotDay, 30);
    const safeSlotTime = sanitize(slotTime, 30);
    const safeEndDate = sanitize(endDate, 30);

    // Update member profile
    // Read schedule.json to check slot availability
    if (!fs.existsSync(SCHEDULE_FILE_PATH)) {
      return res.status(500).json({ success: false, error: 'Fichier planning introuvable' });
    }
    const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE_PATH, 'utf8'));
    const pool = schedule[safePoolKey];
    if (!pool) {
      return res.status(400).json({ success: false, error: 'Piscine introuvable' });
    }
    const category = user.gender || 'homme';
    const cat = pool.categories[category];
    if (!cat) {
      return res.status(400).json({ success: false, error: 'Catégorie introuvable pour cette piscine' });
    }
    const coach = cat.coaches.find(c => c.name === safeCoachName);
    if (!coach) {
      return res.status(400).json({ success: false, error: 'Entraîneur introuvable' });
    }
    const slot = coach.slots.find(s => s.day === safeSlotDay && s.time === safeSlotTime);
    if (!slot) {
      return res.status(400).json({ success: false, error: 'Créneau introuvable dans le planning' });
    }
    if ((slot.taken || 0) >= slot.total) {
      return res.status(400).json({ success: false, error: 'Ce créneau est déjà complet (plus de places disponibles)' });
    }

    user.status = 'active';
    user.membershipTier = safeMembershipTier;
    user.subscription = {
      category: user.gender || 'homme',
      poolKey: safePoolKey,
      coachName: safeCoachName,
      slotDay: safeSlotDay,
      slotTime: safeSlotTime,
      startDate: new Date().toISOString().split('T')[0],
      endDate: safeEndDate,
      status: 'active'
    };

    // Increment slot count
    adjustSlotTaken(safePoolKey, user.gender || 'homme', safeCoachName, safeSlotDay, safeSlotTime, 1);

    saveMembers(members);

    res.json({
      success: true,
      message: `L'inscription de ${user.fullName} a ete validee avec succes`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/members/update
router.post('/api/admin/members/update', verifyAdminToken, (req, res) => {
  try {
    const { memberId, fullName, phone, birthDate, gender, isAqaMember, status, membershipTier, xp, badges, subscription } = req.body;
    if (!memberId) {
      return res.status(400).json({ success: false, error: 'ID de membre manquant' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === memberId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    // Handle subscription slot modifications
    const oldSub = user.subscription;
    const newSub = subscription;

    let safeNewSub = null;
    if (newSub) {
      safeNewSub = {
        category: sanitize(newSub.category, 20),
        poolKey: sanitize(newSub.poolKey, 50),
        coachName: sanitize(newSub.coachName, 100),
        slotDay: sanitize(newSub.slotDay, 30),
        slotTime: sanitize(newSub.slotTime, 30),
        startDate: sanitize(newSub.startDate, 30),
        endDate: sanitize(newSub.endDate, 30),
        status: sanitize(newSub.status, 20)
      };
    }

    if (safeNewSub && oldSub && user.status === 'active' && status === 'active') {
      const slotChanged = oldSub.poolKey !== safeNewSub.poolKey ||
                           oldSub.coachName !== safeNewSub.coachName ||
                           oldSub.slotDay !== safeNewSub.slotDay ||
                           oldSub.slotTime !== safeNewSub.slotTime;
      
      if (slotChanged) {
        // Decrement old slot if it was active
        if (oldSub.poolKey && oldSub.coachName && oldSub.slotDay && oldSub.slotTime) {
          adjustSlotTaken(oldSub.poolKey, oldSub.category || 'homme', oldSub.coachName, oldSub.slotDay, oldSub.slotTime, -1);
        }
        // Increment new slot
        if (safeNewSub.poolKey && safeNewSub.coachName && safeNewSub.slotDay && safeNewSub.slotTime) {
          adjustSlotTaken(safeNewSub.poolKey, safeNewSub.category || 'homme', safeNewSub.coachName, safeNewSub.slotDay, safeNewSub.slotTime, 1);
        }
      }
    }

    // Update fields
    if (fullName) user.fullName = sanitize(fullName, 100);
    if (phone !== undefined) user.phone = sanitize(phone, 30);
    if (birthDate !== undefined) user.birthDate = sanitize(birthDate, 20);
    if (gender) user.gender = sanitize(gender, 20);
    if (isAqaMember !== undefined) user.isAqaMember = isAqaMember === true || isAqaMember === 'true';
    if (status) user.status = sanitize(status, 20);
    if (membershipTier) user.membershipTier = sanitize(membershipTier, 50);
    if (xp !== undefined) user.xp = parseInt(xp) || 0;
    if (badges !== undefined) {
      user.badges = Array.isArray(badges) ? badges.map(b => sanitize(b, 50)) : [];
    }
    if (safeNewSub) user.subscription = safeNewSub;

    saveMembers(members);
    res.json({ success: true, message: 'Fiche membre mise a jour' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/members/presence
router.post('/api/admin/members/presence', verifyAdminToken, (req, res) => {
  try {
    const { memberId, date, present, reason } = req.body;
    if (!memberId || !date) {
      return res.status(400).json({ success: false, error: 'Parametres requis manquants' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === memberId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    if (!user.presence) user.presence = [];

    // Filter out duplicate date entries
    user.presence = user.presence.filter(p => p.date !== date);
    const safeReason = sanitize(reason, 200);
    user.presence.push({
      date,
      present: present === true || present === 'true',
      reason: safeReason
    });

    saveMembers(members);
    res.json({ success: true, message: 'Presence enregistree', presence: user.presence });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/members/suivi
router.post('/api/admin/members/suivi', verifyAdminToken, (req, res) => {
  try {
    const { memberId, respiration, battement, bras, endurance, comments } = req.body;
    if (!memberId) {
      return res.status(400).json({ success: false, error: 'ID membre manquant' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === memberId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    const safeComments = sanitize(comments, 500);
    user.suiviTechnique = {
      respiration: parseInt(respiration) || 0,
      battement: parseInt(battement) || 0,
      bras: parseInt(bras) || 0,
      endurance: parseInt(endurance) || 0,
      comments: safeComments
    };

    saveMembers(members);
    res.json({ success: true, message: 'Evaluation technique enregistree' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/members/gallery
router.post('/api/admin/members/gallery', verifyAdminToken, (req, res) => {
  try {
    const { memberId, action, imageUrl } = req.body;
    if (!memberId || !action || !imageUrl) {
      return res.status(400).json({ success: false, error: 'Parametres requis manquants' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === memberId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    if (!user.gallery) user.gallery = [];

    if (action === 'add') {
      if (!user.gallery.includes(imageUrl)) {
        user.gallery.push(imageUrl);
      }
    } else if (action === 'remove') {
      user.gallery = user.gallery.filter(url => url !== imageUrl);
    }

    saveMembers(members);
    res.json({ success: true, message: 'Galerie mise a jour', gallery: user.gallery });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/members/approve-change
router.post('/api/admin/members/approve-change', verifyAdminToken, (req, res) => {
  try {
    const { memberId, action } = req.body; // action: 'approve' or 'reject'
    if (!memberId || !action) {
      return res.status(400).json({ success: false, error: 'Parametres requis manquants' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === memberId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    const changeReq = user.subscriptionChangeRequest;
    if (!changeReq) {
      return res.status(400).json({ success: false, error: 'Aucune demande en attente pour ce membre' });
    }

    if (action === 'approve') {
      // Read schedule.json to check slot availability for the new requested slot
      if (!fs.existsSync(SCHEDULE_FILE_PATH)) {
        return res.status(500).json({ success: false, error: 'Fichier planning introuvable' });
      }
      const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE_PATH, 'utf8'));
      const pool = schedule[changeReq.poolKey];
      if (!pool) {
        return res.status(400).json({ success: false, error: 'Nouveau planning introuvable pour cette piscine' });
      }
      const category = user.gender || 'homme';
      const cat = pool.categories[category];
      if (!cat) {
        return res.status(400).json({ success: false, error: 'Catégorie introuvable pour ce nouveau créneau' });
      }
      const coach = cat.coaches.find(c => c.name === changeReq.coachName);
      if (!coach) {
        return res.status(400).json({ success: false, error: 'Entraîneur introuvable pour ce nouveau créneau' });
      }
      const slot = coach.slots.find(s => s.day === changeReq.slotDay && s.time === changeReq.slotTime);
      if (!slot) {
        return res.status(400).json({ success: false, error: 'Nouveau créneau introuvable dans le planning' });
      }
      if ((slot.taken || 0) >= slot.total) {
        return res.status(400).json({ success: false, error: 'Le nouveau créneau demandé est complet (plus de places disponibles)' });
      }

      const oldSub = user.subscription;

      // Decrement slot count of the old sub if it was active
      if (user.status === 'active' && oldSub && oldSub.poolKey && oldSub.coachName && oldSub.slotDay && oldSub.slotTime) {
        adjustSlotTaken(oldSub.poolKey, oldSub.category || 'homme', oldSub.coachName, oldSub.slotDay, oldSub.slotTime, -1);
      }

      // Update subscription details with new requested slot
      user.membershipTier = changeReq.tier;
      user.subscription = {
        category: user.gender || 'homme',
        poolKey: changeReq.poolKey,
        coachName: changeReq.coachName,
        slotDay: changeReq.slotDay,
        slotTime: changeReq.slotTime,
        startDate: user.subscription.startDate || new Date().toISOString().split('T')[0],
        endDate: user.subscription.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // default 1 month if none exists
        status: 'active'
      };

      // Increment slot count of the new sub
      adjustSlotTaken(changeReq.poolKey, user.gender || 'homme', changeReq.coachName, changeReq.slotDay, changeReq.slotTime, 1);
      
      user.subscriptionChangeRequest = null;
      saveMembers(members);
      return res.json({ success: true, message: 'Changement de formule approuve avec succes' });
    } else {
      // Reject
      user.subscriptionChangeRequest = null;
      saveMembers(members);
      return res.json({ success: true, message: 'Changement de formule refuse' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/members/upload-image
router.post('/admin/members/upload-image', verifyAdminToken, (req, res) => {
  upload.single('file')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: `Erreur d'upload: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier fourni' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  });
});

module.exports = router;

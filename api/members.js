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

function getGroupsFromSubscription(sub) {
  if (!sub) return [];
  if (Array.isArray(sub.groups) && sub.groups.length > 0) {
    return sub.groups;
  }
  if (sub.poolKey && sub.coachName && sub.slotDay && sub.slotTime) {
    return [{
      poolKey: sub.poolKey,
      coachName: sub.coachName,
      slotDay: sub.slotDay,
      slotTime: sub.slotTime
    }];
  }
  return [];
}

async function syncSubscriptionGroups(oldSub, newSub, category, oldStatus, newStatus) {
  const oldActive = oldStatus === 'active';
  const newActive = newStatus === 'active';
  
  const oldGroups = oldActive ? getGroupsFromSubscription(oldSub) : [];
  const newGroups = newActive ? getGroupsFromSubscription(newSub) : [];
  
  const groupKey = (g) => `${g.poolKey}|${g.coachName}|${g.slotDay}|${g.slotTime}`;
  const oldKeys = new Set(oldGroups.map(groupKey));
  const newKeys = new Set(newGroups.map(groupKey));
  
  for (const g of oldGroups) {
    if (!newKeys.has(groupKey(g))) {
      await adjustSlotTaken(g.poolKey, category, g.coachName, g.slotDay, g.slotTime, -1);
    }
  }
  
  for (const g of newGroups) {
    if (!oldKeys.has(groupKey(g))) {
      await adjustSlotTaken(g.poolKey, category, g.coachName, g.slotDay, g.slotTime, 1);
    }
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
    if (!profile.profilePhotoUrl) profile.profilePhotoUrl = '';
    if (!profile.subscriptionHistory) profile.subscriptionHistory = [];

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/member/update-profile
router.post('/member/update-profile', verifyMemberToken, (req, res) => {
  try {
    const { fullName, phone, birthDate, gender, profilePhotoData } = req.body;
    const members = loadMembers();
    const user = members.find(m => m.id === req.member.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    if (fullName !== undefined) user.fullName = sanitize(fullName, 100);
    if (phone !== undefined) user.phone = sanitize(phone, 30);
    if (birthDate !== undefined) user.birthDate = sanitize(birthDate, 20);
    if (gender !== undefined) user.gender = sanitize(gender, 20);

    let newPhotoUrl = null;
    if (profilePhotoData) {
      // In local api, mock photo path
      newPhotoUrl = `/uploads/local-avatar-${Date.now()}.png`;
      user.profilePhotoUrl = newPhotoUrl;
    }

    saveMembers(members);
    res.json({ success: true, message: 'Profil mis a jour avec succes', profilePhotoUrl: newPhotoUrl || undefined });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/member/change-password
router.post('/api/member/change-password', verifyMemberToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Champs requis manquants' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === req.member.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Compte introuvable' });
    }

    if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return res.status(400).json({ success: false, error: 'Mot de passe actuel incorrect' });
    }

    const salt = bcrypt.genSaltSync(10);
    user.passwordHash = bcrypt.hashSync(newPassword, salt);

    saveMembers(members);
    res.json({ success: true, message: 'Mot de passe mis a jour avec succes' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/member/change-subscription
router.post('/member/change-subscription', verifyMemberToken, (req, res) => {
  try {
    let { tier, groups, poolKey, coachName, slotDay, slotTime } = req.body;
    if (!groups || !Array.isArray(groups)) {
      if (poolKey && coachName && slotDay && slotTime) {
        groups = [{ poolKey, coachName, slotDay, slotTime }];
      } else {
        groups = [];
      }
    }

    if (!tier || groups.length === 0) {
      return res.status(400).json({ success: false, error: 'Informations incompletes' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === req.member.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    const safeTier = sanitize(tier, 50);
    const TIER_LIMITS = {
      'starter': 1, 'silver': 2, 'gold': 3, 'diamond': 4, 'emerald': 5,
      'Starter': 1, 'Silver': 2, 'Gold': 3, 'Diamond': 4, 'Emerald': 5
    };
    const maxGroups = TIER_LIMITS[safeTier] || 1;
    if (groups.length > maxGroups) {
      return res.status(400).json({ success: false, error: `Votre formule (${safeTier}) ne permet de choisir que maximum ${maxGroups} créneau(x)` });
    }

    // Read schedule.json to check slot availability
    if (!fs.existsSync(SCHEDULE_FILE_PATH)) {
      return res.status(500).json({ success: false, error: 'Fichier planning introuvable' });
    }
    const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE_PATH, 'utf8'));
    const category = user.gender || 'homme';

    const safeGroups = [];
    for (const g of groups) {
      if (!g.poolKey || !g.coachName || !g.slotDay || !g.slotTime) {
        return res.status(400).json({ success: false, error: 'Informations de créneau incomplètes' });
      }
      const sPoolKey = sanitize(g.poolKey, 50);
      const sCoachName = sanitize(g.coachName, 100);
      const sSlotDay = sanitize(g.slotDay, 30);
      const sSlotTime = sanitize(g.slotTime, 30);

      const pool = schedule[sPoolKey];
      if (!pool) {
        return res.status(400).json({ success: false, error: `Piscine introuvable: ${sPoolKey}` });
      }
      const cat = pool.categories[category];
      if (!cat) {
        return res.status(400).json({ success: false, error: `Catégorie introuvable pour la piscine: ${sPoolKey}` });
      }
      const coach = cat.coaches.find(c => c.name === sCoachName);
      if (!coach) {
        return res.status(400).json({ success: false, error: `Entraîneur introuvable: ${sCoachName}` });
      }
      const slot = coach.slots.find(s => s.day === sSlotDay && s.time === sSlotTime);
      if (!slot) {
        return res.status(400).json({ success: false, error: `Créneau introuvable dans le planning: ${sSlotDay} ${sSlotTime}` });
      }
      if ((slot.taken || 0) >= slot.total) {
        return res.status(400).json({ success: false, error: `Le créneau (${sSlotDay} - ${sSlotTime}) avec ${sCoachName} est complet.` });
      }
      safeGroups.push({ poolKey: sPoolKey, coachName: sCoachName, slotDay: sSlotDay, slotTime: sSlotTime });
    }

    user.subscriptionChangeRequest = {
      tier: safeTier,
      groups: safeGroups,
      poolKey: safeGroups[0].poolKey,
      coachName: safeGroups.map(g => g.coachName).join(', '),
      slotDay: safeGroups.map(g => g.slotDay).join(', '),
      slotTime: safeGroups.map(g => g.slotTime).join(', '),
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

// POST /api/member/apply-membership
router.post('/member/apply-membership', verifyMemberToken, (req, res) => {
  try {
    let { tier, groups, poolKey, coachName, slotDay, slotTime } = req.body;
    if (!groups || !Array.isArray(groups)) {
      if (poolKey && coachName && slotDay && slotTime) {
        groups = [{ poolKey, coachName, slotDay, slotTime }];
      } else {
        groups = [];
      }
    }

    if (!tier || groups.length === 0) {
      return res.status(400).json({ success: false, error: 'Informations incompletes' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === req.member.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    const safeTier = sanitize(tier, 50);
    const TIER_LIMITS = {
      'starter': 1, 'silver': 2, 'gold': 3, 'diamond': 4, 'emerald': 5,
      'Starter': 1, 'Silver': 2, 'Gold': 3, 'Diamond': 4, 'Emerald': 5
    };
    const maxGroups = TIER_LIMITS[safeTier] || 1;
    if (groups.length > maxGroups) {
      return res.status(400).json({ success: false, error: `Votre formule (${safeTier}) ne permet de choisir que maximum ${maxGroups} créneau(x)` });
    }

    // Read schedule.json to check slot availability
    if (!fs.existsSync(SCHEDULE_FILE_PATH)) {
      return res.status(500).json({ success: false, error: 'Fichier planning introuvable' });
    }
    const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE_PATH, 'utf8'));
    const category = user.gender || 'homme';

    const safeGroups = [];
    for (const g of groups) {
      if (!g.poolKey || !g.coachName || !g.slotDay || !g.slotTime) {
        return res.status(400).json({ success: false, error: 'Informations de créneau incomplètes' });
      }
      const sPoolKey = sanitize(g.poolKey, 50);
      const sCoachName = sanitize(g.coachName, 100);
      const sSlotDay = sanitize(g.slotDay, 30);
      const sSlotTime = sanitize(g.slotTime, 30);

      const pool = schedule[sPoolKey];
      if (!pool) {
        return res.status(400).json({ success: false, error: `Piscine introuvable: ${sPoolKey}` });
      }
      const cat = pool.categories[category];
      if (!cat) {
        return res.status(400).json({ success: false, error: `Catégorie introuvable pour la piscine: ${sPoolKey}` });
      }
      const coach = cat.coaches.find(c => c.name === sCoachName);
      if (!coach) {
        return res.status(400).json({ success: false, error: `Entraîneur introuvable: ${sCoachName}` });
      }
      const slot = coach.slots.find(s => s.day === sSlotDay && s.time === sSlotTime);
      if (!slot) {
        return res.status(400).json({ success: false, error: `Créneau introuvable dans le planning: ${sSlotDay} ${sSlotTime}` });
      }
      if ((slot.taken || 0) >= slot.total) {
        return res.status(400).json({ success: false, error: `Le créneau (${sSlotDay} - ${sSlotTime}) avec ${sCoachName} est complet.` });
      }
      safeGroups.push({ poolKey: sPoolKey, coachName: sCoachName, slotDay: sSlotDay, slotTime: sSlotTime });
    }

    user.isAqaMember = true;
    user.status = 'pending';
    user.membershipTier = safeTier;
    user.subscription = {
      category: category,
      groups: safeGroups,
      poolKey: safeGroups[0].poolKey,
      coachName: safeGroups.map(g => g.coachName).join(', '),
      slotDay: safeGroups.map(g => g.slotDay).join(', '),
      slotTime: safeGroups.map(g => g.slotTime).join(', '),
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'pending'
    };
    user.subscriptionChangeRequest = null;

    saveMembers(members);

    res.json({
      success: true,
      message: 'Votre demande d\'adhesion a bien ete soumise.'
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
    const { memberId, membershipTier, poolKey, coachName, slotDay, slotTime, endDate, groups } = req.body;
    if (!memberId || !membershipTier || !endDate) {
      return res.status(400).json({ success: false, error: 'Tous les parametres d\'inscription sont requis' });
    }

    const members = loadMembers();
    const user = members.find(m => m.id === memberId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Membre introuvable' });
    }

    const safeMembershipTier = sanitize(membershipTier, 50);
    const safeEndDate = sanitize(endDate, 30);

    let finalGroups = [];
    if (groups && Array.isArray(groups) && groups.length > 0) {
      finalGroups = groups;
    } else if (poolKey && coachName && slotDay && slotTime) {
      finalGroups = [{ poolKey, coachName, slotDay, slotTime }];
    } else if (user.subscription) {
      finalGroups = getGroupsFromSubscription(user.subscription);
    }

    if (finalGroups.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun créneau sélectionné' });
    }

    const safeGroups = finalGroups.map(g => ({
      poolKey: sanitize(g.poolKey, 50),
      coachName: sanitize(g.coachName, 100),
      slotDay: sanitize(g.slotDay, 30),
      slotTime: sanitize(g.slotTime, 30)
    }));

    const updatedSub = {
      category: user.gender || 'homme',
      groups: safeGroups,
      poolKey: safeGroups[0]?.poolKey || '',
      coachName: safeGroups.map(g => g.coachName).join(', '),
      slotDay: safeGroups.map(g => g.slotDay).join(', '),
      slotTime: safeGroups.map(g => g.slotTime).join(', '),
      startDate: new Date().toISOString().split('T')[0],
      endDate: safeEndDate,
      status: 'active'
    };

    // Adjust slot capacity
    await syncSubscriptionGroups(user.subscription, updatedSub, user.gender || 'homme', user.status, 'active');

    user.status = 'active';
    user.membershipTier = safeMembershipTier;
    user.subscription = updatedSub;

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

    let safeNewSub = null;
    if (subscription) {
      const subGroups = getGroupsFromSubscription(subscription);
      safeNewSub = {
        category: sanitize(subscription.category, 20),
        groups: subGroups.map(g => ({
          poolKey: sanitize(g.poolKey, 50),
          coachName: sanitize(g.coachName, 100),
          slotDay: sanitize(g.slotDay, 30),
          slotTime: sanitize(g.slotTime, 30)
        })),
        poolKey: sanitize(subscription.poolKey || (subGroups[0]?.poolKey || ''), 50),
        coachName: sanitize(subscription.coachName || subGroups.map(g => g.coachName).join(', '), 100),
        slotDay: sanitize(subscription.slotDay || subGroups.map(g => g.slotDay).join(', '), 30),
        slotTime: sanitize(subscription.slotTime || subGroups.map(g => g.slotTime).join(', '), 30),
        startDate: sanitize(subscription.startDate, 30),
        endDate: sanitize(subscription.endDate, 30),
        status: sanitize(subscription.status, 20)
      };

      const oldSub = user.subscription;
      const groupKey = (g) => `${g.poolKey}|${g.coachName}|${g.slotDay}|${g.slotTime}`;
      const oldKeys = getGroupsFromSubscription(oldSub).map(groupKey).join(',');
      const newKeys = getGroupsFromSubscription(safeNewSub).map(groupKey).join(',');

      if (oldKeys !== newKeys) {
        const history = user.subscription_history || [];
        history.push({
          event: 'membership_updated_by_admin',
          date: new Date().toISOString(),
          details: {
            tier: membershipTier || user.membershipTier,
            poolKey: safeNewSub.poolKey,
            coachName: safeNewSub.coachName,
            slotDay: safeNewSub.slotDay,
            slotTime: safeNewSub.slotTime,
            groups: safeNewSub.groups
          }
        });
        user.subscription_history = history;
      }
    }

    // Sync capacities
    if (safeNewSub) {
      const newStatus = status || user.status;
      await syncSubscriptionGroups(user.subscription, safeNewSub, gender || user.gender || 'homme', user.status, newStatus);
    } else if (status && status !== user.status) {
      await syncSubscriptionGroups(user.subscription, user.subscription, gender || user.gender || 'homme', user.status, status);
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
      // Read schedule.json to check slot availability for the new requested slots
      if (!fs.existsSync(SCHEDULE_FILE_PATH)) {
        return res.status(500).json({ success: false, error: 'Fichier planning introuvable' });
      }
      const schedule = JSON.parse(fs.readFileSync(SCHEDULE_FILE_PATH, 'utf8'));
      const category = user.gender || 'homme';
      const changeGroups = getGroupsFromSubscription(changeReq);

      for (const g of changeGroups) {
        const pool = schedule[g.poolKey];
        if (!pool) {
          return res.status(400).json({ success: false, error: `Piscine introuvable: ${g.poolKey}` });
        }
        const cat = pool.categories[category];
        if (!cat) {
          return res.status(400).json({ success: false, error: `Catégorie introuvable pour la piscine: ${g.poolKey}` });
        }
        const coach = cat.coaches.find(c => c.name === g.coachName);
        if (!coach) {
          return res.status(400).json({ success: false, error: `Entraîneur introuvable: ${g.coachName}` });
        }
        const slot = coach.slots.find(s => s.day === g.slotDay && s.time === g.slotTime);
        if (!slot) {
          return res.status(400).json({ success: false, error: `Créneau introuvable dans le planning: ${g.slotDay} ${g.slotTime}` });
        }
        if ((slot.taken || 0) >= slot.total) {
          return res.status(400).json({ success: false, error: `Le créneau (${g.slotDay} - ${g.slotTime}) avec ${g.coachName} est déjà complet.` });
        }
      }

      const newSub = {
        category: category,
        groups: changeGroups,
        poolKey: changeGroups[0]?.poolKey || '',
        coachName: changeGroups.map(g => g.coachName).join(', '),
        slotDay: changeGroups.map(g => g.slotDay).join(', '),
        slotTime: changeGroups.map(g => g.slotTime).join(', '),
        startDate: user.subscription?.startDate || new Date().toISOString().split('T')[0],
        endDate: user.subscription?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // default 1 month if none exists
        status: 'active'
      };

      // Adjust slot capacity
      await syncSubscriptionGroups(user.subscription, newSub, category, user.status, 'active');

      user.membershipTier = changeReq.tier;
      user.subscription = newSub;
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

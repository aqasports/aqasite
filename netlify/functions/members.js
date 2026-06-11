try {
  require('dotenv').config();
} catch (e) {}

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error('FATAL: SUPABASE_URL environment variable is not set');
}
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_ANON_KEY) {
  throw new Error('FATAL: SUPABASE_ANON_KEY environment variable is not set');
}
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const owner = 'aqasports';
const repo = 'aqasite';

// Simple in-memory counter for member login attempts
const loginAttempts = new Map(); // email -> {count, resetAt}

// Helper: Query Supabase REST API
async function supabaseFetch(urlPath, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Les variables d\'environnement SUPABASE_URL et SUPABASE_ANON_KEY ne sont pas configurees dans Netlify.');
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
  // For DELETE or PATCH requests without preferred representation, response can be empty
  if (res.status === 204) return [];
  return res.json();
}

// Helper: adjust schedule slot taken count in Supabase
async function adjustSlotTaken(poolKey, category, coachName, day, time, increment) {
  try {
    const queryParams = `pool_key=eq.${encodeURIComponent(poolKey)}&category=eq.${encodeURIComponent(category)}&coach_name=eq.${encodeURIComponent(coachName)}&day=eq.${encodeURIComponent(day)}&time=eq.${encodeURIComponent(time)}`;
    const rows = await supabaseFetch(`schedule?${queryParams}`);
    if (rows && rows.length > 0) {
      const slot = rows[0];
      const newTaken = Math.max(0, Math.min(slot.total, slot.taken + increment));
      
      await supabaseFetch(`schedule?${queryParams}`, {
        method: 'PATCH',
        body: JSON.stringify({ taken: newTaken })
      });
      return true;
    }
  } catch (e) {
    console.error('Error adjusting slot taken in Supabase:', e);
  }
  return false;
}

function getLocalSchedulePath() {
  const possiblePaths = [
    path.join(__dirname, '..', 'src', 'data', 'schedule.json'),
    path.join(__dirname, '..', '..', 'src', 'data', 'schedule.json'),
    path.join(process.cwd(), 'src', 'data', 'schedule.json')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function getMergedSchedule() {
  let scheduleData = {};
  try {
    const localPath = getLocalSchedulePath();
    if (localPath && fs.existsSync(localPath)) {
      scheduleData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read local schedule baseline:', e);
  }

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

  return scheduleData;
}

const jwt = require('jsonwebtoken');

// JWT Helper: Sign Token
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

// JWT Helper: Verify Token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Auth Middleware helpers
function verifyMemberToken(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

function verifyAdminToken(event) {
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  return (decoded && decoded.isAdmin) ? decoded : null;
}

// Cloudinary Upload helper
async function uploadToCloudinary(fileData) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName) {
    throw new Error('La variable d\'environnement CLOUDINARY_CLOUD_NAME n\'est pas configuree.');
  }

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const body = new URLSearchParams();
  body.append('file', fileData);

  if (uploadPreset) {
    body.append('upload_preset', uploadPreset);
  } else if (apiKey && apiSecret) {
    const timestamp = Math.round((new Date()).getTime() / 1000);
    const signatureParameters = `timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signatureParameters).digest('hex');
    body.append('api_key', apiKey);
    body.append('timestamp', timestamp);
    body.append('signature', signature);
  } else {
    throw new Error('Veuillez configurer CLOUDINARY_UPLOAD_PRESET ou CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET.');
  }

  const res = await fetch(url, {
    method: 'POST',
    body: body.toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

// Helper: sanitize user inputs to prevent XSS and limit length
function sanitize(str, maxLength = 500) {
  if (!str) return '';
  return String(str)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .slice(0, maxLength);
}

// Main Netlify Function Handler
exports.handler = async (event, context) => {
  const allowedOrigins = [
    'https://aqasports.pro',
    'https://www.aqasports.pro',
    'https://aqasports.com',
    'https://www.aqasports.com',
    'https://aqasuivi.netlify.app'
  ];
  const requestOrigin = event.headers.origin || event.headers.Origin || '';
  const corsOrigin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('http://127.0.0.1:')
        ? requestOrigin
        : allowedOrigins[0]);

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // CORS options preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const rawPath = event.path;
  const pathPart = rawPath.replace(/^\/\.netlify\/functions\/members/, '').replace(/^\/api/, '');
  const method = event.httpMethod;

  try {
    // ----------------------------------------------------
    // GET /schedule
    // ----------------------------------------------------
    if (method === 'GET' && pathPart === '/schedule') {
      const schedule = await getMergedSchedule();
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(schedule)
      };
    }

    // ----------------------------------------------------
    // POST /member/register
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/member/register') {
      const { email, password, fullName, phone, birthDate, gender, isAqaMember } = JSON.parse(event.body || '{}');

      if (!email || !password || !fullName || !gender) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Veuillez remplir tous les champs obligatoires' })
        };
      }

      const safeEmail = sanitize(email, 150).toLowerCase();
      const safeFullName = sanitize(fullName, 100);
      const safePhone = sanitize(phone, 30);
      const safeBirthDate = sanitize(birthDate, 20);
      const safeGender = sanitize(gender, 20);

      // Check if existing
      const existing = await supabaseFetch(`members?email=eq.${encodeURIComponent(safeEmail)}`);
      if (existing && existing.length > 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Un compte existe deja avec cette adresse email' })
        };
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      const isMemberBool = isAqaMember === true || isAqaMember === 'true';
      const status = isMemberBool ? 'pending' : 'active';
      const tier = isMemberBool ? 'Silver' : 'Non-Membre';

      const newMember = {
        id: crypto.randomBytes(16).toString('hex'),
        email: safeEmail,
        password_hash: passwordHash,
        full_name: safeFullName,
        phone: safePhone,
        birth_date: safeBirthDate,
        gender: safeGender,
        is_aqa_member: isMemberBool,
        status,
        membership_tier: tier,
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
        suivi_technique: {
          respiration: 0,
          battement: 0,
          bras: 0,
          endurance: 0,
          comments: ''
        },
        gallery: [],
        subscription_change_request: null
      };

      await supabaseFetch('members', {
        method: 'POST',
        body: JSON.stringify(newMember)
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          status,
          message: isMemberBool 
            ? 'Inscription reussie. Votre compte est en attente de validation par l\'administrateur.'
            : 'Inscription reussie. Bienvenue dans la communaute AQA !'
        })
      };
    }

    // ----------------------------------------------------
    // POST /member/login
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/member/login') {
      const { email, password } = JSON.parse(event.body || '{}');
      if (!email || !password) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Champs manquants' })
        };
      }

      const emailKey = email.toLowerCase();
      const attempts = loginAttempts.get(emailKey) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
      if (Date.now() > attempts.resetAt) {
        attempts.count = 0;
        attempts.resetAt = Date.now() + 15 * 60 * 1000;
      }
      if (attempts.count >= 5) {
        return {
          statusCode: 429,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' })
        };
      }
      attempts.count++;
      loginAttempts.set(emailKey, attempts);

      const users = await supabaseFetch(`members?email=eq.${encodeURIComponent(emailKey)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Email ou mot de passe incorrect' })
        };
      }

      const user = users[0];
      if (!bcrypt.compareSync(password, user.password_hash)) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Email ou mot de passe incorrect' })
        };
      }

      // Successful login - clear rate limit attempts
      loginAttempts.delete(emailKey);

      const token = signToken({
        id: user.id,
        email: user.email,
        isAqaMember: user.is_aqa_member,
        status: user.status,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          token,
          member: {
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            isAqaMember: user.is_aqa_member,
            status: user.status,
            membershipTier: user.membership_tier
          }
        })
      };
    }

    // ----------------------------------------------------
    // GET /member/profile
    // ----------------------------------------------------
    if (method === 'GET' && pathPart === '/member/profile') {
      const decoded = verifyMemberToken(event);
      if (!decoded) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Non autorise ou session expiree' })
        };
      }

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(decoded.id)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Compte introuvable' })
        };
      }

      const user = users[0];
      const profile = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        birthDate: user.birth_date,
        gender: user.gender,
        isAqaMember: user.is_aqa_member,
        status: user.status,
        membershipTier: user.membership_tier,
        xp: user.xp,
        badges: user.badges,
        subscription: user.subscription,
        presence: user.presence,
        suiviTechnique: user.suivi_technique,
        gallery: user.gallery,
        subscriptionChangeRequest: user.subscription_change_request,
        profilePhotoUrl: user.profile_photo_url || '',
        subscriptionHistory: user.subscription_history || []
      };

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, profile })
      };
    }

    // ----------------------------------------------------
    // POST /member/update-profile
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/member/update-profile') {
      const decoded = verifyMemberToken(event);
      if (!decoded) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Non autorise ou session expiree' })
        };
      }

      const { fullName, phone, birthDate, gender, profilePhotoData } = JSON.parse(event.body || '{}');

      const updates = {};
      if (fullName !== undefined) updates.full_name = sanitize(fullName, 100);
      if (phone !== undefined) updates.phone = sanitize(phone, 30);
      if (birthDate !== undefined) updates.birth_date = sanitize(birthDate, 20);
      if (gender !== undefined) updates.gender = sanitize(gender, 20);

      let newPhotoUrl = null;
      if (profilePhotoData) {
        try {
          newPhotoUrl = await uploadToCloudinary(profilePhotoData);
          updates.profile_photo_url = newPhotoUrl;
        } catch (e) {
          console.error("Cloudinary upload error in update-profile:", e);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Erreur lors du telechargement de la photo de profil' })
          };
        }
      }

      await supabaseFetch(`members?id=eq.${encodeURIComponent(decoded.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Profil mis a jour avec succes',
          profilePhotoUrl: newPhotoUrl || undefined
        })
      };
    }

    // ----------------------------------------------------
    // POST /member/change-password
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/member/change-password') {
      const decoded = verifyMemberToken(event);
      if (!decoded) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Non autorise ou session expiree' })
        };
      }

      const { currentPassword, newPassword } = JSON.parse(event.body || '{}');
      if (!currentPassword || !newPassword) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Champs requis manquants' })
        };
      }

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(decoded.id)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Compte introuvable' })
        };
      }

      const user = users[0];
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Mot de passe actuel incorrect' })
        };
      }

      const salt = bcrypt.genSaltSync(10);
      const newHash = bcrypt.hashSync(newPassword, salt);

      await supabaseFetch(`members?id=eq.${encodeURIComponent(decoded.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ password_hash: newHash })
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Mot de passe mis a jour avec succes' })
      };
    }

    // ----------------------------------------------------
    // POST /member/change-subscription
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/member/change-subscription') {
      const decoded = verifyMemberToken(event);
      if (!decoded) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Session invalide' })
        };
      }

      const { tier, poolKey, coachName, slotDay, slotTime } = JSON.parse(event.body || '{}');
      if (!tier || !poolKey || !coachName || !slotDay || !slotTime) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Informations incompletes' })
        };
      }

      const safeTier = sanitize(tier, 50);
      const safePoolKey = sanitize(poolKey, 50);
      const safeCoachName = sanitize(coachName, 100);
      const safeSlotDay = sanitize(slotDay, 30);
      const safeSlotTime = sanitize(slotTime, 30);

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(decoded.id)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Compte introuvable' })
        };
      }
      const user = users[0];
      const category = user.gender || 'homme';

      // Real-time capacity check
      const queryParams = `pool_key=eq.${encodeURIComponent(safePoolKey)}&category=eq.${encodeURIComponent(category)}&coach_name=eq.${encodeURIComponent(safeCoachName)}&day=eq.${encodeURIComponent(safeSlotDay)}&time=eq.${encodeURIComponent(safeSlotTime)}`;
      const rows = await supabaseFetch(`schedule?${queryParams}`);
      if (!rows || rows.length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Créneau introuvable dans le planning' })
        };
      }
      const slot = rows[0];
      if (slot.taken >= slot.total) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Ce créneau est déjà complet (plus de places disponibles)' })
        };
      }

      const changeReq = {
        tier: safeTier,
        poolKey: safePoolKey,
        coachName: safeCoachName,
        slotDay: safeSlotDay,
        slotTime: safeSlotTime,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      const history = user.subscription_history || [];
      history.push({
        event: 'change_requested',
        date: new Date().toISOString(),
        details: {
          tier: safeTier,
          poolKey: safePoolKey,
          coachName: safeCoachName,
          slotDay: safeSlotDay,
          slotTime: safeSlotTime
        }
      });

      await supabaseFetch(`members?id=eq.${encodeURIComponent(decoded.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          subscription_change_request: changeReq,
          subscription_history: history
        })
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Votre demande de modification a bien ete soumise.' })
      };
    }

    // ----------------------------------------------------
    // POST /member/apply-membership
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/member/apply-membership') {
      const decoded = verifyMemberToken(event);
      if (!decoded) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Session invalide' })
        };
      }

      const { tier, poolKey, coachName, slotDay, slotTime } = JSON.parse(event.body || '{}');
      if (!tier || !poolKey || !coachName || !slotDay || !slotTime) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Informations incompletes' })
        };
      }

      const safeTier = sanitize(tier, 50);
      const safePoolKey = sanitize(poolKey, 50);
      const safeCoachName = sanitize(coachName, 100);
      const safeSlotDay = sanitize(slotDay, 30);
      const safeSlotTime = sanitize(slotTime, 30);

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(decoded.id)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Compte introuvable' })
        };
      }
      const user = users[0];
      const category = user.gender || 'homme';

      // Real-time capacity check
      const queryParams = `pool_key=eq.${encodeURIComponent(safePoolKey)}&category=eq.${encodeURIComponent(category)}&coach_name=eq.${encodeURIComponent(safeCoachName)}&day=eq.${encodeURIComponent(safeSlotDay)}&time=eq.${encodeURIComponent(safeSlotTime)}`;
      const rows = await supabaseFetch(`schedule?${queryParams}`);
      if (!rows || rows.length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Creneau introuvable dans le planning' })
        };
      }
      const slot = rows[0];
      if (slot.taken >= slot.total) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Ce creneau est deja complet' })
        };
      }

      const sub = {
        category: category,
        poolKey: safePoolKey,
        coachName: safeCoachName,
        slotDay: safeSlotDay,
        slotTime: safeSlotTime,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'pending'
      };

      const history = user.subscription_history || [];
      history.push({
        event: 'membership_applied',
        date: new Date().toISOString(),
        details: {
          tier: safeTier,
          poolKey: safePoolKey,
          coachName: safeCoachName,
          slotDay: safeSlotDay,
          slotTime: safeSlotTime
        }
      });

      await supabaseFetch(`members?id=eq.${encodeURIComponent(decoded.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_aqa_member: true,
          status: 'pending',
          membership_tier: safeTier,
          subscription: sub,
          subscription_change_request: null,
          subscription_history: history
        })
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Votre demande d\'adhesion a bien ete soumise.' })
      };
    }

    // ----------------------------------------------------
    // GET /member/public-stats
    // ----------------------------------------------------
    if (method === 'GET' && pathPart === '/member/public-stats') {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'ID requis' })
        };
      }

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(id)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Membre introuvable' })
        };
      }

      const user = users[0];
      if (user.status !== 'active') {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Compte inactif ou non valide' })
        };
      }

      const stats = {
        fullName: user.full_name,
        membershipTier: user.membership_tier,
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
        suiviTechnique: user.suivi_technique || { respiration: 0, battement: 0, bras: 0, endurance: 0, comments: '' }
      };

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, stats })
      };
    }

    // ==================== ADMIN ONLY ENDPOINTS ====================
    const adminDecoded = verifyAdminToken(event);
    if (!adminDecoded) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Acces administrateur requis' })
      };
    }

    // ----------------------------------------------------
    // GET /admin/members
    // ----------------------------------------------------
    if (method === 'GET' && pathPart === '/admin/members') {
      const allUsers = await supabaseFetch('members');
      const safeMembers = allUsers.map(user => {
        return {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          birthDate: user.birth_date,
          gender: user.gender,
          isAqaMember: user.is_aqa_member,
          status: user.status,
          membershipTier: user.membership_tier,
          xp: user.xp,
          badges: user.badges,
          subscription: user.subscription,
          presence: user.presence,
          suiviTechnique: user.suivi_technique,
          gallery: user.gallery,
          subscriptionChangeRequest: user.subscription_change_request
        };
      });
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, members: safeMembers })
      };
    }

    // ----------------------------------------------------
    // POST /admin/members/approve
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/admin/members/approve') {
      const { memberId, membershipTier, poolKey, coachName, slotDay, slotTime, endDate } = JSON.parse(event.body || '{}');
      if (!memberId || !membershipTier || !poolKey || !coachName || !slotDay || !slotTime || !endDate) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Parametres requis manquants' })
        };
      }

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Membre introuvable' })
        };
      }

      const safeMembershipTier = sanitize(membershipTier, 50);
      const safePoolKey = sanitize(poolKey, 50);
      const safeCoachName = sanitize(coachName, 100);
      const safeSlotDay = sanitize(slotDay, 30);
      const safeSlotTime = sanitize(slotTime, 30);
      const safeEndDate = sanitize(endDate, 30);

      const user = users[0];

      // Real-time capacity check
      const queryParams = `pool_key=eq.${encodeURIComponent(safePoolKey)}&category=eq.${encodeURIComponent(user.gender || 'homme')}&coach_name=eq.${encodeURIComponent(safeCoachName)}&day=eq.${encodeURIComponent(safeSlotDay)}&time=eq.${encodeURIComponent(safeSlotTime)}`;
      const rows = await supabaseFetch(`schedule?${queryParams}`);
      if (!rows || rows.length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Créneau introuvable dans le planning' })
        };
      }
      const slot = rows[0];
      if (slot.taken >= slot.total) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Ce créneau est déjà complet (plus de places disponibles)' })
        };
      }

      const updatedSub = {
        category: user.gender || 'homme',
        poolKey: safePoolKey,
        coachName: safeCoachName,
        slotDay: safeSlotDay,
        slotTime: safeSlotTime,
        startDate: new Date().toISOString().split('T')[0],
        endDate: safeEndDate,
        status: 'active'
      };

      const history = user.subscription_history || [];
      history.push({
        event: 'membership_approved',
        date: new Date().toISOString(),
        details: {
          tier: safeMembershipTier,
          poolKey: safePoolKey,
          coachName: safeCoachName,
          slotDay: safeSlotDay,
          slotTime: safeSlotTime,
          endDate: safeEndDate
        }
      });

      await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'active',
          membership_tier: safeMembershipTier,
          subscription: updatedSub,
          subscription_history: history
        })
      });

      // Adjust slot capacity
      await adjustSlotTaken(safePoolKey, user.gender || 'homme', safeCoachName, safeSlotDay, safeSlotTime, 1);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: `L'inscription de ${user.full_name} a été validée.` })
      };
    }

    // ----------------------------------------------------
    // POST /admin/members/update
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/admin/members/update') {
      const bodyData = JSON.parse(event.body || '{}');
      const { memberId, fullName, phone, birthDate, gender, isAqaMember, status, membershipTier, xp, badges, subscription } = bodyData;
      if (!memberId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'ID de membre manquant' })
        };
      }

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Membre introuvable' })
        };
      }

      const user = users[0];
      const oldSub = user.subscription;
      const newSub = subscription;

      if (newSub && oldSub && user.status === 'active' && status === 'active') {
        const slotChanged = oldSub.poolKey !== newSub.poolKey ||
                             oldSub.coachName !== newSub.coachName ||
                             oldSub.slotDay !== newSub.slotDay ||
                             oldSub.slotTime !== newSub.slotTime;
        if (slotChanged) {
          if (oldSub.poolKey && oldSub.coachName && oldSub.slotDay && oldSub.slotTime) {
            await adjustSlotTaken(oldSub.poolKey, oldSub.category || 'homme', oldSub.coachName, oldSub.slotDay, oldSub.slotTime, -1);
          }
          if (newSub.poolKey && newSub.coachName && newSub.slotDay && newSub.slotTime) {
            await adjustSlotTaken(newSub.poolKey, newSub.category || 'homme', newSub.coachName, newSub.slotDay, newSub.slotTime, 1);
          }
        }
      }

      const updates = {};
      if (fullName) updates.full_name = sanitize(fullName, 100);
      if (phone !== undefined) updates.phone = sanitize(phone, 30);
      if (birthDate !== undefined) updates.birth_date = sanitize(birthDate, 20);
      if (gender) updates.gender = sanitize(gender, 20);
      if (isAqaMember !== undefined) updates.is_aqa_member = isAqaMember === true || isAqaMember === 'true';
      if (status) updates.status = sanitize(status, 20);
      if (membershipTier) updates.membership_tier = sanitize(membershipTier, 50);
      if (xp !== undefined) updates.xp = parseInt(xp) || 0;
      if (badges !== undefined) {
        updates.badges = Array.isArray(badges) ? badges.map(b => sanitize(b, 50)) : [];
      }
      if (subscription) {
        updates.subscription = {
          category: sanitize(subscription.category, 20),
          poolKey: sanitize(subscription.poolKey, 50),
          coachName: sanitize(subscription.coachName, 100),
          slotDay: sanitize(subscription.slotDay, 30),
          slotTime: sanitize(subscription.slotTime, 30),
          startDate: sanitize(subscription.startDate, 30),
          endDate: sanitize(subscription.endDate, 30),
          status: sanitize(subscription.status, 20)
        };

        const oldSub = user.subscription;
        if (oldSub && (
          oldSub.poolKey !== updates.subscription.poolKey ||
          oldSub.coachName !== updates.subscription.coachName ||
          oldSub.slotDay !== updates.subscription.slotDay ||
          oldSub.slotTime !== updates.subscription.slotTime
        )) {
          const history = user.subscription_history || [];
          history.push({
            event: 'membership_updated_by_admin',
            date: new Date().toISOString(),
            details: {
              tier: membershipTier || user.membership_tier,
              poolKey: updates.subscription.poolKey,
              coachName: updates.subscription.coachName,
              slotDay: updates.subscription.slotDay,
              slotTime: updates.subscription.slotTime
            }
          });
          updates.subscription_history = history;
        }
      }

      await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Fiche membre mise a jour' })
      };
    }

    // ----------------------------------------------------
    // POST /admin/members/presence
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/admin/members/presence') {
      const { memberId, date, present, reason } = JSON.parse(event.body || '{}');
      if (!memberId || !date) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Parametres requis manquants' })
        };
      }

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Membre introuvable' })
        };
      }

      const user = users[0];
      let presence = user.presence || [];
      presence = presence.filter(p => p.date !== date);
      
      const safeReason = sanitize(reason, 200);
      presence.push({
        date,
        present: present === true || present === 'true',
        reason: safeReason
      });

      await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ presence })
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Presence enregistree', presence })
      };
    }

    // ----------------------------------------------------
    // POST /admin/members/suivi
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/admin/members/suivi') {
      const { memberId, respiration, battement, bras, endurance, comments } = JSON.parse(event.body || '{}');
      if (!memberId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'ID membre manquant' })
        };
      }

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Membre introuvable' })
        };
      }

      const safeComments = sanitize(comments, 500);
      const techRemarks = {
        respiration: parseInt(respiration) || 0,
        battement: parseInt(battement) || 0,
        bras: parseInt(bras) || 0,
        endurance: parseInt(endurance) || 0,
        comments: safeComments
      };

      await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ suivi_technique: techRemarks })
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Evaluation technique enregistree' })
      };
    }

    // ----------------------------------------------------
    // POST /admin/members/gallery
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/admin/members/gallery') {
      const { memberId, action, imageUrl } = JSON.parse(event.body || '{}');
      if (!memberId || !action || !imageUrl) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Parametres requis manquants' })
        };
      }

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Membre introuvable' })
        };
      }

      const user = users[0];
      let gallery = user.gallery || [];

      if (action === 'add') {
        if (!gallery.includes(imageUrl)) {
          gallery.push(imageUrl);
        }
      } else if (action === 'remove') {
        gallery = gallery.filter(url => url !== imageUrl);
      }

      await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ gallery })
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Galerie mise a jour', gallery })
      };
    }

    // ----------------------------------------------------
    // POST /admin/members/approve-change
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/admin/members/approve-change') {
      const { memberId, action } = JSON.parse(event.body || '{}');
      if (!memberId || !action) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Parametres requis manquants' })
        };
      }

      const users = await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`);
      if (!users || users.length === 0) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Membre introuvable' })
        };
      }

      const user = users[0];
      const changeReq = user.subscription_change_request;
      if (!changeReq) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Aucune demande en attente' })
        };
      }

      if (action === 'approve') {
        // Real-time capacity check for the new requested slot
        const queryParams = `pool_key=eq.${encodeURIComponent(changeReq.poolKey)}&category=eq.${encodeURIComponent(user.gender || 'homme')}&coach_name=eq.${encodeURIComponent(changeReq.coachName)}&day=eq.${encodeURIComponent(changeReq.slotDay)}&time=eq.${encodeURIComponent(changeReq.slotTime)}`;
        const rows = await supabaseFetch(`schedule?${queryParams}`);
        if (!rows || rows.length === 0) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Nouveau créneau introuvable dans le planning' })
          };
        }
        const slot = rows[0];
        if (slot.taken >= slot.total) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Le nouveau créneau demandé est complet (plus de places disponibles)' })
          };
        }

        const oldSub = user.subscription;
        if (user.status === 'active' && oldSub && oldSub.poolKey && oldSub.coachName && oldSub.slotDay && oldSub.slotTime) {
          await adjustSlotTaken(oldSub.poolKey, oldSub.category || 'homme', oldSub.coachName, oldSub.slotDay, oldSub.slotTime, -1);
        }

        const newSub = {
          category: user.gender || 'homme',
          poolKey: changeReq.poolKey,
          coachName: changeReq.coachName,
          slotDay: changeReq.slotDay,
          slotTime: changeReq.slotTime,
          startDate: user.subscription.startDate || new Date().toISOString().split('T')[0],
          endDate: user.subscription.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active'
        };

        const history = user.subscription_history || [];
        history.push({
          event: 'change_approved',
          date: new Date().toISOString(),
          details: {
            tier: changeReq.tier,
            poolKey: changeReq.poolKey,
            coachName: changeReq.coachName,
            slotDay: changeReq.slotDay,
            slotTime: changeReq.slotTime
          }
        });

        await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            membership_tier: changeReq.tier,
            subscription: newSub,
            subscription_change_request: null,
            subscription_history: history
          })
        });

        await adjustSlotTaken(changeReq.poolKey, user.gender || 'homme', changeReq.coachName, changeReq.slotDay, changeReq.slotTime, 1);

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, message: 'Changement de formule approuve avec succes' })
        };
      } else {
        const history = user.subscription_history || [];
        history.push({
          event: 'change_rejected',
          date: new Date().toISOString(),
          details: {
            tier: changeReq.tier,
            poolKey: changeReq.poolKey,
            coachName: changeReq.coachName,
            slotDay: changeReq.slotDay,
            slotTime: changeReq.slotTime
          }
        });

        await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            subscription_change_request: null,
            subscription_history: history
          })
        });
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, message: 'Changement de formule refuse' })
        };
      }
    }

    // ----------------------------------------------------
    // POST /admin/members/upload-image
    // ----------------------------------------------------
    if (method === 'POST' && pathPart === '/admin/members/upload-image') {
      const { fileData } = JSON.parse(event.body || '{}');
      if (!fileData) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Aucune donnee image fournie (Base64 requis)' })
        };
      }

      const secureUrl = await uploadToCloudinary(fileData);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, imageUrl: secureUrl })
      };
    }

    // Path not matched
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: `Route introuvable: ${method} ${pathPart}` })
    };

  } catch (err) {
    console.error('Function execution error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'aqa-sports-default-jwt-secret-key-2026';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const owner = 'aqasports';
const repo = 'aqasite';

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

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

// Helper: adjust schedule slot taken count
async function adjustSlotTaken(poolKey, category, coachName, day, time, increment) {
  // If running locally, attempt local filesystem write first
  const localPath = getLocalSchedulePath();
  if (localPath) {
    try {
      const data = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      const pool = data[poolKey];
      if (pool && pool.categories[category]) {
        const coach = pool.categories[category].coaches.find(c => c.name === coachName);
        if (coach) {
          const slot = coach.slots.find(s => s.day === day && s.time === time);
          if (slot) {
            slot.taken = Math.max(0, Math.min(slot.total, (slot.taken || 0) + increment));
            fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf8');
            return true;
          }
        }
      }
    } catch (e) {
      console.error('Local schedule update error:', e);
    }
  }

  // Update schedule via GitHub API in production
  if (GITHUB_TOKEN) {
    try {
      const filePath = 'src/data/schedule.json';
      const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AQA-Sports-Control-Center'
        }
      });
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        const schedule = JSON.parse(content);

        const pool = schedule[poolKey];
        if (pool && pool.categories[category]) {
          const coach = pool.categories[category].coaches.find(c => c.name === coachName);
          if (coach) {
            const slot = coach.slots.find(s => s.day === day && s.time === time);
            if (slot) {
              slot.taken = Math.max(0, Math.min(slot.total, (slot.taken || 0) + increment));
              const updatedContent = Buffer.from(JSON.stringify(schedule, null, 2)).toString('base64');
              await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `token ${GITHUB_TOKEN}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/vnd.github.v3+json',
                  'User-Agent': 'AQA-Sports-Control-Center'
                },
                body: JSON.stringify({
                  message: 'update: schedule.json slots via Member approval',
                  content: updatedContent,
                  sha: fileData.sha
                })
              });
              return true;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error adjusting slot taken count via GitHub:', e);
    }
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

// JWT Helper: Sign Token
function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

// JWT Helper: Verify Token
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

// Main Netlify Function Handler
exports.handler = async (event, context) => {
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

      // Check if existing
      const existing = await supabaseFetch(`members?email=eq.${encodeURIComponent(email.toLowerCase())}`);
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
        email: email.toLowerCase(),
        password_hash: passwordHash,
        full_name: fullName,
        phone: phone || '',
        birth_date: birthDate || '',
        gender,
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

      const users = await supabaseFetch(`members?email=eq.${encodeURIComponent(email.toLowerCase())}`);
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
        subscriptionChangeRequest: user.subscription_change_request
      };

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, profile })
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

      const changeReq = {
        tier,
        poolKey,
        coachName,
        slotDay,
        slotTime,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      await supabaseFetch(`members?id=eq.${encodeURIComponent(decoded.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ subscription_change_request: changeReq })
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true, message: 'Votre demande de modification a bien ete soumise.' })
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

      const user = users[0];
      const updatedSub = {
        category: user.gender || 'homme',
        poolKey,
        coachName,
        slotDay,
        slotTime,
        startDate: new Date().toISOString().split('T')[0],
        endDate,
        status: 'active'
      };

      await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'active',
          membership_tier: membershipTier,
          subscription: updatedSub
        })
      });

      // Adjust slot capacity
      await adjustSlotTaken(poolKey, user.gender || 'homme', coachName, slotDay, slotTime, 1);

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
      if (fullName) updates.full_name = fullName;
      if (phone !== undefined) updates.phone = phone;
      if (birthDate !== undefined) updates.birth_date = birthDate;
      if (gender) updates.gender = gender;
      if (isAqaMember !== undefined) updates.is_aqa_member = isAqaMember === true || isAqaMember === 'true';
      if (status) updates.status = status;
      if (membershipTier) updates.membership_tier = membershipTier;
      if (xp !== undefined) updates.xp = parseInt(xp) || 0;
      if (badges !== undefined) updates.badges = badges;
      if (subscription) updates.subscription = subscription;

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
      presence.push({
        date,
        present: present === true || present === 'true',
        reason: reason || ''
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

      const techRemarks = {
        respiration: parseInt(respiration) || 0,
        battement: parseInt(battement) || 0,
        bras: parseInt(bras) || 0,
        endurance: parseInt(endurance) || 0,
        comments: comments || ''
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

        await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            membership_tier: changeReq.tier,
            subscription: newSub,
            subscription_change_request: null
          })
        });

        await adjustSlotTaken(changeReq.poolKey, user.gender || 'homme', changeReq.coachName, changeReq.slotDay, changeReq.slotTime, 1);

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, message: 'Changement de formule approuve avec succes' })
        };
      } else {
        await supabaseFetch(`members?id=eq.${encodeURIComponent(memberId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ subscription_change_request: null })
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

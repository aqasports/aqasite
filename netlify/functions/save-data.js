const owner = 'aqasports';
const repo = 'aqasite';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  throw new Error('FATAL: ADMIN_PASSWORD environment variable is not set');
}

exports.handler = async (event, context) => {
  const allowedOrigins = [
    'https://aqasports.com',
    'https://www.aqasports.com',
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };

  // Handle preflight options requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false, 
        error: "Le jeton GITHUB_TOKEN n'est pas configuré dans Netlify. Veuillez l'ajouter dans les variables d'environnement de votre site Netlify." 
      })
    };
  }

  // Parse authorization header
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Non autorisé' })
    };
  }
  const token = authHeader.slice(7);

  // Load config passwordHash from GitHub or environment for signing key fallback
  let expectedHash = '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5';
  let cfg = { passwordHash: expectedHash, loginSlug: 'aqacontrol2026', extraSlugs: [] };
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/admin-config.json`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AQA-Sports-Control-Center'
      }
    });

    if (res.ok) {
      const data = await res.json();
      const contentBase64 = Buffer.from(data.content, 'base64').toString('utf8');
      cfg = JSON.parse(contentBase64);
      if (cfg.passwordHash) expectedHash = cfg.passwordHash;
    }
  } catch (err) {
    console.warn("Failed to fetch admin config from GitHub API", err);
  }

  const crypto = require('crypto');
  const jwt = require('jsonwebtoken');
  function verifyToken(token, secret) {
    try {
      return jwt.verify(token, secret);
    } catch (e) {
      return null;
    }
  }

  const secret = JWT_SECRET;
  const decoded = verifyToken(token, secret);

  if (!decoded || !decoded.isAdmin) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Jeton de connexion invalide ou expiré' })
    };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Invalid JSON body' })
    };
  }

  const { fileType, payload } = body;
  if (!fileType || !payload) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'fileType and payload are required' })
    };
  }

  // Map fileType to repository file path
  let filePath = '';
  let commitMessage = '';

  if (fileType === 'schedule') {
    filePath = 'src/data/schedule.json';
    commitMessage = 'update: schedule.json via Admin Control Center';
  } else if (fileType === 'formation') {
    filePath = 'src/data/formation.json';
    commitMessage = 'update: formation.json via Admin Control Center';
  } else if (fileType === 'store') {
    filePath = 'src/data/store.json';
    commitMessage = 'update: store.json via Admin Control Center';
  } else if (fileType === 'infrastructure') {
    filePath = 'src/data/infrastructure.json';
    commitMessage = 'update: infrastructure.json via Admin Control Center';
  } else if (fileType === 'counters') {
    filePath = 'src/data/counters.json';
    commitMessage = 'update: counters.json via Admin Control Center';
  } else if (fileType === 'admin-config') {
    filePath = 'admin-config.json';
    commitMessage = 'update: admin-config.json via Admin Control Center';
  } else {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Invalid fileType' })
    };
  }

  // Special handling for admin-config updates (merging, validation, bcrypting new password)
  let finalPayload = payload;
  if (fileType === 'admin-config') {
    const { currentPassword, passwordHash, loginSlug, extraSlugs } = payload;
    const requiresVerification = passwordHash || currentPassword;
    if (requiresVerification) {
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const verifyPassword = (password, storedHash) => {
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');
        if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
          return bcrypt.compareSync(inputHash, storedHash);
        }
        return inputHash === storedHash;
      };
      const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');
      if (!currentPassword || !verifyPassword(currentPassword, storedHash)) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Mot de passe actuel incorrect' })
        };
      }
    }

    // Merge new updates into current configuration object
    const bcrypt = require('bcryptjs');
    if (passwordHash) {
      cfg.passwordHash = bcrypt.hashSync(passwordHash, 12);
    }
    if (loginSlug) cfg.loginSlug = loginSlug;
    if (extraSlugs !== undefined) cfg.extraSlugs = extraSlugs;

    finalPayload = cfg;
  }

  try {
    // Get the current file SHA from GitHub to update it
    let sha = '';
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AQA-Sports-Control-Center'
      }
    });

    if (fileRes.ok) {
      const fileData = await fileRes.json();
      sha = fileData.sha;
    }

    // Convert payload to formatted JSON and Base64 encode it
    const jsonString = JSON.stringify(finalPayload, null, 2);
    const contentBase64 = Buffer.from(jsonString).toString('base64');

    // Update the file in the repository
    const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AQA-Sports-Control-Center'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        sha: sha || undefined
      })
    });

    if (updateRes.ok) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: true, 
          message: 'Données enregistrées avec succès ! Le site est en cours de reconstruction sur Netlify.' 
        })
      };
    } else {
      const errorData = await updateRes.json();
      return {
        statusCode: updateRes.status,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: errorData.message || 'GitHub API error' })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};

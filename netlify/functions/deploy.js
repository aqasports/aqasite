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

  const { password } = body;
  if (!password) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Mot de passe requis' })
    };
  }

  const bcrypt = require('bcryptjs');
  const verifyPassword = (pwd, storedHash) => {
    const inputHash = crypto.createHash('sha256').update(pwd).digest('hex');
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
      return bcrypt.compareSync(inputHash, storedHash);
    }
    return inputHash === storedHash;
  };

  const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');
  if (!verifyPassword(password, storedHash)) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Mot de passe incorrect' })
    };
  }

  try {
    // POST to Netlify Build Hook to trigger a redeploy
    const buildHookRes = await fetch('https://api.netlify.com/build_hooks/6a2b206710525f83e0d7412b', {
      method: 'POST'
    });

    if (buildHookRes.ok) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: true, 
          stdout: 'Déploiement Netlify déclenché avec succès via Build Hook ! Le site est en cours de reconstruction.' 
        })
      };
    } else {
      return {
        statusCode: buildHookRes.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: false, 
          error: `Le Build Hook de Netlify a renvoyé une erreur (status ${buildHookRes.status})` 
        })
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

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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

const jwt = require('jsonwebtoken');

function signToken(payload, secret) {
  const cleanPayload = { ...payload };
  const options = {};
  if (cleanPayload.exp) {
    const diffMs = cleanPayload.exp - Date.now();
    if (diffMs > 0) {
      options.expiresIn = Math.floor(diffMs / 1000);
    }
    delete cleanPayload.exp;
  }
  return jwt.sign(cleanPayload, secret, options);
}

function verifyPassword(password, storedHash) {
  const inputHash = crypto.createHash('sha256').update(password).digest('hex');
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return bcrypt.compareSync(inputHash, storedHash);
  }
  return inputHash === storedHash;
}

exports.handler = async (event, context) => {
  // CORS Headers
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
    'Access-Control-Allow-Credentials': 'true'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
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

    // Load admin config from GitHub or environment variable
    const githubToken = process.env.GITHUB_TOKEN;
    let cfg = { passwordHash: '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5', loginSlug: 'aqacontrol2026', extraSlugs: [] };
    let sha = '';
    let fetchedFromGithub = false;

    if (githubToken) {
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
          sha = data.sha;
          const content = Buffer.from(data.content, 'base64').toString('utf8');
          cfg = JSON.parse(content);
          fetchedFromGithub = true;
        }
      } catch (err) {
        console.warn("Failed to fetch admin config from GitHub API, using local fallbacks", err);
      }
    }

    // Resolve stored hash
    const storedHash = cfg.passwordHash || crypto.createHash('sha256').update(ADMIN_PASSWORD).digest('hex');

    if (!verifyPassword(password, storedHash)) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: 'Mot de passe incorrect' })
      };
    }

    // Handle migration of legacy SHA-256 hashes to bcrypt on GitHub repository
    if (fetchedFromGithub && githubToken && !storedHash.startsWith('$2a$') && !storedHash.startsWith('$2b$')) {
      try {
        const inputHash = crypto.createHash('sha256').update(password).digest('hex');
        cfg.passwordHash = bcrypt.hashSync(inputHash, 12);

        const jsonString = JSON.stringify(cfg, null, 2);
        const contentBase64 = Buffer.from(jsonString).toString('base64');

        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/admin-config.json`, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'AQA-Sports-Control-Center'
          },
          body: JSON.stringify({
            message: 'security: migrate admin-config.json to bcrypt hashing',
            content: contentBase64,
            sha: sha || undefined
          })
        });
      } catch (migrationErr) {
        console.error("Failed to persist bcrypt migration to GitHub:", migrationErr);
      }
    }

    const signingKey = JWT_SECRET;
    const token = signToken({ isAdmin: true, exp: Date.now() + 2 * 60 * 60 * 1000 }, signingKey);

    // Cookie max-age = 2 hours (7200s), Secure, HttpOnly, SameSite=Strict
    const cookieValue = `aqa_admin_session=${token}; Max-Age=7200; Path=/; HttpOnly; Secure; SameSite=Strict`;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Set-Cookie': cookieValue
      },
      body: JSON.stringify({ success: true, token })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};

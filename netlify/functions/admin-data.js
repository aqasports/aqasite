const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

const owner = 'aqasports';
const repo = 'aqasite';

const jwt = require('jsonwebtoken');

function verifyToken(token, secret) {
  try {
    return jwt.verify(token, secret);
  } catch (e) {
    return null;
  }
}

function readJsonFile(relativePath) {
  try {
    const fullPath = path.join(process.cwd(), relativePath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (e) {
    try {
      const fullPath = path.join(__dirname, '../../', relativePath);
      return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      console.error(`Failed to read file ${relativePath}`, err);
      return null;
    }
  }
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
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
  const githubToken = process.env.GITHUB_TOKEN;
  let expectedHash = '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5';
  let cfg = { loginSlug: 'aqacontrol2026', extraSlugs: [] };

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
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        cfg = JSON.parse(content);
        if (cfg.passwordHash) expectedHash = cfg.passwordHash;
      }
    } catch (err) {
      console.warn("Failed to fetch admin config from GitHub API", err);
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

  // Load and return JSON data files
  const schedule = readJsonFile('src/data/schedule.json') || {};
  const formations = readJsonFile('src/data/formation.json') || [];
  const store = readJsonFile('src/data/store.json') || [];
  const infrastructures = readJsonFile('src/data/infrastructure.json') || [];
  const counters = readJsonFile('src/data/counters.json') || {};

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      schedule,
      formations,
      store,
      infrastructures,
      counters,
      config: {
        loginSlug: cfg.loginSlug,
        extraSlugs: cfg.extraSlugs || []
      }
    })
  };
};

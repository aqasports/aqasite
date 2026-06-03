const crypto = require('crypto');

const owner = 'aqasports';
const repo = 'aqasite';

function verifyToken(token, secret) {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', secret)
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

exports.handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
        const cfg = JSON.parse(content);
        if (cfg.passwordHash) expectedHash = cfg.passwordHash;
      }
    } catch (err) {
      console.warn("Failed to fetch admin config from GitHub API", err);
    }
  }

  const secret = process.env.JWT_SECRET || expectedHash;
  const decoded = verifyToken(token, secret);

  if (!decoded || !decoded.isAdmin) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Jeton invalide ou expiré' })
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, valid: true })
  };
};

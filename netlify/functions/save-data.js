const owner = 'aqasports';
const repo = 'aqasite';

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  // Handle preflight options requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Non autorisé' })
    };
  }
  const token = authHeader.slice(7);

  // 1. Verify password hash using admin-config.json in the repo
  let isAuthorized = false;
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
      const expectedHash = cfg.passwordHash || '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5';
      if (token === expectedHash) {
        isAuthorized = true;
      }
    } else if (res.status === 404) {
      // Fallback if config doesn't exist yet
      if (token === '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5') {
        isAuthorized = true;
      }
    }
  } catch (err) {
    // Fallback in case of networking issues fetching admin config
    if (token === '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5') {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Jeton de connexion invalide' })
    };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Invalid JSON body' })
    };
  }

  const { fileType, payload } = body;
  if (!fileType || !payload) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Invalid fileType' })
    };
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
    const jsonString = JSON.stringify(payload, null, 2);
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Données enregistrées avec succès ! Le site est en cours de reconstruction sur Netlify.' 
        })
      };
    } else {
      const errorData = await updateRes.json();
      return {
        statusCode: updateRes.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: errorData.message || 'GitHub API error' })
      };
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};

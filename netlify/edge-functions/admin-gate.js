/**
 * admin-gate.js — Netlify Edge Function
 *
 * This runs AT THE CDN EDGE, before any static file is served.
 * It intercepts requests to the admin panel slug and enforces
 * server-side authentication via a signed session cookie.
 *
 * If the cookie is missing or invalid, the browser gets the
 * login page HTML — NOT the admin panel HTML.
 */

const COOKIE_NAME = 'aqa_admin_session';

// Verify a simple HMAC-SHA256 JWT-style token
async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = Uint8Array.from(
      atob(sig.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    const data = new TextEncoder().encode(`${header}.${payload}`);
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    if (!valid) return null;

    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded.exp && Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

export default async function adminGate(request, context) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Get the JWT_SECRET from env (same as Netlify functions use)
  const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'aqa-sports-default-jwt-secret-key-2026';

  // Read session cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
  const sessionToken = cookies[COOKIE_NAME];

  // If valid token, allow the request through to the static file
  if (sessionToken) {
    const decoded = await verifyToken(sessionToken, JWT_SECRET);
    if (decoded && decoded.isAdmin) {
      return context.next();
    }
  }

  // No valid session — serve the login page instead
  // Build a minimal but styled login form that posts credentials to /.netlify/functions/admin-auth
  const loginSlug = pathname.replace(/^\//, '').split('/')[0];
  const loginHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AQA Control Center — Authentification</title>
  <meta name="robots" content="noindex, nofollow">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #030712;
      font-family: 'Outfit', sans-serif;
      color: #f9fafb;
    }
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 50% -20%, rgba(0,242,255,.08) 0%, transparent 60%);
      pointer-events: none;
    }
    .card {
      background: rgba(15,23,42,.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 20px;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,.6);
    }
    .logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      display: block;
      margin: 0 auto 1.25rem;
    }
    h1 {
      text-align: center;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: .25rem;
      background: linear-gradient(135deg, #00f2ff, #0088ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.sub {
      text-align: center;
      color: #6b7280;
      font-size: .875rem;
      margin-bottom: 2rem;
    }
    label {
      display: block;
      font-size: .8rem;
      font-weight: 600;
      color: #9ca3af;
      margin-bottom: .4rem;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    input[type=password] {
      width: 100%;
      padding: .75rem 1rem;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 10px;
      color: #f9fafb;
      font-size: 1rem;
      font-family: inherit;
      outline: none;
      transition: border-color .2s;
    }
    input[type=password]:focus {
      border-color: rgba(0,242,255,.4);
      box-shadow: 0 0 0 3px rgba(0,242,255,.08);
    }
    .error {
      color: #f87171;
      font-size: .85rem;
      margin-top: .75rem;
      display: none;
      text-align: center;
    }
    button {
      margin-top: 1.5rem;
      width: 100%;
      padding: .85rem;
      background: linear-gradient(135deg, #00f2ff, #0088ff);
      color: #030712;
      font-weight: 700;
      font-size: 1rem;
      font-family: inherit;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: opacity .2s, transform .1s;
    }
    button:hover { opacity: .9; }
    button:active { transform: scale(.98); }
    button:disabled { opacity: .5; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="card">
    <img src="https://i.ibb.co/08WDCFj/Turquoise-Modern-Warning-with-Rays-Instagram-Post.png" alt="AQA" class="logo">
    <h1>AQA Control Center</h1>
    <p class="sub">Accès réservé — Authentification requise</p>
    <form id="form">
      <label for="pwd">🔐 Mot de passe administrateur</label>
      <input type="password" id="pwd" autocomplete="current-password" autofocus placeholder="••••••••••••">
      <div class="error" id="err">❌ Mot de passe incorrect. Réessayez.</div>
      <button type="submit" id="btn">Accéder au panneau</button>
    </form>
  </div>
  <script>
    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn');
      const err = document.getElementById('err');
      const pwd = document.getElementById('pwd').value;
      err.style.display = 'none';
      btn.disabled = true;
      btn.textContent = '⏳ Vérification...';

      try {
        const res = await fetch('/.netlify/functions/admin-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd })
        });
        const data = await res.json();
        if (data.success && data.token) {
          // Store token in sessionStorage for the admin panel JS to use after reload
          sessionStorage.setItem('aqa_admin_token', data.token);
          // The server set an HttpOnly session cookie — just reload to pass the edge gate
          window.location.reload();
        } else {
          err.style.display = 'block';
          document.getElementById('pwd').value = '';
          document.getElementById('pwd').focus();
        }
      } catch (ex) {
        err.textContent = '❌ Erreur réseau: ' + ex.message;
        err.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = 'Accéder au panneau';
    });
  </script>
</body>
</html>`;

  return new Response(loginHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  });
}

export const config = {
  // Will be overridden by netlify.toml [[edge_functions]] path config
  path: '/admin-gate-placeholder'
};

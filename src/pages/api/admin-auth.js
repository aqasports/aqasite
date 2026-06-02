import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const prerender = false;

function loadAdminConfig() {
  const filePath = path.join(process.cwd(), 'admin-config.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch(e) {
    return {
      passwordHash: process.env.ADMIN_PASSWORD ? crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest('hex') : '65cdacaf34486fbb5c32641665f6f5a1a6985aa89dbe66286f85bbdd4be34fd5',
      loginSlug: 'aqacontrol2026',
      extraSlugs: []
    };
  }
}

export async function POST({ request }) {
  try {
    const text = await request.text();
    if (!text) {
      return new Response(JSON.stringify({ success: false, error: 'Mot de passe requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const { password } = JSON.parse(text);
    if (!password) {
      return new Response(JSON.stringify({ success: false, error: 'Mot de passe requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cfg = loadAdminConfig();
    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    const expectedHash = cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'AqaSports2026!').digest('hex');

    if (inputHash !== expectedHash) {
      return new Response(JSON.stringify({ success: false, error: 'Mot de passe incorrect' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, token: expectedHash }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

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

export async function GET({ request }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const token = authHeader.slice(7);
    const cfg = loadAdminConfig();
    const expectedHash = cfg.passwordHash || crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'AqaSports2026!').digest('hex');

    if (token !== expectedHash) {
      return new Response(JSON.stringify({ success: false, error: 'Jeton invalide' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, valid: true }), {
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

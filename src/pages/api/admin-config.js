import fs from 'fs';
import path from 'path';

export const prerender = false;

function loadAdminConfig() {
  const filePath = path.join(process.cwd(), 'admin-config.json');
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch(e) {
    return {
      passwordHash: '',
      loginSlug: 'aqacontrol2026',
      extraSlugs: []
    };
  }
}

export async function GET() {
  try {
    const cfg = loadAdminConfig();
    return new Response(JSON.stringify({ loginSlug: cfg.loginSlug, extraSlugs: cfg.extraSlugs || [] }), {
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

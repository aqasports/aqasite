import fs from 'fs';
import path from 'path';

export const prerender = false;

export async function POST({ request }) {
  try {
    const text = await request.text();
    if (!text) {
      return new Response(JSON.stringify({ success: false, message: 'Le corps de la requete est vide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.store)) {
      return new Response(JSON.stringify({ success: false, message: 'Catalogue store invalide ou manquant' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const filePath = path.join(process.cwd(), 'src', 'data', 'store.json');
    fs.writeFileSync(filePath, JSON.stringify(data.store, null, 2), 'utf8');

    return new Response(JSON.stringify({ success: true, message: 'Catalogue store enregistre avec succes' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

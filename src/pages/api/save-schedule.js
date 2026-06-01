import fs from 'fs';
import path from 'path';

export const prerender = false; // Run as dynamic endpoint during local dev

export async function POST({ request }) {
  try {
    const text = await request.text();
    if (!text) {
      return new Response(JSON.stringify({ success: false, message: 'Le corps de la requête est vide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const data = JSON.parse(text);

    if (!data || !data.schedule) {
      return new Response(JSON.stringify({ success: false, message: 'Données invalides ou manquantes' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }


    // Write to schedule.json
    const filePath = path.join(process.cwd(), 'src', 'data', 'schedule.json');
    fs.writeFileSync(filePath, JSON.stringify(data.schedule, null, 2), 'utf8');

    return new Response(JSON.stringify({ success: true, message: 'Planning enregistré avec succès' }), {
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

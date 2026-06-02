import fs from 'fs';
import path from 'path';

export const prerender = false;

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'schedule.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ success: false, message: 'Planning introuvable' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

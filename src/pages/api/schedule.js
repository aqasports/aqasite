// src/pages/api/schedule.js
// Phase 3: Dynamic Schedule Hydration
// Serves LIVE schedule data from Supabase DB, eliminating the build-trigger bottleneck.
// Falls back to the local JSON file if Supabase is unavailable.
import fs from 'fs';
import path from 'path';

export const prerender = false;

const SUPABASE_URL = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

async function getBaselineSchedule() {
  const filePath = path.join(process.cwd(), 'src', 'data', 'schedule.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return {};
}

async function getLiveScheduleFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  
  const url = `${SUPABASE_URL}/rest/v1/schedule?select=*`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  try {
    // Always start with the baseline JSON structure
    const scheduleData = await getBaselineSchedule();

    // Attempt to overlay live Supabase slot counts
    try {
      const dbSlots = await getLiveScheduleFromSupabase();
      if (dbSlots && Array.isArray(dbSlots)) {
        dbSlots.forEach(dbSlot => {
          const pool = scheduleData[dbSlot.pool_key];
          if (pool?.categories?.[dbSlot.category]) {
            const cat = pool.categories[dbSlot.category];
            if (cat.coaches) {
              const coach = cat.coaches.find(c => c.name === dbSlot.coach_name);
              if (coach?.slots) {
                const slot = coach.slots.find(s => s.day === dbSlot.day && s.time === dbSlot.time);
                if (slot) {
                  // Overlay live counts from DB
                  slot.taken = dbSlot.taken;
                  slot.total = dbSlot.total;
                  if (dbSlot.slot_type) slot.type = dbSlot.slot_type;
                }
              }
            }
          }
        });
      }
    } catch (supabaseErr) {
      // Non-fatal: serve baseline schedule if live overlay fails
      console.warn('[schedule.js] Supabase live overlay failed, using baseline:', supabaseErr.message);
    }

    return new Response(JSON.stringify(scheduleData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Short cache: 30s in CDN, 60s stale-while-revalidate prevents thundering herd
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
      }
    });
  } catch (err) {
    console.error('[schedule.js] Fatal error:', err);
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

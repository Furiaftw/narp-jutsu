import { neon } from '@neondatabase/serverless';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: CORS_HEADERS,
    });
  }

  const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'Database URL not configured' }), {
      status: 500, headers: CORS_HEADERS,
    });
  }

  const sql = neon(databaseUrl);
  const stats = { jutsus: 0, battlemodes: 0, clanSlots: 0, bloodlines: 0 };

  try {
    // First run the migration to ensure new columns exist
    await sql`ALTER TABLE jutsus ADD COLUMN IF NOT EXISTS staff_review TEXT DEFAULT ''`.catch(() => {});
    await sql`ALTER TABLE jutsus ADD COLUMN IF NOT EXISTS slots TEXT DEFAULT ''`.catch(() => {});
    await sql`ALTER TABLE battlemodes ADD COLUMN IF NOT EXISTS slots TEXT DEFAULT ''`.catch(() => {});
    await sql`ALTER TABLE battlemodes ADD COLUMN IF NOT EXISTS must_learn_ic TEXT DEFAULT ''`.catch(() => {});
    await sql`ALTER TABLE clan_slots ADD COLUMN IF NOT EXISTS slots TEXT DEFAULT ''`.catch(() => {});
    await sql`ALTER TABLE bloodlines ADD COLUMN IF NOT EXISTS doc_link TEXT DEFAULT ''`.catch(() => {});
    await sql`ALTER TABLE bloodlines ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT ''`.catch(() => {});

    // --- Migrate Jutsus ---
    const jutsus = await sql`SELECT * FROM jutsus ORDER BY id`;
    for (const row of jutsus) {
      let changed = false;
      const updates = {};

      // Remove Yin-Yang from nature
      if (row.nature && row.nature.includes('Yin-Yang')) {
        updates.nature = row.nature.replace(/Yin-Yang/g, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
        changed = true;
      }

      // Remove Clan from origin, normalize to Canon or Custom
      if (row.origin === 'Clan') {
        updates.origin = 'Custom';
        changed = true;
      }

      // Normalize jutsu types - remove old types that aren't in the new set
      const validTypes = ['1 Post', 'Continuous', 'Multi-Post'];
      if (row.types) {
        const types = row.types.split(',').map(t => t.trim()).filter(Boolean);
        const mapped = types.map(t => {
          if (t === 'Multi-post' || t === 'Multi-Post') return 'Multi-Post';
          if (t === '1 Post' || t === '1-Post' || t === 'One Post') return '1 Post';
          if (t === 'Continuous') return 'Continuous';
          return null;
        }).filter(Boolean);
        const newTypes = [...new Set(mapped)].join(', ');
        if (newTypes !== row.types) {
          updates.types = newTypes;
          changed = true;
        }
      }

      // If jutsu has unrecognizable data, flag for staff review
      if (!row.staff_review && row.types) {
        const types = row.types.split(',').map(t => t.trim()).filter(Boolean);
        const hasInvalid = types.some(t => !validTypes.includes(t) && t !== 'Multi-post');
        if (hasInvalid) {
          updates.staff_review = 'Yes';
          changed = true;
        }
      }

      // Initialize slots for jutsus with Limited condition that don't have slots yet
      if (row.conditions && row.conditions.toLowerCase().includes('limited') && !row.slots) {
        const defaultSlots = JSON.stringify([
          { discord_id: '', username: '' },
        ]);
        updates.slots = defaultSlots;
        changed = true;
      }

      if (changed) {
        const cols = Object.keys(updates);
        const vals = Object.values(updates);
        const setClauses = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        await sql.query(`UPDATE jutsus SET ${setClauses} WHERE id = $${cols.length + 1}`, [...vals, row.id]);
        stats.jutsus++;
      }
    }

    // --- Migrate Battlemodes ---
    const battlemodes = await sql`SELECT * FROM battlemodes ORDER BY id`;
    for (const row of battlemodes) {
      let changed = false;
      const updates = {};

      // Remove Yin-Yang from nature
      if (row.nature && row.nature.includes('Yin-Yang')) {
        updates.nature = row.nature.replace(/Yin-Yang/g, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim();
        changed = true;
      }

      // Convert limited Yes/No to checkbox format and initialize slots
      if (row.limited && row.limited.toLowerCase() === 'yes' && !row.slots) {
        const defaultSlots = JSON.stringify([
          { discord_id: '', username: '' },
          { discord_id: '', username: '' },
          { discord_id: '', username: '' },
          { discord_id: '', username: '' },
        ]);
        updates.slots = defaultSlots;
        updates.limited = 'Yes';
        changed = true;
      }

      if (changed) {
        const cols = Object.keys(updates);
        const vals = Object.values(updates);
        const setClauses = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        await sql.query(`UPDATE battlemodes SET ${setClauses} WHERE id = $${cols.length + 1}`, [...vals, row.id]);
        stats.battlemodes++;
      }
    }

    // --- Migrate Clan Slots (now Limited Specs) ---
    const clanSlots = await sql`SELECT * FROM clan_slots ORDER BY id`;
    for (const row of clanSlots) {
      let changed = false;
      const updates = {};

      // Initialize slots if not present
      if (!row.slots) {
        const defaultSlots = JSON.stringify([
          { discord_id: '', username: '' },
          { discord_id: '', username: '' },
          { discord_id: '', username: '' },
          { discord_id: '', username: '' },
        ]);
        updates.slots = defaultSlots;
        changed = true;
      }

      // Normalize available field based on existing data
      if (row.available) {
        const avLower = row.available.toLowerCase();
        if (avLower === 'yes' || avLower === 'true' || avLower === 'available' || avLower === 'open') {
          updates.available = 'Yes';
        } else {
          updates.available = 'No';
        }
        if (updates.available !== row.available) changed = true;
      }

      if (changed) {
        const cols = Object.keys(updates);
        const vals = Object.values(updates);
        const setClauses = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        await sql.query(`UPDATE clan_slots SET ${setClauses} WHERE id = $${cols.length + 1}`, [...vals, row.id]);
        stats.clanSlots++;
      }
    }

    // --- Migrate Bloodlines ---
    const bloodlines = await sql`SELECT * FROM bloodlines ORDER BY id`;
    for (const row of bloodlines) {
      let changed = false;
      const updates = {};

      // Normalize category to Canon or Custom
      if (row.category && row.category !== 'Canon' && row.category !== 'Custom') {
        // Try to determine if it's Canon or Custom based on known patterns
        const catLower = row.category.toLowerCase();
        if (catLower.includes('canon')) {
          updates.category = 'Canon';
        } else if (catLower.includes('custom')) {
          updates.category = 'Custom';
        } else {
          // Legacy categories like "KKG" or "Clan" - these become subcategory
          // and category becomes "Canon" by default (can be changed by admin)
          updates.subcategory = row.category;
          updates.category = 'Canon';
        }
        changed = true;
      }

      if (changed) {
        const cols = Object.keys(updates);
        const vals = Object.values(updates);
        const setClauses = cols.map((col, i) => `${col} = $${i + 1}`).join(', ');
        await sql.query(`UPDATE bloodlines SET ${setClauses} WHERE id = $${cols.length + 1}`, [...vals, row.id]);
        stats.bloodlines++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Existing data migrated to new schema',
      stats,
    }), {
      status: 200, headers: CORS_HEADERS,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: CORS_HEADERS,
    });
  }
};

export const config = {
  path: '/api/db-migrate-data',
};

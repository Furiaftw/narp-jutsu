import { neon } from '@neondatabase/serverless';

export default async (req) => {
  const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'Database URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const sql = neon(databaseUrl);

  try {
    // Query all tables in parallel, with graceful fallbacks for missing tables
    const safeQuery = async (query) => {
      try { return await query; }
      catch (e) {
        if (e.message && (e.message.includes('does not exist') || e.message.includes('relation'))) return [];
        throw e;
      }
    };

    const [jutsus, battlemodes, clanSlots, bloodlineRows, factionRows] = await Promise.all([
      safeQuery(sql`SELECT * FROM jutsus ORDER BY id`),
      safeQuery(sql`SELECT * FROM battlemodes ORDER BY id`),
      safeQuery(sql`SELECT * FROM clan_slots ORDER BY id`),
      safeQuery(sql`SELECT * FROM bloodlines ORDER BY category, id`),
      safeQuery(sql`SELECT * FROM factions ORDER BY id`),
    ]);

    // Reconstruct bloodlines as category -> names object
    const bloodlines = {};
    for (const row of bloodlineRows) {
      if (!bloodlines[row.category]) bloodlines[row.category] = [];
      bloodlines[row.category].push(row.name);
    }

    // Reconstruct factions as array of strings
    const factions = factionRows.map(r => r.name);

    // Map jutsus to the format the frontend expects
    const jutsusData = jutsus.map(row => ({
      'Ability Name': row.name,
      'Nature Type': row.nature,
      'Rank': row.rank,
      'Cost': row.cost,
      'Jutsu Types': row.types,
      'Origin': row.origin,
      'Specialization': row.specialization,
      'Doc Link': row.doc_link,
      'Bloodline': row.bloodline,
      'Conditions': row.conditions,
      'Secret Faction': row.secret_faction,
      'Staff Review': row.staff_review || '',
      'Slots': row.slots || '',
    }));

    // Map battlemodes to the format the frontend expects
    const battlemodesData = battlemodes.map(row => ({
      'Name': row.name,
      'Type': row.category,
      'Bloodline/Hidden': row.bloodline,
      'Nature(s)': row.nature,
      'Doc': row.doc_link,
      'Limited': row.limited,
      'Available': row.available,
      'Slots': row.slots || '',
      'Must Learn IC': row.must_learn_ic || '',
    }));

    // Map clan_slots to the format the frontend expects
    const clanSlotsData = clanSlots.map(row => ({
      'Name': row.name,
      'Available': row.available,
      'Link': row.doc_link,
      'Slots': row.slots || '',
    }));

    // Also return bloodline rows with full detail for dropdown usage
    const bloodlinesList = bloodlineRows.map(row => ({
      id: row.id,
      category: row.category,
      name: row.name,
      doc_link: row.doc_link || '',
      subcategory: row.subcategory || '',
    }));

    const response = {
      jutsus: jutsusData,
      battlemodes: battlemodesData,
      clanSlots: clanSlotsData,
      bloodlines,
      bloodlinesList,
      factions,
      _source: 'neon',
      _timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, hint: 'If tables do not exist, call POST /api/db-migrate first, then POST /api/db-seed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
};

export const config = {
  path: '/api/data',
};

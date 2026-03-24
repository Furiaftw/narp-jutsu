import { neon } from '@neondatabase/serverless';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'Database URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const appsScriptUrl = process.env.VITE_APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    return new Response(JSON.stringify({ error: 'Google Apps Script URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sql = neon(databaseUrl);

  try {
    // Fetch data from Google Sheets
    const res = await fetch(appsScriptUrl);
    if (!res.ok) throw new Error(`Google Apps Script fetch failed: ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`Google Apps Script error: ${json.error}`);

    // Helper to find value by multiple key names (case-insensitive)
    function getVal(obj, ...candidates) {
      if (!obj || typeof obj !== 'object') return undefined;
      for (const c of candidates) {
        if (obj[c] !== undefined && obj[c] !== null) return obj[c];
      }
      const keys = Object.keys(obj);
      for (const c of candidates) {
        const lower = c.toLowerCase().replace(/[\s_-]/g, '');
        const match = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === lower);
        if (match && obj[match] !== undefined && obj[match] !== null) return obj[match];
      }
      return undefined;
    }

    function getStr(row, ...candidates) {
      const val = getVal(row, ...candidates);
      return val !== undefined && val !== null ? String(val).trim() : '';
    }

    const stats = { jutsus: 0, battlemodes: 0, clanSlots: 0, bloodlines: 0, factions: 0 };

    // --- Clear existing data ---
    await sql`DELETE FROM jutsus`;
    await sql`DELETE FROM battlemodes`;
    await sql`DELETE FROM clan_slots`;
    await sql`DELETE FROM bloodlines`;
    await sql`DELETE FROM factions`;

    // --- Seed jutsus ---
    const rawJutsus = getVal(json, 'jutsus', 'Jutsus', 'jutsu', 'Jutsu') || [];
    for (const row of rawJutsus) {
      const name = getStr(row, 'Ability Name', 'AbilityName', 'Name', 'name', 'Jutsu Name', 'JutsuName');
      if (!name) continue;
      await sql`
        INSERT INTO jutsus (name, nature, rank, cost, types, origin, specialization, doc_link, bloodline, conditions, secret_faction)
        VALUES (
          ${name},
          ${getStr(row, 'Nature Type', 'NatureType', 'Nature', 'nature')},
          ${getStr(row, 'Rank', 'rank', 'Ranks')},
          ${getStr(row, 'Cost', 'cost')},
          ${getStr(row, 'Jutsu Types', 'JutsuTypes', 'Type', 'Types', 'jutsu types')},
          ${getStr(row, 'Origin', 'origin')},
          ${getStr(row, 'Specialization', 'specialization', 'Spec', 'spec')},
          ${getStr(row, 'Doc Link', 'DocLink', 'Link', 'link', 'Doc', 'URL')},
          ${getStr(row, 'Bloodline', 'bloodline', 'Bloodline/KKG', 'Clan')},
          ${getStr(row, 'Conditions', 'conditions', 'Condition')},
          ${getStr(row, 'Secret Faction', 'SecretFaction', 'Secret', 'secret faction')}
        )
      `;
      stats.jutsus++;
    }

    // --- Seed battlemodes ---
    const rawBattlemodes = getVal(json, 'battlemodes', 'Battlemodes', 'battleModes', 'BattleModes', 'battle_modes', 'Battlemode') || [];
    for (const row of rawBattlemodes) {
      const name = getStr(row, 'Name', 'name', 'Battlemode Name', 'BattlemodeName', 'BM Name', 'Battlemode');
      if (!name) continue;
      await sql`
        INSERT INTO battlemodes (name, category, bloodline, nature, doc_link, limited, available)
        VALUES (
          ${name},
          ${getStr(row, 'Type', 'type', 'Category', 'category')},
          ${getStr(row, 'Bloodline/Hidden', 'Bloodline/KKG/Clan', 'Bloodline/KKG', 'Clan', 'clan', 'Bloodline', 'bloodline', 'KKG', 'Hidden')},
          ${getStr(row, 'Nature(s)', 'Natures', 'Nature', 'nature', 'Nature Type', 'NatureType')},
          ${getStr(row, 'Doc', 'Doc Link', 'DocLink', 'Link', 'link', 'URL')},
          ${getStr(row, 'Limited', 'limited', 'Limited Slots', 'LimitedSlots')},
          ${getStr(row, 'Available', 'available', 'AvailableSlot', 'Availability', 'Status')}
        )
      `;
      stats.battlemodes++;
    }

    // --- Seed clan_slots ---
    const rawClanSlots = getVal(json, 'clanSlots', 'clanslots', 'clan_slots', 'ClanSlots', 'Clan Slots') || [];
    for (const slot of rawClanSlots) {
      const name = getStr(slot, 'name', 'Name', 'Clan', 'Clan Name', 'ClanName', 'Item', 'Item Name');
      if (!name) continue;
      await sql`
        INSERT INTO clan_slots (name, available, doc_link)
        VALUES (
          ${name},
          ${getStr(slot, 'available', 'Available', 'Status', 'Availability', 'AvailableSlot')},
          ${getStr(slot, 'link', 'Link', 'Doc', 'Doc Link', 'DocLink', 'URL')}
        )
      `;
      stats.clanSlots++;
    }

    // --- Seed bloodlines ---
    const bloodlines = getVal(json, 'bloodlines', 'Bloodlines') || {};
    for (const [category, names] of Object.entries(bloodlines)) {
      if (!Array.isArray(names)) continue;
      for (const name of names) {
        await sql`INSERT INTO bloodlines (category, name) VALUES (${category}, ${String(name).trim()})`;
        stats.bloodlines++;
      }
    }

    // --- Seed factions ---
    const factions = getVal(json, 'factions', 'Factions') || [];
    for (const name of factions) {
      await sql`INSERT INTO factions (name) VALUES (${String(name).trim()})`;
      stats.factions++;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Database seeded successfully from Google Sheets',
      stats,
      apiKeys: Object.keys(json),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/api/db-seed',
};

import { neon } from '@neondatabase/serverless';

export default async (req) => {
  // Only allow POST requests
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

  const sql = neon(databaseUrl);

  try {
    // Create jutsus table
    await sql`
      CREATE TABLE IF NOT EXISTS jutsus (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        nature TEXT DEFAULT '',
        rank TEXT DEFAULT '',
        cost TEXT DEFAULT '',
        types TEXT DEFAULT '',
        origin TEXT DEFAULT '',
        specialization TEXT DEFAULT '',
        doc_link TEXT DEFAULT '',
        bloodline TEXT DEFAULT '',
        conditions TEXT DEFAULT '',
        secret_faction TEXT DEFAULT '',
        staff_review TEXT DEFAULT '',
        slots TEXT DEFAULT ''
      )
    `;

    // Add columns if missing (for existing tables)
    await sql`ALTER TABLE jutsus ADD COLUMN IF NOT EXISTS staff_review TEXT DEFAULT ''`.catch(() => {});
    await sql`ALTER TABLE jutsus ADD COLUMN IF NOT EXISTS slots TEXT DEFAULT ''`.catch(() => {});

    // Create battlemodes table
    await sql`
      CREATE TABLE IF NOT EXISTS battlemodes (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT DEFAULT '',
        bloodline TEXT DEFAULT '',
        nature TEXT DEFAULT '',
        doc_link TEXT DEFAULT '',
        limited TEXT DEFAULT '',
        available TEXT DEFAULT '',
        slots TEXT DEFAULT '',
        must_learn_ic TEXT DEFAULT ''
      )
    `;

    // Add new columns if missing
    await sql`ALTER TABLE battlemodes ADD COLUMN IF NOT EXISTS slots TEXT DEFAULT ''`.catch(() => {});
    await sql`ALTER TABLE battlemodes ADD COLUMN IF NOT EXISTS must_learn_ic TEXT DEFAULT ''`.catch(() => {});

    // Create clan_slots table (now "Limited Specs")
    await sql`
      CREATE TABLE IF NOT EXISTS clan_slots (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        available TEXT DEFAULT '',
        doc_link TEXT DEFAULT '',
        slots TEXT DEFAULT ''
      )
    `;

    // Add slots column if missing
    await sql`ALTER TABLE clan_slots ADD COLUMN IF NOT EXISTS slots TEXT DEFAULT ''`.catch(() => {});

    // Create bloodlines table
    await sql`
      CREATE TABLE IF NOT EXISTS bloodlines (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        doc_link TEXT DEFAULT '',
        subcategory TEXT DEFAULT ''
      )
    `;

    // Add new columns if missing
    await sql`ALTER TABLE bloodlines ADD COLUMN IF NOT EXISTS doc_link TEXT DEFAULT ''`.catch(() => {});
    await sql`ALTER TABLE bloodlines ADD COLUMN IF NOT EXISTS subcategory TEXT DEFAULT ''`.catch(() => {});

    // Create factions table
    await sql`
      CREATE TABLE IF NOT EXISTS factions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `;

    return new Response(JSON.stringify({ success: true, message: 'All tables created/updated successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/api/db-migrate',
};

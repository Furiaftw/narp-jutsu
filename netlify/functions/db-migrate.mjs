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
        secret_faction TEXT DEFAULT ''
      )
    `;

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
        available TEXT DEFAULT ''
      )
    `;

    // Create clan_slots table
    await sql`
      CREATE TABLE IF NOT EXISTS clan_slots (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        available TEXT DEFAULT '',
        doc_link TEXT DEFAULT ''
      )
    `;

    // Create bloodlines table
    await sql`
      CREATE TABLE IF NOT EXISTS bloodlines (
        id SERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        name TEXT NOT NULL
      )
    `;

    // Create factions table
    await sql`
      CREATE TABLE IF NOT EXISTS factions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL
      )
    `;

    return new Response(JSON.stringify({ success: true, message: 'All tables created successfully' }), {
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

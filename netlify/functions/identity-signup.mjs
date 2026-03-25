import { neon } from '@neondatabase/serverless';

const handler = async (event) => {
  const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) };
  }

  const sql = neon(databaseUrl);
  const { user } = JSON.parse(event.body || '{}');

  if (!user || !user.id || !user.email) {
    return { statusCode: 200, body: JSON.stringify({}) };
  }

  try {
    // Create user profile in PostgreSQL with pending status
    await sql`
      INSERT INTO users (id, email, role, status, allowed_factions, created_at)
      VALUES (${user.id}, ${user.email}, 'user', 'pending', '[]', NOW())
      ON CONFLICT (id) DO NOTHING
    `;
  } catch (err) {
    console.error('identity-signup: Failed to create user profile:', err);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({}),
  };
};

export { handler };

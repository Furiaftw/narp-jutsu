import { neon } from '@neondatabase/serverless';
import { getUser } from '@netlify/identity';

export default async (req) => {
  const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), { status: 500 });
  }

  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const sql = neon(databaseUrl);

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT * FROM users WHERE id = ${user.id}`;
      if (rows.length === 0) {
        // User exists in Identity but not in DB yet (race condition with identity-signup)
        // Create the profile now
        await sql`
          INSERT INTO users (id, email, role, status, allowed_factions, created_at)
          VALUES (${user.id}, ${user.email}, 'user', 'pending', '[]', NOW())
          ON CONFLICT (id) DO NOTHING
        `;
        const newRows = await sql`SELECT * FROM users WHERE id = ${user.id}`;
        return new Response(JSON.stringify(newRows[0] || null), { status: 200 });
      }
      return new Response(JSON.stringify(rows[0]), { status: 200 });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
};

export const config = {
  path: '/api/user-profile',
};

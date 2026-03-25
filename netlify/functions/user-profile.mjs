import { neon } from '@neondatabase/serverless';
import { getUser } from '@netlify/identity';

const SUPER_ADMIN_EMAIL = 'grisales4000@gmail.com';

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
      const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
      const rows = await sql`SELECT * FROM users WHERE id = ${user.id}`;
      if (rows.length === 0) {
        // User exists in Identity but not in DB yet (race condition with identity-signup)
        // Create the profile now — super admin gets auto-approved with admin role
        const role = isSuperAdmin ? 'admin' : 'user';
        const status = isSuperAdmin ? 'approved' : 'pending';
        await sql`
          INSERT INTO users (id, email, role, status, allowed_factions, created_at)
          VALUES (${user.id}, ${user.email}, ${role}, ${status}, '[]', NOW())
          ON CONFLICT (id) DO NOTHING
        `;
        const newRows = await sql`SELECT * FROM users WHERE id = ${user.id}`;
        return new Response(JSON.stringify(newRows[0] || null), { status: 200 });
      }
      // Ensure super admin always has admin role and approved status
      if (isSuperAdmin && (rows[0].status !== 'approved' || rows[0].role !== 'admin')) {
        await sql`UPDATE users SET role = 'admin', status = 'approved' WHERE id = ${user.id}`;
        rows[0].role = 'admin';
        rows[0].status = 'approved';
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

import { neon } from '@neondatabase/serverless';

const SUPER_ADMIN_EMAIL = 'grisales4000@gmail.com';

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
    // Super admin gets auto-approved with admin role
    const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL;
    const role = isSuperAdmin ? 'admin' : 'user';
    const status = isSuperAdmin ? 'approved' : 'pending';
    // Create user profile in PostgreSQL.
    // For the super admin, use DO UPDATE so role/status are always correct even if the record
    // already exists (e.g. a previous email/password account was repaired via identity-request-access).
    await sql`
      INSERT INTO users (id, email, role, status, allowed_factions, created_at)
      VALUES (${user.id}, ${user.email}, ${role}, ${status}, '[]', NOW())
      ON CONFLICT (id) DO UPDATE
      SET
        email = EXCLUDED.email,
        role = CASE
          WHEN EXCLUDED.email = ${SUPER_ADMIN_EMAIL} THEN 'admin'
          ELSE users.role
        END,
        status = CASE
          WHEN EXCLUDED.email = ${SUPER_ADMIN_EMAIL} THEN 'approved'
          ELSE users.status
        END
    `;
  } catch (err) {
    console.error('identity-signup: Failed to create user profile:', err);
  }

  // Auto-confirm the user's email so they don't need to click a confirmation link
  if (user.confirmation_token) {
    try {
      const siteUrl = process.env.URL || 'https://narp-db.netlify.app';
      const res = await fetch(`${siteUrl}/.netlify/identity/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'signup', token: user.confirmation_token }),
      });
      if (!res.ok) {
        console.error('identity-signup: Auto-confirm failed:', res.status);
      }
    } catch (err) {
      console.error('identity-signup: Auto-confirm error:', err);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({}),
  };
};

export { handler };

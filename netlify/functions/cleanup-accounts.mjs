import { neon } from '@neondatabase/serverless';

const SUPER_ADMIN_EMAIL = 'grisales4000@gmail.com';

/**
 * One-time cleanup function: deletes ALL accounts from both Netlify Identity
 * and the PostgreSQL users table, then ensures the super admin can re-register
 * fresh.  Requires the CLEANUP_SECRET env var to match the request body secret.
 *
 * POST /api/cleanup-accounts  { "secret": "<CLEANUP_SECRET>" }
 */
const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const identity = context.clientContext?.identity;
  if (!identity?.url || !identity?.token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Identity service not available.' }),
    };
  }

  const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) };
  }

  // Simple shared-secret guard so the endpoint can't be called by anyone
  const cleanupSecret = process.env.CLEANUP_SECRET;
  if (!cleanupSecret) {
    return { statusCode: 500, body: JSON.stringify({ error: 'CLEANUP_SECRET env var not set.' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    if (body.secret !== cleanupSecret) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Invalid secret.' }) };
    }

    const token = await identity.token;

    // ---- 1. Delete ALL Identity users ----
    const deleted = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const res = await fetch(`${identity.url}/admin/users?page=${page}&per_page=${perPage}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) break;
      const data = await res.json();
      const users = data.users || [];
      if (users.length === 0) break;

      for (const u of users) {
        try {
          await fetch(`${identity.url}/admin/users/${u.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          deleted.push(u.email);
        } catch (err) {
          console.error(`Failed to delete Identity user ${u.email}:`, err);
        }
      }

      if (users.length < perPage) break;
      // Don't increment page — we just deleted the current page's users
    }

    // ---- 2. Clear the PostgreSQL users table ----
    const sql = neon(databaseUrl);
    await sql`DELETE FROM users`;
    // Also clean up pending faction access
    await sql`DELETE FROM pending_faction_access`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Deleted ${deleted.length} Identity account(s) and cleared the users table. The super admin (${SUPER_ADMIN_EMAIL}) can now re-register via the login page.`,
        deletedEmails: deleted,
      }),
    };
  } catch (err) {
    console.error('cleanup-accounts error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Internal error' }) };
  }
};

export { handler };

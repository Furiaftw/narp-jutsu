import { neon } from '@neondatabase/serverless';

const SUPER_ADMIN_EMAIL = 'grisales4000@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

/**
 * Makes an authenticated admin request to the GoTrue (Netlify Identity) API.
 * @param {string} identityUrl - The GoTrue API base URL.
 * @param {string|Promise<string>} identityToken - The operator/service JWT token (may be a Promise in v1 functions).
 */
async function gotrueAdminFetch(identityUrl, identityToken, path, options = {}) {
  const token = await identityToken;
  const res = await fetch(`${identityUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.msg || body.message || `GoTrue admin request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function findIdentityUserByEmail(identityUrl, identityToken, email) {
  let page = 1;
  const perPage = 100;

  while (true) {
    const data = await gotrueAdminFetch(identityUrl, identityToken, `/admin/users?page=${page}&per_page=${perPage}`);
    const users = data.users || [];
    const match = users.find((u) => normalizeEmail(u.email) === email);
    if (match) return match;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Resolve GoTrue admin URL and token.
  // Primary source: clientContext.identity (populated by Netlify for v1 functions when Identity is enabled).
  // Fallback: environment variables, which must be set manually in the Netlify dashboard when the
  // clientContext is not propagated (e.g. through certain proxy/redirect configurations).
  const ctxIdentity = context.clientContext?.identity;
  const identityUrl =
    ctxIdentity?.url ||
    (process.env.URL && `${process.env.URL}/.netlify/identity`) ||
    (process.env.DEPLOY_URL && `${process.env.DEPLOY_URL}/.netlify/identity`);
  const identityToken = ctxIdentity?.token || process.env.NETLIFY_IDENTITY_ADMIN_TOKEN;

  if (!identityUrl || !identityToken) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Identity service not available. Ensure Netlify Identity is enabled.' }),
    };
  }

  const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || '');

    if (!EMAIL_RE.test(email)) {
      return { statusCode: 422, body: JSON.stringify({ error: 'Invalid email address.' }) };
    }
    if (password.length < 6) {
      return { statusCode: 422, body: JSON.stringify({ error: 'Password must be at least 6 characters.' }) };
    }

    const isSuperAdmin = email === SUPER_ADMIN_EMAIL;

    // Try to find an existing Identity user by email
    let identityUser = await findIdentityUserByEmail(identityUrl, identityToken, email);

    if (identityUser) {
      // User exists — update their password and force-confirm their email
      identityUser = await gotrueAdminFetch(identityUrl, identityToken, `/admin/users/${identityUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ password, confirm: true }),
      });
    } else {
      // Create a new Identity user (works even when public signups are disabled)
      identityUser = await gotrueAdminFetch(identityUrl, identityToken, '/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, confirm: true }),
      });
    }

    const role = isSuperAdmin ? 'admin' : 'user';
    const status = isSuperAdmin ? 'approved' : 'pending';
    const sql = neon(databaseUrl);

    await sql`
      INSERT INTO users (id, email, role, status, allowed_factions, created_at)
      VALUES (${identityUser.id}, ${email}, ${role}, ${status}, '[]', NOW())
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

    const message = isSuperAdmin
      ? 'Super admin account repaired. Log in now.'
      : 'Access request submitted. An admin must approve your account before login.';

    return { statusCode: 200, body: JSON.stringify({ status, message }) };
  } catch (err) {
    console.error('identity-request-access error:', err);
    const statusCode = err.status || 500;
    return {
      statusCode,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    };
  }
};

export { handler };

/**
 * WMSU Admin only. Two modes (JSON body):
 *
 * 1) `{ "userId": "<uuid>" }` — Deletes that Auth user. With `profiles.id REFERENCES auth.users(id) ON DELETE CASCADE`,
 *    the matching profile row is removed automatically. Procurement requests stay (see migration
 *    `20260423160000_requests_preserve_on_requester_delete.sql`).
 *
 * 2) `{ "email": "a@b.com" }` — If an Auth user exists for that email and has **no** `public.profiles` row (orphan),
 *    deletes that Auth user. Used after profile-only removal or before re-creating an account with the same email.
 *
 * Deploy (from machine with Supabase CLI, project linked):
 *   cd frontend
 *   npx supabase@latest functions deploy delete-user
 *
 * ES256 JWT projects: `supabase/config.toml` sets `verify_jwt = false` for this function so the
 * gateway does not reject the session token; the handler still verifies via `auth.getUser(jwt)` + Admin role.
 *
 * On hosted Supabase, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected
 * automatically — do not run `secrets set` with a `SUPABASE_*` name (the CLI will skip it).
 * Local: use `supabase/functions/.env` or `supabase functions serve --env-file` per Supabase docs.
 *
 * Invoke URL: {SUPABASE_URL}/functions/v1/delete-user
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/** Echo browser preflight headers so OPTIONS always matches what the client requested. */
function corsHeaders(req: Request): Record<string, string> {
  const requested = req.headers.get('Access-Control-Request-Headers');
  const allowHeaders =
    requested ||
    'authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version';
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const jwt = authHeader.slice('Bearer '.length).trim();
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claimsData, error: claimsErr } = await admin.auth.getUser(jwt);
  if (claimsErr || !claimsData?.user) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const callerId = claimsData.user.id;

  const { data: callerProfile, error: callerProfileErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle();

  if (callerProfileErr || callerProfile?.role !== 'Admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: { userId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const userId = (body.userId || '').trim();
  const emailRaw = (body.email || '').trim().toLowerCase();

  if (!userId && !emailRaw) {
    return new Response(JSON.stringify({ error: 'Provide userId or email' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  if (userId && emailRaw) {
    return new Response(JSON.stringify({ error: 'Provide only one of userId or email' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (emailRaw) {
    let foundId: string | null = null;
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data: pageData, error: listErr } = await admin.auth.admin.listUsers({ page, perPage });
      if (listErr) {
        return new Response(JSON.stringify({ error: listErr.message }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const hit = pageData.users.find((u) => (u.email || '').toLowerCase() === emailRaw);
      if (hit) {
        foundId = hit.id;
        break;
      }
      if (pageData.users.length < perPage) break;
      page += 1;
      if (page > 50) break;
    }
    if (!foundId) {
      return new Response(JSON.stringify({ ok: true, purged: false }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (foundId === callerId) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const { data: prof, error: profErr } = await admin.from('profiles').select('id').eq('id', foundId).maybeSingle();
    if (profErr) {
      return new Response(JSON.stringify({ error: profErr.message }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (prof) {
      return new Response(
        JSON.stringify({
          error:
            'That email still has an active profile. Remove the user from the Users page (delete by user id) instead.',
        }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }
    const { error: delErr } = await admin.auth.admin.deleteUser(foundId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, purged: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (userId === callerId) {
    return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});

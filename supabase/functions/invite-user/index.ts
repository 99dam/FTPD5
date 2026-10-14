// FTPD5 – invite-user Edge Function (Deno)
//
// The ONLY place that uses the service role key. It runs on Supabase's
// servers; the key is provided by the runtime (SUPABASE_SERVICE_ROLE_KEY)
// and never reaches the browser or the Git repository.
//
// Flow:
//   1. Verify the caller's JWT and that they are an ACTIVE ADMIN.
//   2. Validate input.
//   3. Invite the user via the Auth Admin API (no public sign-up).
//   4. Set role / activate the profile through admin_update_user() using the
//      CALLER's JWT, so the audit log records the real admin as the actor.
//
// Deploy:  supabase functions deploy invite-user
// Secrets: supabase secrets set ALLOWED_ORIGINS=https://USERNAME.github.io \
//                               INVITE_REDIRECT_URL=https://USERNAME.github.io/FTPD5/

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const INVITE_REDIRECT_URL = Deno.env.get('INVITE_REDIRECT_URL') ?? undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405, origin);
  }
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: 'FORBIDDEN' }, 403, origin);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'UNAUTHORIZED' }, 401, origin);
  }

  // Client acting AS THE CALLER (RLS applies).
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: 'UNAUTHORIZED' }, 401, origin);
  }

  const { data: me, error: meError } = await userClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', userData.user.id)
    .single();
  if (meError || !me || me.role !== 'admin' || !me.is_active) {
    return json({ error: 'FORBIDDEN' }, 403, origin);
  }

  let body: { email?: unknown; full_name?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_INPUT' }, 400, origin);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const role = body.role === 'admin' ? 'admin' : body.role === 'officer' ? 'officer' : null;

  if (!EMAIL_RE.test(email) || email.length > 320 || fullName.length < 1 || fullName.length > 120 || !role) {
    return json({ error: 'INVALID_INPUT' }, 400, origin);
  }

  // Service-role client: server-side only.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: INVITE_REDIRECT_URL,
  });
  if (inviteError || !invited.user) {
    // Do not leak whether the address already exists beyond a generic code.
    console.error('invite failed', inviteError?.status);
    return json({ error: 'INVITE_FAILED' }, 400, origin);
  }

  const { error: rpcError } = await userClient.rpc('admin_update_user', {
    p_user_id: invited.user.id,
    p_full_name: fullName,
    p_role: role,
    p_is_active: true,
  });
  if (rpcError) {
    console.error('profile update failed', rpcError.code);
    return json({ error: 'PROFILE_UPDATE_FAILED', user_id: invited.user.id }, 500, origin);
  }

  return json({ user_id: invited.user.id }, 200, origin);
});

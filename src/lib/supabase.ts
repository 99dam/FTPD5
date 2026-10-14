import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Read the auth redirect type (invite / recovery) BEFORE the client consumes
// and clears the URL fragment, so the app can route to "set password".
const hashParams = new URLSearchParams(window.location.hash.slice(1));
export const initialAuthRedirectType = hashParams.get('type');

export const supabase = createClient(
  env.isConfigured ? env.supabaseUrl : 'https://not-configured.invalid',
  env.isConfigured ? env.supabaseKey : 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
    },
  },
);

// One shared Supabase client for the whole site (catalogue + login).
import { CONFIG } from './config.js';

const SUPABASE_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

let clientPromise = null;

export function supabaseConfigured() {
  return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
}

/** localStorage key supabase-js uses for the login session. */
export function sessionStorageKey() {
  if (!supabaseConfigured()) return null;
  return `sb-${new URL(CONFIG.supabaseUrl).hostname.split('.')[0]}-auth-token`;
}

export function getClient() {
  if (!clientPromise) {
    clientPromise = import(SUPABASE_ESM).then(({ createClient }) =>
      createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // picks up Google / email-link logins
          // Implicit flow so a confirmation or reset link still works when it
          // is opened on a different device from the one that requested it.
          flowType: 'implicit',
        },
      }),
    );
  }
  return clientPromise;
}

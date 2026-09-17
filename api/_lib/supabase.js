import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load .env and .env.local if available in local development environment
if (typeof process !== 'undefined' && process.cwd) {
  dotenv.config();
  try {
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      dotenv.config({ path: envLocalPath, override: true });
    }
  } catch (_) {
    // Ignore file system errors in serverless environments
  }
}

export const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Server-side secret key: check SUPABASE_SECRET_KEY first, then SUPABASE_SERVICE_ROLE_KEY, then fallback to anon key
export const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || 
                                 process.env.SUPABASE_SERVICE_ROLE_KEY || 
                                 process.env.SUPABASE_ANON_KEY ||
                                 process.env.VITE_SUPABASE_ANON_KEY ||
                                 '';

const hasValidSecretKey = Boolean(
  supabaseSecretKey &&
  !supabaseSecretKey.includes('your-supabase') &&
  !supabaseSecretKey.includes('placeholder')
);

const hasValidAnonKey = Boolean(
  supabaseAnonKey &&
  !supabaseAnonKey.includes('your-supabase-anon-key') &&
  !supabaseAnonKey.includes('placeholder')
);

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  !supabaseUrl.includes('your-project-id') && 
  !supabaseUrl.includes('placeholder') &&
  (hasValidSecretKey || hasValidAnonKey)
);

let cachedSupabase = null;
let cachedSupabaseAdmin = null;

export function getSupabaseClient() {
  const keyToUse = supabaseAnonKey || supabaseSecretKey;
  if (!supabaseUrl || !keyToUse || supabaseUrl.includes('your-project-id')) return null;
  if (!cachedSupabase) {
    try {
      cachedSupabase = createClient(supabaseUrl, keyToUse, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } catch (err) {
      console.error('Error initializing public Supabase client:', err);
      return null;
    }
  }
  return cachedSupabase;
}

export function getSupabaseAdmin() {
  const keyToUse = supabaseSecretKey || supabaseAnonKey;
  if (!supabaseUrl || !keyToUse || supabaseUrl.includes('your-project-id')) return null;
  if (!cachedSupabaseAdmin) {
    try {
      cachedSupabaseAdmin = createClient(supabaseUrl, keyToUse, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } catch (err) {
      console.error('Error initializing admin Supabase client:', err);
      return null;
    }
  }
  return cachedSupabaseAdmin;
}

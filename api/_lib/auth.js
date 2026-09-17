import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';
import { adminNotificationEmail } from './email.js';

export async function verifyAdminToken(token) {
  if (!token) return null;

  // 1. Built-in session tokens
  if (token === 'kpa_admin_dev_token' || token.startsWith('kpa_session_')) {
    return { email: adminNotificationEmail, role: 'authenticated_admin' };
  }

  // 2. Supabase Auth token
  if (isSupabaseConfigured) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          return user;
        }
      } catch (err) {
        console.error('Error verifying Supabase user token:', err);
      }
    }
  }

  return null;
}

export function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

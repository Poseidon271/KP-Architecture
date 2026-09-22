import crypto from 'crypto';
import { getSupabaseClient, isSupabaseConfigured, supabaseSecretKey } from './supabase.js';
import { adminNotificationEmail } from './email.js';

// Secret for HMAC signing of server session tokens
const AUTH_SECRET = process.env.AUTH_SECRET || supabaseSecretKey || 'kpa-admin-internal-session-secret';

export function generateAdminToken(email) {
  const payload = {
    email: email || adminNotificationEmail,
    role: 'authenticated_admin',
    issuedAt: Date.now()
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');
  return `kpa_adm.${payloadB64}.${signature}`;
}

export async function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;

  // 1. Check signed admin session token (kpa_adm.<payload>.<sig>)
  if (token.startsWith('kpa_adm.')) {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [, payloadB64, sig] = parts;
      try {
        const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');
        if (sig.length === expectedSig.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          // Token valid for 7 days
          if (Date.now() - payload.issuedAt < 7 * 24 * 60 * 60 * 1000) {
            return { email: payload.email, role: 'authenticated_admin' };
          }
        }
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  // 2. Supabase Auth token verification
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

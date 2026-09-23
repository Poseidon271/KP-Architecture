import crypto from 'crypto';
import { adminNotificationEmail } from './email.js';

// Secret for HMAC signing of server session tokens
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'kpa-admin-internal-session-secret-key-2026';

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

  // 1. Signed admin session token (kpa_adm.<payload>.<sig>)
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

  // 2. Fallback dev tokens
  if (token === 'kpa_admin_dev_token' || token.startsWith('kpa_session_')) {
    return { email: adminNotificationEmail, role: 'authenticated_admin' };
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

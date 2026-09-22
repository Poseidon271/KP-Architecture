import { getSupabaseClient, isSupabaseConfigured } from '../../_lib/supabase.js';
import { setCorsHeaders, parseRequestBody } from '../../_lib/helpers.js';
import { generateAdminToken } from '../../_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  try {
    const body = await parseRequestBody(req);
    const { email, password } = body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    // 1. Try Supabase Auth first
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (!error && data?.session) {
            return res.json({
              success: true,
              session: data.session,
              user: data.user
            });
          }
        } catch (err) {
          console.warn('Supabase auth sign-in error:', err);
        }
      }
    }

    // 2. Server-side environment variable authentication (if ADMIN_PASSWORD is set in Vercel env)
    const envAdminPassword = process.env.ADMIN_PASSWORD;
    const envAdminEmail = process.env.ADMIN_EMAIL;

    if (envAdminPassword && password === envAdminPassword) {
      if (!envAdminEmail || email.toLowerCase() === envAdminEmail.toLowerCase()) {
        const token = generateAdminToken(email);
        const session = {
          access_token: token,
          user: { email: email, role: 'authenticated_admin' }
        };
        return res.json({
          success: true,
          session,
          user: session.user
        });
      }
    }

    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Server error during login authentication.' });
  }
}

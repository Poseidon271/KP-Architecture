import { getSupabaseClient, isSupabaseConfigured } from '../../_lib/supabase.js';
import { setCorsHeaders, parseRequestBody } from '../../_lib/helpers.js';

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

    // 1. Try Supabase Auth first if configured
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
          console.warn('Supabase auth attempt failed, checking fallback:', err);
        }
      }
    }

    // 2. Built-in admin credentials fallback
    if ((email === 'admin@kparchitects.com' || email === 'architects.kpa@gmail.com') && password === 'kpa2012admin') {
      const session = {
        access_token: 'kpa_session_' + Date.now(),
        user: { email: email, role: 'authenticated_admin' }
      };
      return res.json({
        success: true,
        session,
        user: session.user
      });
    }

    return res.status(400).json({ success: false, error: 'Invalid email or password.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Server error during login authentication.' });
  }
}

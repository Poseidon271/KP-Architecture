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

    const envAdminPassword = process.env.ADMIN_PASSWORD || 'kpadmin2026!';
    const envAdminEmail = process.env.ADMIN_EMAIL || 'architects.kpa@gmail.com';

    if (password === envAdminPassword) {
      const token = generateAdminToken(email);
      const session = {
        access_token: token,
        user: { email: email || envAdminEmail, role: 'authenticated_admin' }
      };
      return res.json({
        success: true,
        session,
        user: session.user
      });
    }

    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Server error during login authentication.' });
  }
}

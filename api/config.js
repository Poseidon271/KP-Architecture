import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from './_lib/supabase.js';
import { setCorsHeaders } from './_lib/helpers.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed.`
    });
  }

  return res.json({
    success: true,
    supabaseConfigured: isSupabaseConfigured,
    supabaseUrl: isSupabaseConfigured ? supabaseUrl : '',
    supabaseAnonKey: isSupabaseConfigured ? supabaseAnonKey : ''
  });
}

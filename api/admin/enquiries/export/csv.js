import { getSupabaseAdmin, isSupabaseConfigured } from '../../../_lib/supabase.js';
import { setCorsHeaders, getLocalEnquiries } from '../../../_lib/helpers.js';
import { extractBearerToken, verifyAdminToken } from '../../../_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  // Authentication check
  const token = extractBearerToken(req);
  const user = await verifyAdminToken(token);
  if (!user) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(401).json({ success: false, error: 'Unauthorized. Valid admin session required.' });
  }

  try {
    let records = [];
    const supabaseAdmin = getSupabaseAdmin();

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('enquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      records = data || [];
    } else {
      const isProduction = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
      if (isProduction) {
        console.error('Supabase is not configured in production environment.');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(500).json({ success: false, error: 'Database service is currently unavailable.' });
      }

      records = getLocalEnquiries();
    }

    const headers = [
      'ID',
      'Created At',
      'Name',
      'Email',
      'Phone',
      'Organization',
      'Project Type',
      'Location',
      'Disciplines',
      'Scale',
      'Message',
      'Status',
      'Priority',
      'Admin Notes',
      'Last Contacted'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map(r => [
      escapeCsv(r.id),
      escapeCsv(r.created_at),
      escapeCsv(r.name),
      escapeCsv(r.email),
      escapeCsv(r.phone),
      escapeCsv(r.organization || ''),
      escapeCsv(r.project_type),
      escapeCsv(r.location),
      escapeCsv(Array.isArray(r.disciplines) ? r.disciplines.join('; ') : r.disciplines || ''),
      escapeCsv(r.scale || ''),
      escapeCsv(r.message || ''),
      escapeCsv(r.status),
      escapeCsv(r.priority),
      escapeCsv(r.admin_notes || ''),
      escapeCsv(r.last_contacted_at || '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kpa_enquiries_${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(500).json({ success: false, error: error.message || 'Error exporting CSV' });
  }
}

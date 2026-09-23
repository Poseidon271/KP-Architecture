import { setCorsHeaders, getLocalEnquiries } from '../../_lib/helpers.js';
import { extractBearerToken, verifyAdminToken } from '../../_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  // Authentication check
  const token = extractBearerToken(req);
  const user = await verifyAdminToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Valid admin session required.' });
  }

  try {
    const { q, status, priority, type, sort = 'created_at', order = 'desc', page = 1, limit = 50 } = req.query || {};

    let all = getLocalEnquiries();

    if (status && status !== 'all') {
      all = all.filter(r => r.status === status);
    }
    if (priority && priority !== 'all') {
      all = all.filter(r => r.priority === priority);
    }
    if (type && type !== 'all') {
      all = all.filter(r => (r.project_type || '').toLowerCase().includes(type.toLowerCase()));
    }
    if (q) {
      const queryStr = q.toLowerCase();
      all = all.filter(r =>
        (r.name || '').toLowerCase().includes(queryStr) ||
        (r.email || '').toLowerCase().includes(queryStr) ||
        (r.phone || '').toLowerCase().includes(queryStr) ||
        (r.location || '').toLowerCase().includes(queryStr) ||
        (r.message || '').toLowerCase().includes(queryStr)
      );
    }

    all.sort((a, b) => {
      const dA = new Date(a[sort] || a.created_at).getTime();
      const dB = new Date(b[sort] || b.created_at).getTime();
      return order === 'asc' ? dA - dB : dB - dA;
    });

    const fullList = getLocalEnquiries();
    const counts = {
      total: fullList.length,
      new: fullList.filter(r => r.status === 'new').length,
      contacted: fullList.filter(r => r.status === 'contacted').length,
      in_progress: fullList.filter(r => r.status === 'in_progress').length,
      site_visit: fullList.filter(r => r.status === 'site_visit').length,
      proposal: fullList.filter(r => r.status === 'proposal').length,
      converted: fullList.filter(r => r.status === 'converted').length,
      closed: fullList.filter(r => r.status === 'closed').length,
      archived: fullList.filter(r => r.status === 'archived').length
    };

    const from = (parseInt(page) - 1) * parseInt(limit);
    const paged = all.slice(from, from + parseInt(limit));

    return res.json({
      success: true,
      data: paged,
      total: all.length,
      counts,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching admin enquiries:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error fetching enquiries' });
  }
}

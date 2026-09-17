import loginHandler from './auth/login.js';
import enquiriesListHandler from './enquiries/index.js';
import enquiryItemHandler from './enquiries/[id].js';
import exportCsvHandler from './enquiries/export/csv.js';
import { setCorsHeaders } from '../_lib/helpers.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { slug } = req.query || {};
  const segments = Array.isArray(slug) ? slug : (slug ? [slug] : []);
  const subpath = segments.join('/');

  // 1. /api/admin/auth/login
  if (subpath === 'auth/login') {
    return loginHandler(req, res);
  }

  // 2. /api/admin/enquiries/export/csv
  if (subpath === 'enquiries/export/csv') {
    return exportCsvHandler(req, res);
  }

  // 3. /api/admin/enquiries
  if (subpath === 'enquiries' || subpath === '') {
    return enquiriesListHandler(req, res);
  }

  // 4. /api/admin/enquiries/:id
  if (segments[0] === 'enquiries' && segments.length === 2) {
    req.query.id = segments[1];
    return enquiryItemHandler(req, res);
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(404).json({
    success: false,
    error: `Admin API endpoint /api/admin/${subpath} not found.`
  });
}

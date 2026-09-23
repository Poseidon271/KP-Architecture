import { setCorsHeaders, sanitize, parseRequestBody, getLocalEnquiries, saveLocalEnquiries } from '../../_lib/helpers.js';
import { extractBearerToken, verifyAdminToken } from '../../_lib/auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authentication check
  const token = extractBearerToken(req);
  const user = await verifyAdminToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Valid admin session required.' });
  }

  const { id } = req.query || {};
  if (!id) {
    return res.status(400).json({ success: false, error: 'Enquiry ID is required.' });
  }

  // PATCH: Update enquiry
  if (req.method === 'PATCH') {
    try {
      const body = await parseRequestBody(req);
      const { status, priority, admin_notes, last_contacted_at } = body || {};

      const updates = {
        updated_at: new Date().toISOString()
      };
      if (status !== undefined) updates.status = status;
      if (priority !== undefined) updates.priority = priority;
      if (admin_notes !== undefined) updates.admin_notes = sanitize(admin_notes);
      if (last_contacted_at !== undefined) updates.last_contacted_at = last_contacted_at;

      const localDb = getLocalEnquiries();
      const idx = localDb.findIndex(r => r.id === id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Enquiry not found.' });
      }
      localDb[idx] = { ...localDb[idx], ...updates };
      saveLocalEnquiries(localDb);
      return res.json({ success: true, data: localDb[idx] });
    } catch (error) {
      console.error('Error updating enquiry:', error);
      return res.status(500).json({ success: false, error: error.message || 'Error updating enquiry' });
    }
  }

  // DELETE: Delete enquiry
  if (req.method === 'DELETE') {
    try {
      let localDb = getLocalEnquiries();
      const exists = localDb.some(r => r.id === id);
      if (!exists) {
        return res.status(404).json({ success: false, error: 'Enquiry not found.' });
      }
      localDb = localDb.filter(r => r.id !== id);
      saveLocalEnquiries(localDb);
      return res.json({ success: true, message: 'Enquiry deleted successfully.' });
    } catch (error) {
      console.error('Error deleting enquiry:', error);
      return res.status(500).json({ success: false, error: error.message || 'Error deleting enquiry' });
    }
  }

  return res.status(405).json({ success: false, error: `Method ${req.method} not allowed.` });
}

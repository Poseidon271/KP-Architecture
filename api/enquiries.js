import {
  sanitize,
  setCorsHeaders,
  checkRateLimit,
  getClientIp,
  parseRequestBody,
  getLocalEnquiries,
  saveLocalEnquiries
} from './_lib/helpers.js';
import { sendAdminNotification } from './_lib/email.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  // 1. CORS headers & preflight check
  setCorsHeaders(req, res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Please use POST.`
    });
  }

  // 2. IP Rate Limiting
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait a moment before submitting again.'
    });
  }

  try {
    const body = await parseRequestBody(req);
    const {
      name,
      email,
      phone,
      organization,
      project_type,
      disciplines,
      location,
      scale,
      message,
      _hp_company // Honeypot anti-spam field
    } = body || {};

    // 3. Honeypot anti-spam check
    if (_hp_company && typeof _hp_company === 'string' && _hp_company.trim().length > 0) {
      console.warn('Spam submission detected via honeypot field.');
      return res.status(200).json({
        success: true,
        message: 'Consultation request submitted successfully.',
        id: 'hp-' + Date.now(),
        consultationRef: 'KPA-SPAM'
      });
    }

    // 4. Server-side sanitization & validation
    const cleanName = sanitize(name);
    const cleanEmail = sanitize(email).toLowerCase();
    const cleanPhone = sanitize(phone);
    const cleanOrg = sanitize(organization);
    const cleanType = sanitize(project_type);
    const cleanLoc = sanitize(location);
    const cleanScale = sanitize(scale);
    const cleanMsg = sanitize(message);
    const cleanDisciplines = Array.isArray(disciplines)
      ? disciplines.map(sanitize).filter(Boolean)
      : (disciplines ? [sanitize(disciplines)] : []);

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({ success: false, error: 'Full name is required (minimum 2 characters).' });
    }

    if (!cleanType) {
      return res.status(400).json({ success: false, error: 'Project typology is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    if (!cleanPhone || cleanPhone.length < 7) {
      return res.status(400).json({ success: false, error: 'A valid contact phone number is required (minimum 7 digits).' });
    }

    if (!cleanLoc || cleanLoc.length < 2) {
      return res.status(400).json({ success: false, error: 'Project location is required.' });
    }

    if (!cleanDisciplines || cleanDisciplines.length === 0) {
      return res.status(400).json({ success: false, error: 'Please select at least one architectural or engineering discipline.' });
    }

    // 5. Build record with standard fields
    const nowIso = new Date().toISOString();
    const uuid = crypto.randomUUID ? crypto.randomUUID() : ('kpa-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
    const refCode = `KPA-${uuid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

    const newRecord = {
      id: uuid,
      created_at: nowIso,
      updated_at: nowIso,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      organization: cleanOrg || null,
      project_type: cleanType,
      disciplines: cleanDisciplines,
      location: cleanLoc,
      scale: cleanScale || null,
      message: cleanMsg || null,
      status: 'new',
      priority: 'normal',
      admin_notes: null,
      source: 'website',
      last_contacted_at: null,
      consultation_ref: refCode
    };

    // 6. Save record
    const allEnquiries = getLocalEnquiries();
    allEnquiries.unshift(newRecord);
    saveLocalEnquiries(allEnquiries);

    // 7. Dispatch admin notification email (asynchronous, does not block response)
    sendAdminNotification(newRecord).catch(err => {
      console.error('Admin notification error:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Consultation request submitted successfully.',
      id: newRecord.id,
      enquiryId: newRecord.id,
      consultationRef: refCode
    });
  } catch (error) {
    console.error('Server error during enquiry submission:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred. Please try again.'
    });
  }
}

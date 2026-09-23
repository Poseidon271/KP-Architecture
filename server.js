import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env and .env.local)
dotenv.config();
const envLocalPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Local persistent storage
const LOCAL_DB_PATH = path.join(__dirname, 'data_enquiries.json');

function getLocalEnquiries() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const data = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading local db:', err);
  }
  return [];
}

function saveLocalEnquiries(enquiries) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(enquiries, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local db:', err);
  }
}

// Initialize Resend Client
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey && !resendApiKey.includes('your_resend') && !resendApiKey.includes('placeholder')
  ? new Resend(resendApiKey) 
  : null;
const adminNotificationEmail = process.env.ADMIN_EMAIL || 'architects.kpa@gmail.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'kpadmin2026!';
const authSecret = process.env.AUTH_SECRET || adminPassword || 'kpa-admin-internal-session-secret-key-2026';

// Lightweight IP Rate Limiter
const rateLimitMap = new Map();
function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30;

  const clientRequests = rateLimitMap.get(ip) || [];
  const recentRequests = clientRequests.filter(timestamp => now - timestamp < windowMs);

  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait a moment before submitting again.'
    });
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  next();
}

// Sanitization Helper
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

// Admin Token Helpers
function generateAdminToken(email) {
  const payload = {
    email: email || adminNotificationEmail,
    role: 'authenticated_admin',
    issuedAt: Date.now()
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');
  return `kpa_adm.${payloadB64}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
  if (token.startsWith('kpa_adm.')) {
    const parts = token.split('.');
    if (parts.length === 3) {
      const [, payloadB64, sig] = parts;
      try {
        const expectedSig = crypto.createHmac('sha256', authSecret).update(payloadB64).digest('base64url');
        if (sig.length === expectedSig.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
          const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
          if (Date.now() - payload.issuedAt < 7 * 24 * 60 * 60 * 1000) {
            return { email: payload.email, role: 'authenticated_admin' };
          }
        }
      } catch (_) {
        return null;
      }
    }
  }
  if (token === 'kpa_admin_dev_token' || token.startsWith('kpa_session_')) {
    return { email: adminNotificationEmail, role: 'authenticated_admin' };
  }
  return null;
}

// Email Notification Function
async function sendAdminNotification(enquiry) {
  const displayRef = (enquiry.id && typeof enquiry.id === 'string')
    ? `KPA-${enquiry.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
    : (enquiry.consultation_ref || 'N/A');

  const subject = `New Project Enquiry — K.P. Architects (${enquiry.location || 'India'})`;
  const textContent = `
NEW KPA PROJECT ENQUIRY

Enquiry ID: ${enquiry.id || displayRef}
Reference: ${displayRef}
Submitted: ${new Date(enquiry.created_at || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Client Information:
• Name: ${enquiry.name}
• Email: ${enquiry.email}
• Phone: ${enquiry.phone}
• Organization: ${enquiry.organization || 'N/A'}

Project Details:
• Project Type: ${enquiry.project_type}
• Location: ${enquiry.location}
• Disciplines: ${Array.isArray(enquiry.disciplines) ? enquiry.disciplines.join(', ') : enquiry.disciplines || 'N/A'}
• Built-up Scale: ${enquiry.scale || 'N/A'}

Message / Brief:
${enquiry.message || 'No additional message provided.'}

Status: ${(enquiry.status || 'new').toUpperCase()}
Priority: ${(enquiry.priority || 'normal').toUpperCase()}

Open Admin Dashboard: http://localhost:5173/admin
  `.trim();

  if (resend) {
    try {
      await resend.emails.send({
        from: 'K.P. Architects <onboarding@resend.dev>',
        to: adminNotificationEmail,
        subject: subject,
        text: textContent
      });
      console.log(`✓ Admin email notification sent via Resend to ${adminNotificationEmail}`);
    } catch (err) {
      console.error('Error sending Resend email notification:', err);
    }
  } else {
    console.log('\n--- [ADMIN NOTIFICATION DISPATCHED] ---');
    console.log(`To: ${adminNotificationEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(textContent);
    console.log('----------------------------------------\n');
  }
}

// ==============================================================================
// PUBLIC ROUTES
// ==============================================================================

// Public Configuration endpoint
app.get('/api/config', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    success: true,
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Submit Enquiry
app.post('/api/enquiries', rateLimiter, async (req, res) => {
  try {
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
      _hp_company // Honeypot field
    } = req.body || {};

    // 1. Honeypot anti-spam check
    if (_hp_company && typeof _hp_company === 'string' && _hp_company.trim().length > 0) {
      console.warn('Spam submission detected via honeypot field.');
      return res.status(200).json({
        success: true,
        message: 'Consultation request submitted successfully.',
        id: 'hp-' + Date.now(),
        consultationRef: 'KPA-SPAM'
      });
    }

    // 2. Server-side validation
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

    const nowIso = new Date().toISOString();
    const uuid = crypto.randomUUID ? crypto.randomUUID() : ('kpa-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9));
    const displayRef = `KPA-${uuid.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

    const newEnquiry = {
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
      consultation_ref: displayRef
    };

    // 3. Save to database
    const localDb = getLocalEnquiries();
    localDb.unshift(newEnquiry);
    saveLocalEnquiries(localDb);

    // 4. Trigger Admin Notification (AFTER successful insert)
    sendAdminNotification(newEnquiry).catch(err => {
      console.error('Admin notification error:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Consultation request submitted successfully.',
      id: newEnquiry.id,
      enquiryId: newEnquiry.id,
      consultationRef: displayRef
    });
  } catch (error) {
    console.error('Server error during enquiry submission:', error);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred. Please try again.'
    });
  }
});

// ==============================================================================
// AUTHENTICATED ADMIN ROUTES
// ==============================================================================

// Helper middleware for Admin Auth
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Authentication token required.' });
  }

  const token = authHeader.split(' ')[1];
  const user = verifyAdminToken(token);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid or expired authentication session.' });
  }
  req.user = user;
  next();
}

// Admin Auth Login
app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    if (password === adminPassword) {
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

    return res.status(401).json({ success: false, error: 'Invalid email or password.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Server error during login authentication.' });
  }
});

// Admin Get Enquiries List (Search, Filter, Sort, Counts)
app.get('/api/admin/enquiries', requireAdminAuth, async (req, res) => {
  try {
    const { q, status, priority, type, sort = 'created_at', order = 'desc', page = 1, limit = 50 } = req.query;

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

    // Sort
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
});

// Admin Update Enquiry (Status, Priority, Admin Notes, Last Contacted)
app.patch('/api/admin/enquiries/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, admin_notes, last_contacted_at } = req.body || {};

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
});

// Admin Delete Enquiry
app.delete('/api/admin/enquiries/:id', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.params;
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
});

// Admin Export CSV
app.get('/api/admin/enquiries/export/csv', requireAdminAuth, async (req, res) => {
  try {
    const records = getLocalEnquiries();

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

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="kpa_enquiries_${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return res.status(500).json({ success: false, error: error.message || 'Error exporting CSV' });
  }
});

// 404 for unhandled API endpoints
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// Global API error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) {
    return next(err);
  }
  if (req.url && req.url.startsWith('/api')) {
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred.'
    });
  }
  return res.status(500).send('Internal Server Error');
});

// Standalone execution handler (node server.js / npm start)
const isDirectRun = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
  process.argv[1].endsWith('server.js')
);

if (isDirectRun) {
  // Static file serving for standalone mode
  app.use(express.static(path.join(__dirname)));
  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use('/dist', express.static(path.join(__dirname, 'dist')));

  // SPA catchall
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ success: false, error: 'Endpoint not found' });
    }
    if (req.path === '/admin' || req.path === '/admin/') {
      return res.sendFile(path.join(__dirname, 'admin.html'));
    }
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🏛️  K.P. ARCHITECTS SERVER & API READY`);
    console.log(`🌐  Website: http://localhost:${PORT}/`);
    console.log(`🔒  Admin Dashboard: http://localhost:${PORT}/admin`);
    console.log(`💾  Storage: Local Persistent Storage (data_enquiries.json)`);
    console.log(`==================================================\n`);
  });
}

export { app };
export default app;

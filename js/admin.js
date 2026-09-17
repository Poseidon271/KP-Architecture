// K.P. ARCHITECTS — ADMIN PORTAL CONTROLLER

let currentSession = null;
let currentEnquiries = [];
let activeEnquiry = null;

let currentFilter = {
  status: 'all',
  priority: 'all',
  type: 'all',
  q: '',
  order: 'desc'
};

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initDashboardEvents();
});

/* ==============================================================================
   SAFE JSON RESPONSE PARSER
   ============================================================================== */
async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();
  let data = null;

  if (rawText && (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      data = null;
    }
  }

  if (!data) {
    data = {
      success: response.ok,
      error: rawText && rawText.length < 150 && !rawText.includes('<html') 
        ? rawText 
        : `Server returned HTTP ${response.status}`
    };
  }

  return {
    ok: response.ok,
    status: response.status,
    data: data
  };
}

/* ==============================================================================
   AUTHENTICATION
   ============================================================================== */
function initAuth() {
  const token = sessionStorage.getItem('kpa_admin_token');
  const userJson = sessionStorage.getItem('kpa_admin_user');

  if (token) {
    try {
      currentSession = {
        access_token: token,
        user: userJson ? JSON.parse(userJson) : { email: 'admin@kparchitects.com' }
      };
      showDashboard();
      fetchEnquiries();
    } catch (e) {
      sessionStorage.removeItem('kpa_admin_token');
      showLogin();
    }
  } else {
    showLogin();
  }

  const loginForm = document.getElementById('admin-login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error-msg');
    const submitBtn = document.getElementById('login-submit-btn');

    errorEl.classList.remove('visible');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying Credentials...';

    try {
      let res;
      try {
        res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email, password })
        });
      } catch (netErr) {
        throw new Error('Network error: Unable to connect to authentication server.');
      }

      const parsed = await parseJsonResponse(res);
      const data = parsed.data;

      if (!parsed.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      currentSession = data.session;
      sessionStorage.setItem('kpa_admin_token', data.session.access_token);
      sessionStorage.setItem('kpa_admin_user', JSON.stringify(data.user || { email }));

      showDashboard();
      fetchEnquiries();
      showToast('Welcome back, ' + (data.user?.email || 'Admin'));
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed. Please check your credentials.';
      errorEl.classList.add('visible');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In to Dashboard →';
    }
  });

  document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
    sessionStorage.removeItem('kpa_admin_token');
    sessionStorage.removeItem('kpa_admin_user');
    currentSession = null;
    showLogin();
    showToast('Signed out successfully.');
  });
}

function showLogin() {
  document.getElementById('admin-login-view').style.display = 'block';
  document.getElementById('admin-dashboard-view').style.display = 'none';
  document.getElementById('admin-header-actions').style.display = 'none';
}

function showDashboard() {
  document.getElementById('admin-login-view').style.display = 'none';
  document.getElementById('admin-dashboard-view').style.display = 'block';
  document.getElementById('admin-header-actions').style.display = 'flex';
  if (currentSession?.user?.email) {
    document.getElementById('admin-user-email').textContent = currentSession.user.email;
  }
}

/* ==============================================================================
   DATA FETCHING & RENDERING
   ============================================================================== */
async function fetchEnquiries() {
  if (!currentSession?.access_token) return;

  const params = new URLSearchParams();
  if (currentFilter.status !== 'all') params.append('status', currentFilter.status);
  if (currentFilter.priority !== 'all') params.append('priority', currentFilter.priority);
  if (currentFilter.type !== 'all') params.append('type', currentFilter.type);
  if (currentFilter.q) params.append('q', currentFilter.q);
  params.append('order', currentFilter.order);

  try {
    const res = await fetch(`/api/admin/enquiries?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (res.status === 401) {
      sessionStorage.removeItem('kpa_admin_token');
      showLogin();
      return;
    }

    const parsed = await parseJsonResponse(res);
    const json = parsed.data;

    if (parsed.ok && json.success) {
      currentEnquiries = json.data || [];
      updateMetrics(json.counts);
      renderTable(currentEnquiries);
    } else {
      showToast(json.error || 'Failed to load enquiries.');
    }
  } catch (err) {
    console.error('Failed to load enquiries:', err);
    showToast('Failed to load enquiries.');
  }
}

function updateMetrics(counts = {}) {
  document.getElementById('count-total').textContent = counts.total || 0;
  document.getElementById('count-new').textContent = counts.new || 0;
  document.getElementById('count-contacted').textContent = counts.contacted || 0;
  document.getElementById('count-in_progress').textContent = counts.in_progress || 0;
  document.getElementById('count-proposal').textContent = counts.proposal || 0;
  document.getElementById('count-converted').textContent = counts.converted || 0;
  document.getElementById('count-closed').textContent = counts.closed || 0;
}

function renderTable(enquiries) {
  const tbody = document.getElementById('enquiries-table-body');
  const emptyState = document.getElementById('table-empty-state');
  if (!tbody) return;

  if (enquiries.length === 0) {
    tbody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  tbody.innerHTML = enquiries.map(r => {
    const createdDate = new Date(r.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    return `
      <tr data-enquiry-id="${r.id}">
        <td>
          <div class="client-name-cell">${escapeHtml(r.name)}</div>
          <div class="client-contact-cell">${escapeHtml(r.email)} · ${escapeHtml(r.phone)}</div>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 0.76rem; color: #ffffff;">${escapeHtml(r.project_type)}</span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 0.76rem;">${escapeHtml(r.location)}</span>
        </td>
        <td>
          <span class="status-badge status-${r.status}">${r.status.replace('_', ' ')}</span>
        </td>
        <td>
          <span class="priority-badge priority-${r.priority}">${r.priority}</span>
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-size: 0.72rem;">${createdDate}</span>
        </td>
        <td>
          <span class="mono-tag" style="font-size: 0.68rem;">${r.consultation_ref || 'KPA-REF'}</span>
        </td>
      </tr>
    `;
  }).join('');

  // Row click handlers
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-enquiry-id');
      const item = currentEnquiries.find(e => e.id === id);
      if (item) openDrawer(item);
    });
  });
}

/* ==============================================================================
   DRAWER / DETAIL VIEW & ACTIONS
   ============================================================================== */
function openDrawer(enquiry) {
  activeEnquiry = enquiry;
  const drawer = document.getElementById('detail-drawer');
  const backdrop = document.getElementById('detail-drawer-backdrop');

  document.getElementById('drawer-ref-code').textContent = enquiry.consultation_ref || 'KPA-REF';
  document.getElementById('drawer-client-name').textContent = enquiry.name;
  document.getElementById('drawer-email').innerHTML = `<a href="mailto:${escapeHtml(enquiry.email)}">${escapeHtml(enquiry.email)}</a>`;
  document.getElementById('drawer-phone').innerHTML = `<a href="tel:${escapeHtml(enquiry.phone)}">${escapeHtml(enquiry.phone)}</a>`;
  document.getElementById('drawer-org').textContent = enquiry.organization || 'Individual Client';
  document.getElementById('drawer-created').textContent = new Date(enquiry.created_at).toLocaleString('en-IN');

  document.getElementById('drawer-type').textContent = enquiry.project_type;
  document.getElementById('drawer-location').textContent = enquiry.location;
  document.getElementById('drawer-disciplines').textContent = Array.isArray(enquiry.disciplines) ? enquiry.disciplines.join(', ') : (enquiry.disciplines || 'Architecture');
  document.getElementById('drawer-scale').textContent = enquiry.scale || 'Not Specified';
  document.getElementById('drawer-message').textContent = enquiry.message || 'No additional message provided.';

  document.getElementById('drawer-status-select').value = enquiry.status || 'new';
  document.getElementById('drawer-priority-select').value = enquiry.priority || 'normal';
  document.getElementById('drawer-notes').value = enquiry.admin_notes || '';

  drawer.classList.add('open');
  backdrop.classList.add('open');
  document.body.classList.add('modal-open');
}

function closeDrawer() {
  const drawer = document.getElementById('detail-drawer');
  const backdrop = document.getElementById('detail-drawer-backdrop');
  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  document.body.classList.remove('modal-open');
  activeEnquiry = null;
}

/* ==============================================================================
   CONTROLS & EVENT LISTENERS
   ============================================================================== */
function initDashboardEvents() {
  // Drawer close
  document.getElementById('drawer-close-btn')?.addEventListener('click', closeDrawer);
  document.getElementById('detail-drawer-backdrop')?.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeEnquiry) {
      closeDrawer();
    }
  });

  // Metric Cards Filter Click
  document.querySelectorAll('.metric-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.metric-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const status = card.getAttribute('data-filter-status');
      currentFilter.status = status;
      document.getElementById('filter-status-select').value = status;
      fetchEnquiries();
    });
  });

  // Filter Selects
  document.getElementById('filter-status-select')?.addEventListener('change', (e) => {
    currentFilter.status = e.target.value;
    document.querySelectorAll('.metric-card').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-filter-status') === currentFilter.status);
    });
    fetchEnquiries();
  });

  document.getElementById('filter-priority-select')?.addEventListener('change', (e) => {
    currentFilter.priority = e.target.value;
    fetchEnquiries();
  });

  document.getElementById('filter-type-select')?.addEventListener('change', (e) => {
    currentFilter.type = e.target.value;
    fetchEnquiries();
  });

  document.getElementById('sort-order-select')?.addEventListener('change', (e) => {
    currentFilter.order = e.target.value;
    fetchEnquiries();
  });

  // Search input debounced
  let searchTimeout;
  document.getElementById('admin-search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentFilter.q = e.target.value.trim();
      fetchEnquiries();
    }, 300);
  });

  // Refresh
  document.getElementById('admin-refresh-btn')?.addEventListener('click', () => {
    fetchEnquiries();
    showToast('Enquiry data refreshed.');
  });

  // Save Updates in Drawer
  document.getElementById('drawer-save-btn')?.addEventListener('click', async () => {
    if (!activeEnquiry || !currentSession?.access_token) return;

    const status = document.getElementById('drawer-status-select').value;
    const priority = document.getElementById('drawer-priority-select').value;
    const notes = document.getElementById('drawer-notes').value;

    try {
      const res = await fetch(`/api/admin/enquiries/${activeEnquiry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          status,
          priority,
          admin_notes: notes
        })
      });

      const parsed = await parseJsonResponse(res);
      const json = parsed.data;

      if (!parsed.ok || !json.success) {
        throw new Error(json.error || 'Failed to update record.');
      }

      showToast('Enquiry details updated successfully.');
      closeDrawer();
      fetchEnquiries();
    } catch (err) {
      alert(err.message || 'Error updating record.');
    }
  });

  // Quick Action: Mark Contacted
  document.getElementById('btn-quick-contacted')?.addEventListener('click', () => {
    document.getElementById('drawer-status-select').value = 'contacted';
    const notesEl = document.getElementById('drawer-notes');
    const today = new Date().toLocaleDateString('en-IN');
    notesEl.value = (notesEl.value ? notesEl.value + '\n' : '') + `[${today}] Initial contact made with client.`;
    showToast('Marked as Contacted. Click "Save Updates" to commit.');
  });

  // Quick Action: Mark Proposal
  document.getElementById('btn-quick-proposal')?.addEventListener('click', () => {
    document.getElementById('drawer-status-select').value = 'proposal';
    const notesEl = document.getElementById('drawer-notes');
    const today = new Date().toLocaleDateString('en-IN');
    notesEl.value = (notesEl.value ? notesEl.value + '\n' : '') + `[${today}] Architectural proposal & scope sent to client.`;
    showToast('Marked as Proposal Sent. Click "Save Updates" to commit.');
  });

  // Delete Record
  document.getElementById('drawer-delete-btn')?.addEventListener('click', async () => {
    if (!activeEnquiry || !currentSession?.access_token) return;

    const confirmDelete = confirm(`Are you sure you want to permanently delete the enquiry for "${activeEnquiry.name}"?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/admin/enquiries/${activeEnquiry.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Accept': 'application/json'
        }
      });

      const parsed = await parseJsonResponse(res);
      const json = parsed.data;

      if (!parsed.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete record.');
      }

      showToast('Record deleted.');
      closeDrawer();
      fetchEnquiries();
    } catch (err) {
      alert(err.message || 'Error deleting record.');
    }
  });

  // Export CSV
  document.getElementById('admin-export-btn')?.addEventListener('click', async () => {
    if (!currentSession?.access_token) return;

    try {
      showToast('Preparing CSV download...');
      const res = await fetch('/api/admin/enquiries/export/csv', {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      });

      if (!res.ok) {
        const parsed = await parseJsonResponse(res);
        throw new Error(parsed.data?.error || 'Export failed.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kpa_enquiries_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('CSV export downloaded.');
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    }
  });
}

function showToast(msg) {
  const toast = document.getElementById('admin-toast');
  const toastMsg = document.getElementById('toast-message');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

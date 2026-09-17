import { KPA_DATA } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  renderHeroStats();
  renderProjectsCarousel();
  renderAboutSection();
  renderServices();
  renderCapabilities();
  renderCategories();
  renderStories();
  renderProcess();
  renderTeamLeaders();
  renderTeamMembers();
  renderContactInfo();
  initCarouselInteractions();
  initProjectModal();
  initEnquiryWizard();
  initMobileDrawer();
  initScrollSpy();
});

/* ==========================================================================
   HEADER & NAVIGATION
   ========================================================================== */
function initHeader() {
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, { passive: true });
}

function initMobileDrawer() {
  const toggle = document.querySelector('.mobile-toggle');
  const drawer = document.querySelector('.mobile-drawer');
  const overlay = document.querySelector('.mobile-drawer-overlay');
  const links = document.querySelectorAll('.mobile-nav-link, .mobile-drawer .btn-primary');

  function openDrawer() {
    toggle.classList.add('active');
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.classList.add('modal-open');
  }

  function closeDrawer() {
    toggle.classList.remove('active');
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  toggle.addEventListener('click', () => {
    if (drawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  overlay.addEventListener('click', closeDrawer);

  links.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeDrawer();
    }
  });
}

function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 180;

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPos >= top && scrollPos < top + height) {
        current = sec.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });
}

/* ==========================================================================
   HERO STATS
   ========================================================================== */
function renderHeroStats() {
  const container = document.getElementById('hero-stats-container');
  if (!container) return;

  container.innerHTML = KPA_DATA.brand.stats.map(stat => `
    <div class="stat-item">
      <div class="stat-value">${stat.value}</div>
      <div class="stat-label">${stat.label}</div>
    </div>
  `).join('');
}

/* ==========================================================================
   SELECTED WORK / PROJECTS CAROUSEL
   ========================================================================== */
function renderProjectsCarousel() {
  const track = document.getElementById('carousel-track');
  if (!track) return;

  track.innerHTML = KPA_DATA.projects.map((proj, idx) => `
    <article class="project-card" data-project-id="${proj.id}" tabindex="0" role="button" aria-label="View project ${proj.title}">
      <div class="project-card-media">
        <span class="project-card-index">${proj.indexNumber || String(idx + 1).padStart(2, '0')}</span>
        <img 
          src="${proj.heroImage}" 
          alt="${proj.title} - ${proj.location}" 
          class="project-card-img" 
          loading="${idx < 3 ? 'eager' : 'lazy'}"
        />
        <div class="project-card-hover-action">Explore Case Study →</div>
      </div>
      <div class="project-card-body">
        <div class="project-meta-row">
          <span class="project-category-tag">${proj.category}</span>
          <span class="project-location-tag">${proj.location}</span>
        </div>
        <h3 class="project-card-title">${proj.title}</h3>
        <p class="project-card-highlight">${proj.highlight}</p>
      </div>
    </article>
  `).join('');
}

function initCarouselInteractions() {
  const viewport = document.getElementById('carousel-viewport');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  if (!viewport) return;

  let isDown = false;
  let startX;
  let scrollLeft;
  let hasMoved = false;

  viewport.addEventListener('mousedown', (e) => {
    isDown = true;
    hasMoved = false;
    viewport.classList.add('is-dragging');
    startX = e.pageX - viewport.offsetLeft;
    scrollLeft = viewport.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (isDown) {
      isDown = false;
      viewport.classList.remove('is-dragging');
    }
  });

  viewport.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - viewport.offsetLeft;
    const walk = (x - startX) * 1.6;
    if (Math.abs(walk) > 5) {
      hasMoved = true;
    }
    viewport.scrollLeft = scrollLeft - walk;
  });

  // Prev & Next Buttons
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const cardWidth = viewport.querySelector('.project-card')?.offsetWidth || 420;
      viewport.scrollBy({ left: -(cardWidth + 32), behavior: 'smooth' });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const cardWidth = viewport.querySelector('.project-card')?.offsetWidth || 420;
      viewport.scrollBy({ left: cardWidth + 32, behavior: 'smooth' });
    });
  }

  // Prevent click opening when dragging
  viewport.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const pid = card.getAttribute('data-project-id');
      openProjectModal(pid);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const pid = card.getAttribute('data-project-id');
        openProjectModal(pid);
      }
    });
  });
}

/* ==========================================================================
   ABOUT SECTION
   ========================================================================== */
function renderAboutSection() {
  const container = document.getElementById('about-disciplines-wrap');
  if (!container) return;

  const disciplines = [
    { num: "01", name: "Architectural Planning & Spatial Design" },
    { num: "02", name: "Structural Engineering & Seismic Detailing" },
    { num: "03", name: "Turnkey Interiors & Bespoke Millwork" },
    { num: "04", name: "Project Management & Quality Assurance" }
  ];

  container.innerHTML = disciplines.map(d => `
    <div class="discipline-item">
      <div class="discipline-num">${d.num}</div>
      <div class="discipline-name">${d.name}</div>
    </div>
  `).join('');
}

/* ==========================================================================
   SERVICES SECTION (3 PILLARS + 12 CAPABILITIES)
   ========================================================================== */
function renderServices() {
  const container = document.getElementById('services-pillars-grid');
  if (!container) return;

  container.innerHTML = KPA_DATA.services.map(s => `
    <div class="service-pillar-card">
      <div class="pillar-top">
        <div class="pillar-number">${s.num}</div>
        <h3 class="pillar-title">${s.title}</h3>
        <div class="pillar-tagline">${s.tagline}</div>
        <p class="pillar-desc">${s.description}</p>
      </div>
      <div class="pillar-scope-list">
        ${s.scope.map(item => `<div class="scope-item">${item}</div>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderCapabilities() {
  const container = document.getElementById('capabilities-grid');
  if (!container) return;

  container.innerHTML = KPA_DATA.capabilities.map(cap => `
    <div class="capability-card">
      <h4 class="capability-name">${cap.name}</h4>
      <p class="capability-desc">${cap.desc}</p>
    </div>
  `).join('');
}

/* ==========================================================================
   PROJECT CATEGORIES
   ========================================================================== */
function renderCategories() {
  const container = document.getElementById('categories-grid');
  if (!container) return;

  container.innerHTML = KPA_DATA.categories.map(cat => `
    <article class="category-editorial-card" data-category-key="${cat.key}">
      <img src="${cat.image}" alt="${cat.name}" class="category-card-img" loading="lazy" />
      <div class="category-overlay">
        <div class="category-card-top">
          <span class="category-count-badge">${cat.count}</span>
        </div>
        <div class="category-card-bottom">
          <h3 class="category-card-title">${cat.name}</h3>
          <p class="category-card-summary">${cat.summary}</p>
          <div class="category-card-cta">Explore Typology Collection →</div>
        </div>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('.category-editorial-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-category-key');
      // Find first project matching this category and open modal
      const matched = KPA_DATA.projects.find(p => p.categoryKey === key);
      if (matched) {
        openProjectModal(matched.id);
      } else {
        // Scroll to work
        document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

/* ==========================================================================
   FEATURED PROJECT STORIES
   ========================================================================== */
function renderStories() {
  const container = document.getElementById('stories-list');
  if (!container) return;

  container.innerHTML = KPA_DATA.stories.map(story => `
    <article class="story-item">
      <div class="story-content">
        <div class="story-header-meta">
          <span class="story-number">${story.number}</span>
          <span class="mono-tag">${story.tag}</span>
        </div>
        <h3 class="story-title">${story.title}</h3>
        <div class="story-subtitle">${story.subtitle}</div>
        <blockquote class="story-excerpt">“${story.excerpt}”</blockquote>
        <p class="story-body">${story.body}</p>
        <div class="story-projects-tags">
          ${story.projects.map(p => `<span class="story-proj-tag">${p}</span>`).join('')}
        </div>
      </div>
      <div class="story-media-wrap">
        <div class="story-image-box">
          <img src="${story.image}" alt="${story.title}" class="story-main-img" loading="lazy" />
        </div>
      </div>
    </article>
  `).join('');
}

/* ==========================================================================
   PROCESS / APPROACH SECTION
   ========================================================================== */
function renderProcess() {
  const container = document.getElementById('process-grid');
  if (!container) return;

  container.innerHTML = KPA_DATA.process.map(step => `
    <div class="process-card">
      <div>
        <div class="process-top-row">
          <div class="process-step-num">${step.num}</div>
        </div>
        <h3 class="process-step-title">${step.title}</h3>
        <div class="process-step-sub">${step.subtitle}</div>
      </div>
      <div class="process-points-list">
        ${step.points.map(pt => `<div class="process-point-item">${pt}</div>`).join('')}
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   TEAM LEADERS SECTION
   ========================================================================== */
function renderTeamLeaders() {
  const container = document.getElementById('leaders-grid');
  if (!container) return;

  container.innerHTML = KPA_DATA.teamLeaders.map(leader => `
    <div class="leader-card">
      <div class="leader-image-wrap">
        <img src="${leader.image}" alt="${leader.name}" class="leader-photo" loading="lazy" />
      </div>
      <div class="leader-details">
        <h3 class="leader-name">${leader.name}</h3>
        <div class="leader-role">${leader.role}</div>
        <p class="leader-bio">${leader.bio}</p>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   OUR TEAM SECTION
   ========================================================================== */
function renderTeamMembers() {
  const container = document.getElementById('team-members-grid');
  if (!container) return;

  container.innerHTML = KPA_DATA.teamMembers.map(member => `
    <div class="member-card">
      <div class="member-photo-wrap">
        <img src="${member.image}" alt="${member.name}" class="member-photo" loading="lazy" />
      </div>
      <div class="member-info">
        <div class="member-name">${member.name}</div>
        <div class="member-role">${member.role}</div>
        <div class="member-qual">${member.qual}</div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   CONTACT SECTION
   ========================================================================== */
function renderContactInfo() {
  const studiosContainer = document.getElementById('contact-studios-wrap');
  const linksContainer = document.getElementById('contact-links-wrap');

  if (studiosContainer) {
    studiosContainer.innerHTML = KPA_DATA.contact.studios.map(s => `
      <div class="studio-card">
        <h4 class="studio-name">${s.city}</h4>
        <p class="studio-addr">${s.address}</p>
        ${s.altAddress ? `<p class="studio-addr" style="margin-top: 0.35rem; color: var(--text-muted-dark); font-size: 0.82rem;">Branch: ${s.altAddress}</p>` : ''}
      </div>
    `).join('');
  }

  if (linksContainer) {
    const emailsHtml = KPA_DATA.contact.emails.map(e => `
      <div class="direct-link-item">
        <span class="direct-link-label">${e.label}</span>
        <a href="mailto:${e.email}" class="direct-link-val">${e.email}</a>
      </div>
    `).join('');

    const phonesHtml = KPA_DATA.contact.phones.map(p => `
      <div class="direct-link-item">
        <span class="direct-link-label">${p.label}</span>
        <a href="tel:${p.tel}" class="direct-link-val">${p.number}</a>
      </div>
    `).join('');

    linksContainer.innerHTML = emailsHtml + phonesHtml;
  }
}

/* ==========================================================================
   PROJECT DETAIL MODAL
   ========================================================================== */
let currentModalProject = null;

function initProjectModal() {
  const modal = document.getElementById('project-modal');
  const backdrop = modal?.querySelector('.project-modal-backdrop');
  const closeBtn = modal?.querySelector('.modal-close-btn');

  if (!modal) return;

  function closeModal() {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    currentModalProject = null;
  }

  backdrop?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

function openProjectModal(projectId) {
  const modal = document.getElementById('project-modal');
  const modalBody = document.getElementById('modal-body-content');
  if (!modal || !modalBody) return;

  const project = KPA_DATA.projects.find(p => p.id === projectId);
  if (!project) return;

  currentModalProject = project;

  modalBody.innerHTML = `
    <div class="modal-header-meta">
      <div class="modal-tags-row">
        <span class="mono-tag">${project.category}</span>
        <span class="mono-tag" style="color: var(--text-muted-dark);">${project.location}</span>
        <span class="mono-tag" style="color: var(--accent-gold);">${project.year}</span>
      </div>
      <h2 class="modal-title">${project.title}</h2>
    </div>

    <div class="modal-gallery-grid">
      ${project.gallery.map((imgSrc, i) => `
        <div class="modal-gallery-item">
          <img src="${imgSrc}" alt="${project.title} view ${i + 1}" loading="lazy" />
        </div>
      `).join('')}
    </div>

    <div class="modal-details-grid">
      <div>
        <h4 class="mono-tag" style="margin-bottom: 1rem;">Architectural Summary</h4>
        <p class="modal-narrative">${project.description}</p>
        
        <div style="margin-top: 2rem;">
          <h4 class="mono-tag" style="margin-bottom: 0.75rem;">Disciplines Delivered</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
            ${project.specs.services.map(s => `<span class="story-proj-tag">${s}</span>`).join('')}
          </div>
        </div>
      </div>

      <div class="modal-specs-box">
        <div class="specs-title">Project Specifications</div>
        <div class="specs-list">
          <div class="specs-item"><strong>Typology:</strong> ${project.specs.typology}</div>
          <div class="specs-item"><strong>Location:</strong> ${project.location}</div>
          <div class="specs-item"><strong>Practice:</strong> K.P. Architects</div>
        </div>

        <div class="specs-title" style="margin-top: 1rem;">Key Highlights</div>
        <div class="specs-list">
          ${project.specs.features.map(f => `<div class="specs-item">${f}</div>`).join('')}
        </div>

        <button class="btn-primary" style="margin-top: 1.5rem; width: 100%;" onclick="document.getElementById('project-modal').classList.remove('active'); document.body.classList.remove('modal-open'); document.getElementById('contact').scrollIntoView({behavior: 'smooth'});">
          Consult on Similar Project →
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.classList.add('modal-open');
}

/* ==========================================================================
   2-STEP ARCHITECTURAL ENQUIRY WIZARD
   ========================================================================== */
function initEnquiryWizard() {
  const step1 = document.getElementById('wizard-step-1');
  const step2 = document.getElementById('wizard-step-2');
  const successState = document.getElementById('wizard-success');
  const stepIndicator = document.getElementById('wizard-step-indicator');

  const nextBtn = document.getElementById('wizard-next-btn');
  const backBtn = document.getElementById('wizard-back-btn');
  const submitBtn = document.getElementById('wizard-submit-btn');
  const resetBtn = document.getElementById('wizard-reset-btn');

  const errorMsg1 = document.getElementById('step-1-error');
  const errorMsg2 = document.getElementById('step-2-error');

  const formData = {
    name: '',
    email: '',
    phone: '',
    organization: '',
    disciplines: [],
    projectType: '',
    location: '',
    scale: '',
    brief: ''
  };

  // Next: Step 1 -> Step 2
  nextBtn?.addEventListener('click', () => {
    const nameInput = document.getElementById('enquiry-name');
    const emailInput = document.getElementById('enquiry-email');
    const phoneInput = document.getElementById('enquiry-phone');

    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const phone = phoneInput?.value.trim();

    if (!name || !email || !phone) {
      errorMsg1.textContent = 'Please provide your name, email, and contact number.';
      errorMsg1.classList.add('visible');
      return;
    }

    // Basic email pattern check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorMsg1.textContent = 'Please provide a valid email address.';
      errorMsg1.classList.add('visible');
      return;
    }

    errorMsg1.classList.remove('visible');
    formData.name = name;
    formData.email = email;
    formData.phone = phone;
    formData.organization = document.getElementById('enquiry-org')?.value.trim() || '';

    // Switch to step 2
    step1.classList.remove('active');
    step2.classList.add('active');
    stepIndicator.textContent = 'Step 02 / 02 — Project Scope';
  });

  // Back: Step 2 -> Step 1
  backBtn?.addEventListener('click', () => {
    step2.classList.remove('active');
    step1.classList.add('active');
    stepIndicator.textContent = 'Step 01 / 02 — Client Details';
    errorMsg2.classList.remove('visible');
  });

  // Submit: Step 2 -> Real Database Insertion Flow
  submitBtn?.addEventListener('click', async () => {
    if (submitBtn.disabled) return;

    const selectedDisciplines = Array.from(document.querySelectorAll('input[name="discipline"]:checked')).map(cb => cb.value);
    const projType = document.getElementById('enquiry-type')?.value;
    const location = document.getElementById('enquiry-location')?.value.trim();
    const scale = document.getElementById('enquiry-scale')?.value.trim();
    const brief = document.getElementById('enquiry-message')?.value.trim();
    const honeypot = document.getElementById('_hp_company')?.value || '';

    if (selectedDisciplines.length === 0) {
      errorMsg2.textContent = 'Please select at least one architectural or engineering discipline.';
      errorMsg2.classList.add('visible');
      return;
    }

    if (!location) {
      errorMsg2.textContent = 'Please specify the project location / city.';
      errorMsg2.classList.add('visible');
      return;
    }

    errorMsg2.classList.remove('visible');
    formData.disciplines = selectedDisciplines;
    formData.projectType = projType;
    formData.location = location;
    formData.scale = scale;
    formData.brief = brief;

    // Loading State & Duplicate Prevention
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Submitting Consultation Request...';

    try {
      let response;
      try {
        response = await fetch('/api/enquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            organization: formData.organization,
            project_type: formData.projectType,
            disciplines: formData.disciplines,
            location: formData.location,
            scale: formData.scale,
            message: formData.brief,
            _hp_company: honeypot
          })
        });
      } catch (networkErr) {
        throw new Error('Network error: Unable to reach the server. Please check your connection and try again.');
      }

      // Safe Response Parsing
      let result = null;
      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();

      if (rawText && (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
        try {
          result = JSON.parse(rawText);
        } catch (parseErr) {
          result = null;
        }
      }

      if (!response.ok || !result || result.success !== true) {
        const errorMsg = (result && result.error)
          ? result.error
          : (rawText && rawText.length < 150 && !rawText.includes('<html') ? rawText : `Submission failed (HTTP ${response.status}). Please try again.`);
        throw new Error(errorMsg);
      }

      // Success: Show deterministic display reference code and confirmation
      const enquiryId = result.id || result.enquiryId || '';
      const refCode = result.consultationRef || (enquiryId ? `KPA-${enquiryId.replace(/-/g, '').slice(0, 6).toUpperCase()}` : 'KPA-REF');
      
      const ticketElement = document.getElementById('ticket-ref-number');
      if (ticketElement) {
        ticketElement.textContent = `Consultation Reference: ${refCode}`;
      }

      const clientSummaryEl = document.getElementById('ticket-client-name');
      if (clientSummaryEl) {
        clientSummaryEl.textContent = `Thank you, ${formData.name}. Your consultation request has been received. Our leadership team will review the details and get in touch.`;
      }

      // Transition to success state
      step2.classList.remove('active');
      successState.classList.add('active');
      stepIndicator.textContent = 'Consultation Request Received';
    } catch (err) {
      console.error('Enquiry submission failure:', err);
      errorMsg2.textContent = err.message || 'Unable to store enquiry. Please contact studio directly.';
      errorMsg2.classList.add('visible');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });

  // Reset form
  resetBtn?.addEventListener('click', () => {
    document.getElementById('enquiry-name').value = '';
    document.getElementById('enquiry-email').value = '';
    document.getElementById('enquiry-phone').value = '';
    document.getElementById('enquiry-org').value = '';
    document.getElementById('enquiry-location').value = '';
    document.getElementById('enquiry-scale').value = '';
    document.getElementById('enquiry-message').value = '';
    const hp = document.getElementById('_hp_company');
    if (hp) hp.value = '';
    document.querySelectorAll('input[name="discipline"]').forEach(cb => cb.checked = false);

    successState.classList.remove('active');
    step1.classList.add('active');
    stepIndicator.textContent = 'Step 01 / 02 — Client Details';
  });
}

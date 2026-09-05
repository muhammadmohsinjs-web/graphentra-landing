'use strict';
const impactData = {
  otp: { reason: 'OTP login calls the updated token validator. Check valid, invalid, and expired codes.', path: 'validateToken → verifyOtp → /login/otp' },
  password: { reason: 'Password login uses the same token validator. Check that a valid login creates a working session.', path: 'validateToken → passwordLogin → /login' },
  guardian: { reason: 'Guardian access relies on session middleware that uses the updated validator. Check access after login and session expiry.', path: 'validateToken → sessionMiddleware → /guardian/children' }
};
function showView(view) {
  const validView = view === 'verification' ? 'verification' : 'impact';
  document.querySelectorAll('[data-view]').forEach(button => {
    const selected = button.dataset.view === validView;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.getElementById('impact-view').hidden = validView !== 'impact';
  document.getElementById('verification-view').hidden = validView !== 'verification';
  document.getElementById('demo-footer-hint').textContent = validView === 'impact' ? 'Select an area to inspect its connection' : 'Example evidence from an illustrative run';
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
document.querySelectorAll('[data-surface]').forEach(button => button.addEventListener('click', () => {
  const selected = impactData[button.dataset.surface];
  if (!selected) return;
  document.querySelectorAll('[data-surface]').forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  document.getElementById('impact-reason').textContent = selected.reason;
  document.getElementById('evidence-path').textContent = selected.path;
}));
document.querySelectorAll('[data-show]').forEach(link => link.addEventListener('click', () => showView(link.dataset.show)));
const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation');
  mobileNav.hidden = true;
}
menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
  mobileNav.hidden = isOpen;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuToggle.focus(); }
});
window.matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const analyticsEventNames = new Set([
  'early_access_section_viewed',
  'early_access_form_started',
  'early_access_form_submitted',
  'early_access_form_failed',
  'discuss_pilot_clicked'
]);

function trackEvent(name) {
  if (!analyticsEventNames.has(name)) return;
  try {
    if (typeof window.gtag === 'function') window.gtag('event', name);
    else if (typeof window.plausible === 'function') window.plausible(name);
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name });
    window.dispatchEvent(new CustomEvent('graphentra:analytics', { detail: { event: name } }));
  } catch (error) {
    console.warn('Graphentra analytics event could not be recorded.', { event: name, reason: error && error.name });
  }
}

const earlyAccessSection = document.getElementById('early-access');
if (earlyAccessSection) {
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      trackEvent('early_access_section_viewed');
      sectionObserver.disconnect();
    }, { threshold: 0.3 });
    sectionObserver.observe(earlyAccessSection);
  }
}

document.querySelectorAll('[data-interest="Paid pilot"]').forEach(link => link.addEventListener('click', () => {
  const paidPilot = document.querySelector('input[name="interest"][value="Paid pilot"]');
  if (paidPilot) paidPilot.checked = true;
  trackEvent('discuss_pilot_clicked');
}));

const leadForm = document.getElementById('early-access-form');
if (leadForm) {
  const submitButton = document.getElementById('lead-submit');
  const formStatus = document.getElementById('form-status');
  const formContent = document.getElementById('lead-form-content');
  const successState = document.getElementById('lead-success');
  const challengeInput = document.getElementById('lead-challenge');
  const challengeCount = document.getElementById('challenge-count');
  const genericError = 'We couldn’t submit your request. Please try again or contact us directly.';
  let formStarted = false;
  let submitting = false;
  let submissionId = createSubmissionId();

  function createSubmissionId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function showFieldError(name, message) {
    const field = leadForm.elements[name];
    const errorNode = document.getElementById(`${name}-error`);
    const fieldGroup = name === 'interest' ? leadForm.querySelector('.interest-fieldset') : field;
    if (errorNode) errorNode.textContent = message || '';
    if (fieldGroup && typeof fieldGroup.setAttribute === 'function') {
      if (message) fieldGroup.setAttribute('aria-invalid', 'true');
      else fieldGroup.removeAttribute('aria-invalid');
    }
  }

  function fieldValue(name) {
    const field = leadForm.elements[name];
    return field && typeof field.value === 'string' ? field.value.trim() : '';
  }

  function validateField(name) {
    const value = fieldValue(name);
    let message = '';
    if (name === 'name' && !value) message = 'Enter your full name.';
    if (name === 'email') {
      if (!value) message = 'Enter your work email.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) message = 'Enter a valid email address.';
    }
    if (name === 'company' && !value) message = 'Enter your company name.';
    if (name === 'role' && !value) message = 'Select your role.';
    if (name === 'challenge') {
      if (!value) message = 'Tell us about your regression-testing challenge.';
      else if (value.length < 20) message = 'Use at least 20 characters.';
      else if (value.length > 1000) message = 'Use no more than 1,000 characters.';
    }
    if (name === 'interest' && !leadForm.querySelector('input[name="interest"]:checked')) message = 'Select what you are interested in.';
    if (name === 'consent' && !leadForm.elements.consent.checked) message = 'Consent is required before we can contact you.';
    showFieldError(name, message);
    return !message;
  }

  function validateForm() {
    const fields = ['name', 'email', 'company', 'role', 'challenge', 'interest', 'consent'];
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) {
      const firstInvalid = leadForm.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
    }
    return valid;
  }

  function updateChallengeCount() {
    challengeCount.textContent = `${challengeInput.value.length.toLocaleString()} / 1,000`;
  }

  function markFormStarted() {
    if (formStarted) return;
    formStarted = true;
    trackEvent('early_access_form_started');
  }

  function setSubmitting(isSubmitting) {
    submitting = isSubmitting;
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? 'Submitting…' : 'Request Early Access';
  }

  function showSubmissionError(status, requestId) {
    formStatus.textContent = genericError;
    formStatus.hidden = false;
    formStatus.focus();
    trackEvent('early_access_form_failed');
    console.warn('Graphentra lead submission failed.', { status, requestId: requestId || undefined });
  }

  function readAttribution() {
    const params = new URLSearchParams(window.location.search);
    const read = key => (params.get(key) || '').trim().slice(0, 200);
    return {
      source: 'website',
      utm_source: read('utm_source'),
      utm_medium: read('utm_medium'),
      utm_campaign: read('utm_campaign'),
      utm_content: read('utm_content'),
      referrer: (document.referrer || '').slice(0, 2048)
    };
  }

  function submissionPayload() {
    const data = new FormData(leadForm);
    return {
      submission_id: submissionId,
      name: fieldValue('name'),
      email: fieldValue('email').toLowerCase(),
      company: fieldValue('company'),
      role: fieldValue('role'),
      challenge: fieldValue('challenge'),
      interest: data.get('interest') || '',
      consent: leadForm.elements.consent.checked,
      website: fieldValue('website'),
      ...readAttribution()
    };
  }

  leadForm.addEventListener('input', event => {
    markFormStarted();
    if (event.target === challengeInput) updateChallengeCount();
    if (event.target.getAttribute('aria-invalid') === 'true') validateField(event.target.name);
  });
  leadForm.addEventListener('change', event => {
    markFormStarted();
    if (event.target.name === 'interest' || event.target.name === 'consent' || event.target.name === 'role') validateField(event.target.name);
  });
  leadForm.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select, textarea').forEach(field => {
    field.addEventListener('blur', () => validateField(field.name));
  });
  updateChallengeCount();

  leadForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || !validateForm()) return;
    formStatus.hidden = true;
    setSubmitting(true);
    try {
      const response = await fetch(leadForm.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(submissionPayload())
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        if (response.status === 422 && result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([name, message]) => showFieldError(name, message));
        }
        showSubmissionError(response.status, result.requestId);
        return;
      }
      trackEvent('early_access_form_submitted');
      formContent.hidden = true;
      successState.hidden = false;
      successState.focus();
      submissionId = createSubmissionId();
    } catch (error) {
      showSubmissionError('network_error', error && error.name);
    } finally {
      setSubmitting(false);
    }
  });
}

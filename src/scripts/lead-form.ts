import { trackEvent } from './analytics';

type FieldName = 'name' | 'email' | 'company' | 'role' | 'challenge' | 'interest' | 'consent';
type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | RadioNodeList;

const FIELDS: FieldName[] = ['name', 'email', 'company', 'role', 'challenge', 'interest', 'consent'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const genericError = 'We couldn’t submit your request. Please try again or contact us directly.';

function createSubmissionId(): string {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** "Discuss a pilot" links preselect the Paid pilot interest before scrolling to the form. */
export function initPilotLinks(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-interest="Paid pilot"]').forEach(link =>
    link.addEventListener('click', () => {
      const paidPilot = document.querySelector<HTMLInputElement>('input[name="interest"][value="Paid pilot"]');
      if (paidPilot) paidPilot.checked = true;
      trackEvent('discuss_pilot_clicked');
    })
  );
}

export function initLeadForm(): void {
  const leadForm = document.getElementById('early-access-form');
  if (!(leadForm instanceof HTMLFormElement)) return;

  const submitButton = document.getElementById('lead-submit') as HTMLButtonElement;
  const submitLabel = submitButton.querySelector<HTMLElement>('[data-submit-label]');
  const formStatus = document.getElementById('form-status') as HTMLElement;
  const formContent = document.getElementById('lead-form-content') as HTMLElement;
  const successState = document.getElementById('lead-success') as HTMLElement;
  const challengeInput = document.getElementById('lead-challenge') as HTMLTextAreaElement;
  const challengeCount = document.getElementById('challenge-count') as HTMLElement;
  const challengeMeter = leadForm.querySelector<HTMLElement>('[data-challenge-meter]');
  const consentInput = leadForm.elements.namedItem('consent') as HTMLInputElement;
  let formStarted = false;
  let submitting = false;
  let submissionId = createSubmissionId();

  const control = (name: string) => leadForm.elements.namedItem(name) as FieldControl | null;

  function fieldValue(name: string): string {
    const field = control(name);
    return field && typeof field.value === 'string' ? field.value.trim() : '';
  }

  function showFieldError(name: string, message: string): void {
    const errorNode = document.getElementById(`${name}-error`);
    const fieldGroup = name === 'interest' ? leadForm!.querySelector('.interest-fieldset') : control(name);
    if (errorNode) errorNode.textContent = message || '';
    if (fieldGroup instanceof Element) {
      if (message) fieldGroup.setAttribute('aria-invalid', 'true');
      else fieldGroup.removeAttribute('aria-invalid');
    }
  }

  function validateField(name: FieldName): boolean {
    const value = fieldValue(name);
    let message = '';
    if (name === 'name' && !value) message = 'Enter your full name.';
    if (name === 'email') {
      if (!value) message = 'Enter your work email.';
      else if (!EMAIL_PATTERN.test(value)) message = 'Enter a valid email address.';
    }
    if (name === 'company' && !value) message = 'Enter your company name.';
    if (name === 'role' && !value) message = 'Select your role.';
    if (name === 'challenge') {
      if (!value) message = 'Tell us about your regression-testing challenge.';
      else if (value.length < 20) message = 'Use at least 20 characters.';
      else if (value.length > 1000) message = 'Use no more than 1,000 characters.';
    }
    if (name === 'interest' && !leadForm!.querySelector('input[name="interest"]:checked')) message = 'Select what you are interested in.';
    if (name === 'consent' && !consentInput.checked) message = 'Consent is required before we can contact you.';
    showFieldError(name, message);
    return !message;
  }

  function validateForm(): boolean {
    const valid = FIELDS.map(validateField).every(Boolean);
    if (!valid) {
      const firstInvalid = leadForm!.querySelector<HTMLElement>('[aria-invalid="true"]');
      const focusTarget = firstInvalid instanceof HTMLFieldSetElement ? firstInvalid.querySelector<HTMLElement>('input') : firstInvalid;
      focusTarget?.focus();
    }
    return valid;
  }

  function updateChallengeCount(): void {
    const length = challengeInput.value.length;
    challengeCount.textContent = `${length.toLocaleString()} / 1,000`;
    challengeMeter?.style.setProperty('--fill', String(Math.min(1, length / 20)));
  }

  function markFormStarted(): void {
    if (formStarted) return;
    formStarted = true;
    trackEvent('early_access_form_started');
  }

  function setSubmitting(isSubmitting: boolean): void {
    submitting = isSubmitting;
    submitButton.disabled = isSubmitting;
    submitButton.classList.toggle('is-loading', isSubmitting);
    submitButton.setAttribute('aria-busy', String(isSubmitting));
    if (submitLabel) submitLabel.textContent = isSubmitting ? 'Submitting…' : 'Request early access';
  }

  function showSubmissionError(status: number | string, requestId?: string): void {
    formStatus.textContent = genericError;
    formStatus.hidden = false;
    formStatus.focus();
    trackEvent('early_access_form_failed');
    console.warn('Graphentra lead submission failed.', { status, requestId: requestId || undefined });
  }

  function readAttribution() {
    const params = new URLSearchParams(window.location.search);
    const read = (key: string) => (params.get(key) || '').trim().slice(0, 200);
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
    const data = new FormData(leadForm as HTMLFormElement);
    return {
      submission_id: submissionId,
      name: fieldValue('name'),
      email: fieldValue('email').toLowerCase(),
      company: fieldValue('company'),
      role: fieldValue('role'),
      challenge: fieldValue('challenge'),
      interest: data.get('interest') || '',
      consent: consentInput.checked,
      website: fieldValue('website'),
      ...readAttribution()
    };
  }

  leadForm.addEventListener('input', event => {
    markFormStarted();
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (target === challengeInput) updateChallengeCount();
    if (target.getAttribute('aria-invalid') === 'true') validateField(target.name as FieldName);
  });

  leadForm.addEventListener('change', event => {
    markFormStarted();
    const { name } = event.target as HTMLInputElement;
    if (name === 'interest' || name === 'consent' || name === 'role') validateField(name);
  });

  leadForm.querySelectorAll<HTMLInputElement>('input:not([type="radio"]):not([type="checkbox"]), select, textarea').forEach(field => {
    if (field.name === 'website') return;
    field.addEventListener('blur', () => validateField(field.name as FieldName));
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
      const result: { ok?: boolean; requestId?: string; fieldErrors?: Record<string, string> } = await response.json().catch(() => ({}));
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
      showSubmissionError('network_error', error instanceof Error ? error.name : undefined);
    } finally {
      setSubmitting(false);
    }
  });
}

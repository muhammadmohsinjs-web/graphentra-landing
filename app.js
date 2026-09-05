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

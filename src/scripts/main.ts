import { initCtaTracking, observeEarlyAccessSection } from './analytics';
import { initFaq } from './faq';
import { initHeader } from './header';
import { initHowItWorks } from './how-it-works';
import { initInterestFromUrl, initLeadForm, initPilotLinks } from './lead-form';
import { initReveal } from './reveal';

/**
 * Entry for every page. Everything here is safe when its elements are absent, and none of it
 * needs an animation library. GSAP and ScrollTrigger load only on the home page, for its scrubbed scenes.
 */
initCtaTracking();
initHeader();
initFaq();
initHowItWorks();
initPilotLinks();
initInterestFromUrl();
initLeadForm();
observeEarlyAccessSection();
initReveal();
initSpotlight();

if (document.querySelector('[data-page="home"]')) {
  void import('./home');
}

/** Panels track the pointer with a soft light (CSS reads --mx / --my). Fine pointers only. */
function initSpotlight(): void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll<HTMLElement>('[data-spot]').forEach(card => {
    card.addEventListener(
      'pointermove',
      event => {
        const box = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - box.left}px`);
        card.style.setProperty('--my', `${event.clientY - box.top}px`);
      },
      { passive: true }
    );
  });
}

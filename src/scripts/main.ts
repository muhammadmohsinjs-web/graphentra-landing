import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { observeEarlyAccessSection } from './analytics';
import { initHeader } from './header';
import { initHeroGraph } from './hero-graph';
import { initHowItWorks } from './how-it-works';
import { initFaq, initMagnetic, initSpotlight } from './interactions';
import { initLeadForm, initPilotLinks } from './lead-form';
import { fontsReady, initScrollScenes, playIntro } from './motion';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Set by the inline <head> script: present only when the visitor hasn't asked for reduced motion.
const motion = document.documentElement.classList.contains('motion');

// Core behaviour first — none of this depends on animation.
initLeadForm();
initPilotLinks();
observeEarlyAccessSection();
initHeader(motion);
const graph = initHeroGraph(motion);
initHowItWorks(motion);
initFaq(motion);
initSpotlight();

if (motion) {
  initMagnetic();
  fontsReady().then(() => {
    playIntro(() => graph?.play());
    initScrollScenes();
  });

  // "Replay the example" re-runs the propagation once the hero figure is back in view.
  const figure = document.querySelector('[data-hero-figure]');
  document.querySelectorAll('[data-replay]').forEach(link =>
    link.addEventListener('click', () => {
      if (!graph || !figure) return;
      const observer = new IntersectionObserver(
        entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          observer.disconnect();
          graph.replay();
        },
        { threshold: 0.35 }
      );
      observer.observe(figure);
    })
  );
}

// Keep trigger positions honest when content height changes (accordion, form states, late fonts).
if ('ResizeObserver' in window) {
  let lastHeight = document.body.offsetHeight;
  let frame = 0;
  new ResizeObserver(() => {
    const height = document.body.offsetHeight;
    if (Math.abs(height - lastHeight) < 2) return;
    lastHeight = height;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => ScrollTrigger.refresh());
  }).observe(document.body);
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initHeroGraph } from './hero-graph';

/**
 * Home page only. The hero's entrance is CSS, so this file never delays the first paint. It adds
 * the hero's row selection, the "replay the trace" button and the one scrubbed scene (the ticket's
 * declared scope against the scope the code actually reaches). Loaded on demand by main.ts.
 */
gsap.registerPlugin(ScrollTrigger);

const motion = document.documentElement.classList.contains('motion');
const graph = initHeroGraph();

document.querySelectorAll('[data-replay]').forEach(link =>
  link.addEventListener('click', () => {
    if (!graph) return;
    // Wait for the smooth scroll back to the top, then replay the entrance.
    window.setTimeout(() => graph.replay(), 650);
  })
);

if (motion) initReachFigure();

/** The ticket's declared scope, then the flows it actually reaches (scrubbed with scroll). */
function initReachFigure(): void {
  const figure = document.querySelector<HTMLElement>('[data-reach]');
  if (!figure) return;
  const ticket = figure.querySelector('[data-reach-ticket]');
  const lines = figure.querySelectorAll<SVGPathElement>('[data-reach-line]');
  const unknownMask = figure.querySelector('.reach-mask-path');
  const items = figure.querySelectorAll<HTMLElement>('[data-reach-item]');
  const tallies = Array.from(figure.querySelectorAll<HTMLElement>('[data-tally]'));
  const [declared, reachable, unresolved] = tallies;
  const count = { reachable: 1, unresolved: 0 };
  const renderCount = () => {
    if (reachable) reachable.textContent = String(Math.round(count.reachable));
    if (unresolved) unresolved.textContent = String(Math.round(count.unresolved));
  };
  if (declared) declared.textContent = '1';
  renderCount();

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: figure, start: 'top 80%', end: 'center 45%', scrub: 0.8 }
  });
  tl.from(ticket, { x: -24, opacity: 0, duration: 0.35 })
    .fromTo(lines[0], { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4 })
    .from(items[0], { x: 28, opacity: 0, duration: 0.3 }, '<0.2')
    .fromTo([lines[1], lines[2]], { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5, stagger: 0.14 })
    .from([items[1], items[2]], { x: 28, opacity: 0, duration: 0.3, stagger: 0.14 }, '<0.25')
    .to(count, { reachable: 3, duration: 0.45, onUpdate: renderCount }, '<')
    .fromTo(unknownMask, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45 })
    .from(items[3], { x: 28, opacity: 0, duration: 0.3 }, '<0.2')
    .to(count, { unresolved: 1, duration: 0.2, onUpdate: renderCount }, '<');

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
}

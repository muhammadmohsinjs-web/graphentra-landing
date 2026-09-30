/**
 * Scroll reveals for every page. Anything marked data-reveal fades up once as it enters the viewport.
 *
 * Authors mark the few things that sit above the fold. Everything below it is marked here, by
 * layout rather than by hand, so every section on every page behaves the same: a section's head,
 * then its cards, rows or panels, one after another. `reveal-ready` is set once the state of what
 * is already on screen is known, so nothing is left hidden if this script fails.
 */

/** Elements that are animated by something else, or that must never be moved. */
const SKIP = '[data-no-reveal], [data-reveal], .sh, .page-head, .hero, .marquee, .site-header, dialog, [hidden]';

/** A block that lays its children out as a grid, row or list is revealed child by child. */
function isGroup(el: HTMLElement): boolean {
  if (el.children.length < 2) return false;
  const display = getComputedStyle(el).display;
  return display === 'grid' || display === 'flex' || el.tagName === 'UL' || el.tagName === 'OL';
}

function tag(el: HTMLElement, index: number): void {
  el.setAttribute('data-reveal', '');
  el.style.setProperty('--i', String(index % 4));
}

/** Mark the direct content of each section, going one level into groups for a staggered entrance. */
function autoTag(viewport: number): void {
  document.querySelectorAll<HTMLElement>('main > section:not(.hero):not(.ticker), .cta-band').forEach(section => {
    const container = section.querySelector<HTMLElement>(':scope > .container') ?? section;
    Array.from(container.children).forEach(child => {
      if (!(child instanceof HTMLElement) || child.matches(SKIP)) return;
      // Leave alone anything that already contains hand-placed reveals or a scrubbed scene.
      if (child.querySelector('[data-reveal], [data-no-reveal]')) return;
      if (child.getBoundingClientRect().top < viewport * 0.98) return;
      if (isGroup(child)) {
        Array.from(child.children).forEach((item, i) => {
          if (item instanceof HTMLElement && !item.matches(SKIP)) tag(item, i);
        });
      } else {
        tag(child, 0);
      }
    });
  });
}

export function initReveal(): void {
  const root = document.documentElement;
  if (!root.classList.contains('motion') || !('IntersectionObserver' in window)) return;

  const viewport = window.innerHeight;
  autoTag(viewport);

  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  const pending: HTMLElement[] = [];

  items.forEach(item => {
    const top = item.getBoundingClientRect().top;
    // Items already on screen play their entrance now. Items further down wait for the scroll.
    if (top < viewport * 0.98) item.classList.add('is-in');
    else pending.push(item);
  });

  root.classList.add('reveal-ready');

  const observer = new IntersectionObserver(
    entries =>
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  pending.forEach(item => observer.observe(item));
}

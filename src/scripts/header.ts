/**
 * Header behaviour for every page. No animation library: the mobile menu entrance is CSS.
 * Safe when parts are missing (it returns early instead of throwing).
 */
export function initHeader(): void {
  const root = document.documentElement;
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  /* ---------- Scroll state: solid background, hide on scroll down, page progress ---------- */
  const progress = header.querySelector<HTMLElement>('[data-progress]');
  let lastY = window.scrollY;
  let queued = false;

  const update = () => {
    queued = false;
    const y = Math.max(0, window.scrollY);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle('is-scrolled', y > 12);
    const locked = root.classList.contains('menu-open') || header.contains(document.activeElement);
    if (!locked) {
      if (y > lastY + 4 && y > 520) header.classList.add('is-hidden');
      else if (y < lastY - 4 || y <= 520) header.classList.remove('is-hidden');
    }
    lastY = y;
    // Progress is per page: the scroll position through the page you are reading.
    progress?.style.setProperty('--progress', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
  };

  window.addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );
  window.addEventListener('resize', update, { passive: true });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  update();

  /* ---------- Sliding pill: rests under the current page, follows hover and focus ---------- */
  const track = header.querySelector<HTMLElement>('[data-nav]');
  const indicator = header.querySelector<HTMLElement>('[data-nav-indicator]');
  const links = Array.from(header.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'));
  const current = links.find(link => link.getAttribute('aria-current') === 'page') ?? null;

  const moveIndicator = (link: HTMLAnchorElement | null, { instant = false } = {}) => {
    if (!track || !indicator) return;
    links.forEach(item => item.classList.toggle('is-hot', item === link));
    if (!link) {
      indicator.style.opacity = '0';
      return;
    }
    const trackBox = track.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    const wasHidden = instant || indicator.style.opacity !== '1';
    if (wasHidden) indicator.style.transition = 'none';
    indicator.style.width = `${linkBox.width}px`;
    indicator.style.transform = `translateX(${linkBox.left - trackBox.left}px)`;
    if (wasHidden) {
      void indicator.offsetWidth;
      indicator.style.transition = '';
    }
    indicator.style.opacity = '1';
  };

  const rest = (options?: { instant?: boolean }) => moveIndicator(current, options);

  links.forEach(link => {
    link.addEventListener('pointerenter', () => moveIndicator(link));
    link.addEventListener('focus', () => moveIndicator(link));
    link.addEventListener('blur', () => rest());
  });
  track?.addEventListener('pointerleave', () => rest());
  rest({ instant: true });
  document.fonts?.ready?.then(() => rest({ instant: true }));
  window.addEventListener('resize', () => rest({ instant: true }), { passive: true });

  /* ---------- Mobile menu ---------- */
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return;
  const inertTargets = ['main', 'footer', '.skip-link'].map(selector => document.querySelector<HTMLElement>(selector));

  const setOpen = (open: boolean, { restoreFocus = false } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.classList.toggle('menu-open', open);
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    inertTargets.forEach(element => {
      if (element) element.inert = open;
    });
    if (open) {
      header.classList.remove('is-hidden');
      menu.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
    } else if (restoreFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('[data-menu-link]').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) setOpen(false, { restoreFocus: true });
  });
  window.matchMedia('(min-width: 1001px)').addEventListener('change', event => {
    if (event.matches && !menu.hidden) setOpen(false);
  });
}

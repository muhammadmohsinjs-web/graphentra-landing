import { gsap } from 'gsap';

export function initHeader(motion: boolean): void {
  const root = document.documentElement;
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  /* ---------- Scroll state: solid background, hide on scroll down, progress bar ---------- */
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
    progress?.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : '0');
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
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  update();

  /* ---------- Sliding pill behind the hovered / focused nav link ---------- */
  const track = header.querySelector<HTMLElement>('[data-nav]');
  const indicator = header.querySelector<HTMLElement>('[data-nav-indicator]');
  const links = Array.from(header.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'));

  const moveIndicator = (link: HTMLAnchorElement | null) => {
    if (!track || !indicator) return;
    links.forEach(item => item.classList.toggle('is-hot', item === link));
    if (!link) {
      indicator.style.opacity = '0';
      return;
    }
    const trackBox = track.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    const wasHidden = indicator.style.opacity !== '1';
    if (wasHidden) indicator.style.transition = 'none';
    indicator.style.width = `${linkBox.width}px`;
    indicator.style.transform = `translateX(${linkBox.left - trackBox.left}px)`;
    if (wasHidden) {
      void indicator.offsetWidth;
      indicator.style.transition = '';
    }
    indicator.style.opacity = '1';
  };

  links.forEach(link => {
    link.addEventListener('pointerenter', () => moveIndicator(link));
    link.addEventListener('focus', () => moveIndicator(link));
    link.addEventListener('blur', () => moveIndicator(null));
  });
  track?.addEventListener('pointerleave', () => moveIndicator(null));

  /* ---------- Scrollspy: mark the section currently in the middle of the viewport ---------- */
  if ('IntersectionObserver' in window) {
    const byId = new Map(links.map(link => [link.hash.slice(1), link]));
    const spy = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const link = byId.get(entry.target.id);
          if (!link) return;
          link.classList.toggle('is-current', entry.isIntersecting);
          if (entry.isIntersecting) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    byId.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

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
      if (motion) {
        gsap.fromTo(
          menu.querySelectorAll('.mobile-links a, .mobile-menu-foot'),
          { yPercent: 60, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.06, ease: 'expo.out', overwrite: true }
        );
      }
    } else if (restoreFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('[data-menu-link]').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) setOpen(false, { restoreFocus: true });
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', event => {
    if (event.matches && !menu.hidden) setOpen(false);
  });
}

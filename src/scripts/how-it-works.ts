/**
 * "How it works": four steps, one console. Selecting a step opens its copy and swaps the console.
 * The steps advance on their own while the section is on screen, until the reader takes over
 * (never with reduced motion). Without JavaScript every step and console is simply shown.
 */
export function initHowItWorks(): void {
  const root = document.querySelector<HTMLElement>('[data-how]');
  if (!root) return;

  const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-step]'));
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-how-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-panel]'));
  if (steps.length === 0 || tabs.length !== panels.length) return;

  // Stagger the entrance of each console's rows.
  panels.forEach(panel => panel.querySelectorAll<HTMLElement>('[data-seq]').forEach((item, k) => item.style.setProperty('--k', String(k))));

  const autoplay = document.documentElement.classList.contains('motion');
  const DURATION = 7000;
  let current = 0;
  let timer = 0;
  let visible = false;
  let taken = false;

  const show = (index: number) => {
    current = index;
    steps.forEach((step, i) => {
      step.classList.toggle('is-active', i === index);
      step.classList.remove('is-timing');
    });
    tabs.forEach((tab, i) => tab.setAttribute('aria-expanded', String(i === index)));
    panels.forEach((panel, i) => panel.classList.toggle('is-active', i === index));
    if (autoplay && !taken && visible) {
      // Restart the progress bar, then schedule the next step.
      void steps[index].offsetWidth;
      steps[index].style.setProperty('--how-dur', `${DURATION}ms`);
      steps[index].classList.add('is-timing');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => show((current + 1) % steps.length), DURATION);
    }
  };

  tabs.forEach((tab, index) =>
    tab.addEventListener('click', () => {
      taken = true;
      window.clearTimeout(timer);
      show(index);
    })
  );

  root.addEventListener('focusin', () => {
    taken = true;
    window.clearTimeout(timer);
    steps.forEach(step => step.classList.remove('is-timing'));
  });

  if (autoplay && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      entries => {
        visible = entries.some(entry => entry.isIntersecting);
        if (visible && !taken) show(current);
        else window.clearTimeout(timer);
      },
      { threshold: 0.4 }
    ).observe(root.querySelector('.how-grid') ?? root);
  }
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Desktop: step copy scrolls, the sticky product window swaps to the matching panel.
 * Mobile / no sticky: each panel sits under its step and plays when it scrolls into view.
 */
export function initHowItWorks(motion: boolean): void {
  const section = document.querySelector<HTMLElement>('[data-how]');
  if (!section) return;

  const copies = Array.from(section.querySelectorAll<HTMLElement>('[data-step-copy]'));
  const panels = Array.from(section.querySelectorAll<HTMLElement>('[data-panel]'));
  const grid = section.querySelector<HTMLElement>('.how-grid');
  const rail = section.querySelector<HTMLElement>('[data-how-progress]');
  const timelines = new Map<HTMLElement, gsap.core.Timeline>();
  let current = -1;

  const resetPanel = (panel: HTMLElement) => {
    const seq = panel.querySelectorAll('[data-seq]');
    const lines = panel.querySelectorAll('[data-line]');
    if (seq.length) gsap.set(seq, { opacity: 0, y: 10 });
    if (lines.length) gsap.set(lines, { scaleX: 0 });
    panel.querySelectorAll('[data-check]').forEach(item => item.classList.remove('is-checked'));
    panel.querySelectorAll('[data-run]').forEach(item => item.classList.remove('is-done'));
  };

  const playPanel = (panel: HTMLElement) => {
    if (!motion) return;
    timelines.get(panel)?.kill();
    resetPanel(panel);
    const seq = panel.querySelectorAll('[data-seq]');
    const lines = panel.querySelectorAll('[data-line]');
    const checks = Array.from(panel.querySelectorAll('[data-check]'));
    const runs = Array.from(panel.querySelectorAll('[data-run]'));
    const approve = panel.querySelector('[data-approve]');
    const tl = gsap.timeline();
    if (seq.length) tl.to(seq, { opacity: 1, y: 0, duration: 0.55, stagger: 0.055, ease: 'power2.out' }, 0.12);
    if (lines.length) tl.to(lines, { scaleX: 1, duration: 0.7, stagger: 0.1, ease: 'power2.inOut' }, 0.35);
    checks.forEach((item, index) => tl.add(() => item.classList.add('is-checked'), 0.65 + index * 0.3));
    if (approve) {
      tl.to(approve, { scale: 1.06, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.75 + checks.length * 0.3);
    }
    runs.forEach((item, index) => tl.add(() => item.classList.add('is-done'), 0.9 + index * 0.55));
    timelines.set(panel, tl);
  };

  const activate = (index: number) => {
    if (index === current) return;
    current = index;
    copies.forEach((copy, i) => copy.classList.toggle('is-active', i === index));
    panels.forEach((panel, i) => panel.classList.toggle('is-active', i === index));
    const panel = panels[index];
    if (panel) playPanel(panel);
  };

  if (motion) panels.forEach(resetPanel);

  const mm = gsap.matchMedia();

  mm.add('(min-width: 1024px)', () => {
    copies.forEach((copy, index) =>
      ScrollTrigger.create({
        trigger: copy,
        // The first step wakes the window up as soon as the section scrolls in.
        start: index === 0 ? 'top 92%' : 'top 58%',
        end: 'bottom 58%',
        onToggle: self => {
          if (self.isActive) activate(index);
        }
      })
    );
    if (grid && rail) {
      ScrollTrigger.create({
        trigger: grid,
        start: 'top 58%',
        end: 'bottom 58%',
        onUpdate: self => rail.style.setProperty('--progress', self.progress.toFixed(4))
      });
    }
    return () => {
      current = -1;
    };
  });

  mm.add('(max-width: 1023.98px)', () => {
    panels.forEach(panel => panel.classList.add('is-active'));
    panels.forEach((panel, index) =>
      ScrollTrigger.create({
        trigger: panel,
        start: 'top 82%',
        once: true,
        onEnter: () => {
          copies[index]?.classList.add('is-active');
          playPanel(panel);
        }
      })
    );
    return () => {
      panels.forEach(panel => panel.classList.remove('is-active'));
      current = -1;
    };
  });
}

import { gsap } from 'gsap';

const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Buttons lean gently toward the pointer. */
export function initMagnetic(): void {
  if (!finePointer()) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(element => {
    const xTo = gsap.quickTo(element, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(element, 'y', { duration: 0.6, ease: 'power3.out' });
    element.addEventListener('pointermove', event => {
      const box = element.getBoundingClientRect();
      xTo((event.clientX - (box.left + box.width / 2)) * 0.2);
      yTo((event.clientY - (box.top + box.height / 2)) * 0.3);
    });
    element.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/** Cards track the pointer with a soft light (CSS reads --mx / --my). */
export function initSpotlight(): void {
  if (!finePointer()) return;
  document.querySelectorAll<HTMLElement>('[data-spot]').forEach(card => {
    card.addEventListener('pointermove', event => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - box.left}px`);
      card.style.setProperty('--my', `${event.clientY - box.top}px`);
    });
  });
}

/** Progressive enhancement for <details>: animate height instead of snapping. */
export function initFaq(motion: boolean): void {
  if (!motion) return;
  document.querySelectorAll<HTMLDetailsElement>('[data-faq]').forEach(item => {
    const summary = item.querySelector('summary');
    const body = item.querySelector<HTMLElement>('[data-faq-body]');
    if (!summary || !body) return;
    let animation: Animation | null = null;

    summary.addEventListener('click', event => {
      event.preventDefault();
      animation?.cancel();
      if (item.open) {
        const height = body.offsetHeight;
        item.classList.add('is-closing');
        animation = body.animate(
          [
            { height: `${height}px`, opacity: 1 },
            { height: '0px', opacity: 0 }
          ],
          { duration: 380, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' }
        );
        animation.onfinish = () => {
          item.open = false;
          item.classList.remove('is-closing');
          animation = null;
        };
      } else {
        item.open = true;
        const height = body.scrollHeight;
        animation = body.animate(
          [
            { height: '0px', opacity: 0 },
            { height: `${height}px`, opacity: 1 }
          ],
          { duration: 560, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
        animation.onfinish = () => {
          animation = null;
        };
      }
    });
  });
}

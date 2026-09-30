// No animation library: this ships on every page that has an FAQ.
/** Progressive enhancement for <details>: animate height instead of snapping. */
export function initFaq(): void {
  if (!document.documentElement.classList.contains('motion')) return;
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

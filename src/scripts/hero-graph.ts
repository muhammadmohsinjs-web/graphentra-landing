/**
 * The hero trace: choosing a row shows the proof path that reaches it. Plain DOM, no animation
 * library. The staged entrance is CSS (see HeroFigure.astro), so this only handles interaction.
 */

interface PathStep {
  label: string;
  at: string;
}

export interface HeroGraph {
  /** Replays the staged entrance. */
  replay(): void;
}

export function initHeroGraph(): HeroGraph | null {
  const figure = document.querySelector<HTMLElement>('[data-hero-figure]');
  if (!figure) return null;

  const buttons = Array.from(figure.querySelectorAll<HTMLButtonElement>('[data-flow-btn]'));
  const reasonEl = figure.querySelector<HTMLElement>('[data-why-reason]');
  const pathEl = figure.querySelector<HTMLElement>('[data-why-path]');
  const testsEl = figure.querySelector<HTMLElement>('[data-why-tests]');

  const renderPath = (steps: PathStep[]) => {
    if (!pathEl) return;
    pathEl.replaceChildren();
    steps.forEach((step, index) => {
      if (index > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'detail-arrow';
        const spoken = document.createElement('span');
        spoken.className = 'sr-only';
        spoken.textContent = 'then';
        arrow.append(spoken);
        pathEl.append(arrow);
      }
      const part = document.createElement('span');
      part.textContent = step.label;
      pathEl.append(part);
    });
  };

  const select = (button: HTMLButtonElement) => {
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    if (reasonEl) reasonEl.textContent = button.dataset.reason ?? '';
    if (testsEl) testsEl.textContent = button.dataset.tests ? `tests: ${button.dataset.tests}` : button.dataset.conf === 'unknown' ? 'cannot be answered: not traced' : 'no test reaches it';
    try {
      renderPath(JSON.parse(button.dataset.path ?? '[]') as PathStep[]);
    } catch {
      /* keep the previous path */
    }
  };

  buttons.forEach(button => button.addEventListener('click', () => select(button)));

  return {
    replay() {
      figure.getAnimations({ subtree: true }).forEach(animation => {
        animation.cancel();
        animation.play();
      });
    }
  };
}

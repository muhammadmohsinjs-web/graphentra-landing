import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

const EASE = 'expo.out';

/** Resolve once web fonts are ready (so line splits are measured correctly), or after a timeout. */
export function fontsReady(timeout = 900): Promise<void> {
  const ready = document.fonts?.ready?.then(() => undefined) ?? Promise.resolve();
  return Promise.race([ready, new Promise<void>(resolve => window.setTimeout(resolve, timeout))]);
}

/** Header, headline lines, supporting copy, then the figure — and the graph starts propagating. */
export function playIntro(onFigureReady: () => void): void {
  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const title = document.querySelector<HTMLElement>('[data-hero-title]');
  const figure = document.querySelector('[data-hero-figure]');
  const supporting = gsap.utils.toArray<HTMLElement>('.hero [data-intro]:not([data-hero-title]):not([data-hero-figure])');

  const tl = gsap.timeline({ defaults: { ease: EASE } });
  let split: SplitText | null = null;

  if (header) tl.from(header, { yPercent: -100, opacity: 0, duration: 1.1, clearProps: 'transform,opacity' }, 0.05);
  if (title) {
    split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    tl.from(split.lines, { yPercent: 118, rotate: 2.5, transformOrigin: '0% 100%', duration: 1.5, stagger: 0.13 }, 0.12);
  }
  tl.from(supporting, { y: 26, opacity: 0, duration: 1.2, stagger: 0.09 }, 0.5);
  if (figure) tl.from(figure, { y: 90, opacity: 0, duration: 1.7, clearProps: 'transform' }, 0.62);
  tl.add(onFigureReady, 1.05);
  // Hand the headline back to normal text flow once it has settled.
  tl.add(() => split?.revert(), '>');

  window.clearTimeout(window.__graphentraIntroFallback);
  root.classList.add('intro-started');
}

/** Everything that animates as it scrolls into view. */
export function initScrollScenes(): void {
  /* Section headlines rise line by line from a mask. */
  gsap.utils.toArray<HTMLElement>('[data-split]').forEach(element => {
    SplitText.create(element, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: self =>
        gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.25,
          stagger: 0.1,
          ease: EASE,
          scrollTrigger: { trigger: element, start: 'top 86%', once: true }
        })
    });
  });

  /* Generic fade-up, batched so neighbours cascade. */
  const reveals = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  gsap.set(reveals, { opacity: 0, y: 34 });
  ScrollTrigger.batch(reveals, {
    start: 'top 90%',
    once: true,
    onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: 0.09, ease: EASE, overwrite: true })
  });

  /* Hairlines draw from the left. */
  gsap.utils.toArray<HTMLElement>('[data-draw]').forEach(line => {
    gsap.from(line, { scaleX: 0, duration: 1.3, ease: EASE, scrollTrigger: { trigger: line, start: 'top 92%', once: true } });
  });

  initReachFigure();
  initPlatform();
  initStatement();
  initRoadmap();
  initFooterMark();
  initMarqueeVelocity();
}

/** Fig. 02: the ticket's declared scope, then the flows it actually reaches (scrubbed). */
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
    scrollTrigger: { trigger: figure, start: 'top 80%', end: 'center 42%', scrub: 0.8 }
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
}

/** Platform: attention bars fill and the planned run log "types" itself out. */
function initPlatform(): void {
  const attention = document.querySelector('[data-attention]');
  if (attention) {
    gsap.from(attention.querySelectorAll('.att-bar i'), {
      scaleX: 0,
      duration: 1.4,
      stagger: 0.12,
      ease: EASE,
      scrollTrigger: { trigger: attention, start: 'top 82%', once: true }
    });
  }

  const terminal = document.querySelector('[data-terminal]');
  if (terminal) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: terminal, start: 'top 82%', once: true } });
    terminal.querySelectorAll('[data-term-line]').forEach((line, index) => {
      const at = index * 0.62;
      tl.from(line, { opacity: 0, duration: 0.2 }, at)
        .fromTo(
          line.querySelector('.t-text'),
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'steps(20)' },
          at
        )
        .from(line.querySelector('.t-result'), { opacity: 0, x: -8, duration: 0.35, ease: 'power2.out' }, at + 0.45);
    });
  }
}

/** Principles: the statement fills in word by word as you read it. */
function initStatement(): void {
  const statement = document.querySelector<HTMLElement>('[data-words]');
  if (!statement) return;
  SplitText.create(statement, {
    type: 'words',
    wordsClass: 'word',
    onSplit: self =>
      gsap.fromTo(
        self.words,
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.12,
          ease: 'none',
          scrollTrigger: { trigger: statement, start: 'top 78%', end: 'bottom 48%', scrub: true }
        }
      )
  });
}

/** Roadmap: progress runs to "now" and a little into "alongside" — never further. */
function initRoadmap(): void {
  const line = document.querySelector<HTMLElement>('[data-roadmap-line]');
  if (!line) return;
  const state = { progress: 0 };
  line.style.setProperty('--progress', '0');
  gsap.to(state, {
    progress: 0.42,
    duration: 1.8,
    ease: 'power3.inOut',
    onUpdate: () => line.style.setProperty('--progress', state.progress.toFixed(4)),
    scrollTrigger: { trigger: line.closest('.stages'), start: 'top 78%', once: true }
  });
  gsap.from('[data-stage]', {
    opacity: 0,
    y: 30,
    duration: 1.1,
    stagger: 0.15,
    ease: EASE,
    scrollTrigger: { trigger: line.closest('.stages'), start: 'top 82%', once: true }
  });
}

/**
 * Footer: the giant wordmark rises letter by letter. No per-letter masks: with the tight
 * tracking they would shave the edges off neighbouring glyphs. The wordmark's own gradient
 * mask already hides letters below its box, so they rise and fade in through it.
 */
function initFooterMark(): void {
  const mark = document.querySelector<HTMLElement>('[data-footer-mark]');
  if (!mark) return;
  SplitText.create(mark, {
    type: 'chars',
    charsClass: 'char',
    aria: 'hidden',
    onSplit: self =>
      gsap.from(self.chars, {
        yPercent: 110,
        duration: 1.4,
        stagger: 0.045,
        ease: EASE,
        scrollTrigger: { trigger: mark, start: 'top 96%', once: true }
      })
  });
}

/** The question marquee speeds up with scroll velocity — and runs backwards when you scroll up. */
function initMarqueeVelocity(): void {
  const track = document.querySelector<HTMLElement>('[data-marquee]');
  const animation = track?.getAnimations()[0];
  if (!track || !animation) return;
  let target = 1;
  let rate = 1;
  ScrollTrigger.create({
    trigger: track,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: self => {
      target = gsap.utils.clamp(-4, 5, 1 + self.getVelocity() / 700);
    }
  });
  gsap.ticker.add(() => {
    target += (1 - target) * 0.04;
    let next = rate + (target - rate) * 0.12;
    // Running backwards into time 0 would "finish" an infinite CSS animation; don't let it.
    if (next < 0 && Number(animation.currentTime ?? 0) < 3000) next = 0.25;
    if (Math.abs(next - rate) < 0.001) return;
    rate = next;
    if (animation.playState === 'finished') animation.play();
    if (typeof animation.updatePlaybackRate === 'function') animation.updatePlaybackRate(rate);
    else animation.playbackRate = rate;
  });
}

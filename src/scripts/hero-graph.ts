import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type FlowKey = 'otp' | 'password' | 'guardian';
type PathKey = FlowKey | 'unknown';

export interface HeroGraph {
  /** Runs the propagation intro, then keeps the ambient loop going while visible. */
  play(): void;
  /** Resets to the "before the change" state and plays again. */
  replay(): void;
}

const FLOWS: FlowKey[] = ['otp', 'password', 'guardian'];

export function initHeroGraph(motion: boolean): HeroGraph | null {
  const graph = document.querySelector<HTMLElement>('[data-graph]');
  if (!graph) return null;
  const graphEl = graph;

  const all = <T extends Element>(selector: string, scope: ParentNode = graphEl) => Array.from(scope.querySelectorAll<T>(selector));
  const buttons = all<HTMLButtonElement>('[data-flow-btn]', document);
  const reasonEl = document.querySelector<HTMLElement>('[data-why-reason]');
  const pathEl = document.querySelector<HTMLElement>('[data-why-path]');
  let selected: FlowKey = (graphEl.dataset.activeFlow as FlowKey) || 'otp';

  /* ---------- Selection (always available, no motion required) ---------- */

  const renderPath = (segments: string[]) => {
    if (!pathEl) return;
    pathEl.replaceChildren();
    segments.forEach((segment, index) => {
      if (index > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'why-arrow';
        const spoken = document.createElement('span');
        spoken.className = 'sr-only';
        spoken.textContent = 'then';
        arrow.append(spoken);
        pathEl.append(arrow);
      }
      const part = document.createElement('span');
      part.textContent = segment;
      pathEl.append(part);
    });
  };

  const select = (flow: FlowKey) => {
    selected = flow;
    graphEl.dataset.activeFlow = flow;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.flowBtn === flow)));
    const button = buttons.find(item => item.dataset.flowBtn === flow);
    if (button) {
      if (reasonEl) reasonEl.textContent = button.dataset.reason ?? '';
      try {
        renderPath(JSON.parse(button.dataset.path ?? '[]'));
      } catch {
        /* keep the previous path */
      }
    }
    if (motion) sendPulse(flow);
  };

  buttons.forEach(button => {
    const flow = button.dataset.flowBtn as FlowKey;
    button.addEventListener('click', () => select(flow));
    button.addEventListener('pointerenter', () => {
      graphEl.dataset.activeFlow = flow;
      if (motion && flow !== selected) sendPulse(flow);
    });
    button.addEventListener('pointerleave', () => {
      graphEl.dataset.activeFlow = selected;
    });
  });

  all<HTMLElement>('[data-select-flow]').forEach(label =>
    label.addEventListener('click', () => select(label.dataset.selectFlow as FlowKey))
  );

  if (!motion) {
    return { play() {}, replay() {} };
  }

  /* ---------- Motion ---------- */

  const activeEdges = all<SVGPathElement>('.edge-active');
  const pulseEdges = all<SVGPathElement>('.edge-pulse');
  const unresolvedEdges = all<SVGPathElement>('.edge-unresolved');
  const ripples = all<SVGCircleElement>('.ripple');
  const reachable = all<SVGGElement>('.node-fn, .node-flow, .node-unknown');
  const changedParts = all<SVGElement>('.node-changed > *');
  const unknownBits = all<Element>('.node-unknown, .g-label-unknown');
  const changedTag = graphEl.querySelector<HTMLElement>('.g-tag');
  const counters = all<HTMLElement>('[data-count]', document);
  const counterTargets = counters.map(counter => Number(counter.textContent) || 0);

  let intro: gsap.core.Timeline | null = null;
  let loop: gsap.core.Timeline | null = null;
  let visible = true;
  let rippleIndex = 0;

  const byHop = <T extends Element>(items: T[], hop: string) => items.filter(item => (item as unknown as HTMLElement).dataset.hop === hop);

  const emitRipple = (strength = 1) => {
    const ring = ripples[rippleIndex++ % ripples.length];
    if (!ring) return;
    gsap.fromTo(
      ring,
      { attr: { r: 14 }, opacity: 0.6 * strength },
      { attr: { r: 380 }, opacity: 0, duration: 3, ease: 'power1.out', overwrite: true }
    );
  };

  const flashEnd = (flow: PathKey) => {
    const end = reachable.find(node => node.dataset.flow === flow && node.dataset.hop === '2');
    const shape = end?.querySelector('.node-shape');
    if (shape) gsap.fromTo(shape, { scale: 1.45 }, { scale: 1, duration: 0.7, ease: 'power3.out', overwrite: true });
  };

  function sendPulse(flow: PathKey) {
    const first = pulseEdges.find(edge => edge.dataset.flow === flow && edge.dataset.hop === '1');
    const second = pulseEdges.find(edge => edge.dataset.flow === flow && edge.dataset.hop === '2');
    if (!first) return;
    const tl = gsap.timeline();
    tl.set(first, { opacity: 1, strokeDashoffset: 0.1 })
      .to(first, { strokeDashoffset: -1.05, duration: 0.7, ease: 'power1.in' })
      .set(first, { opacity: 0 });
    if (second) {
      tl.set(second, { opacity: 1, strokeDashoffset: 0.1 }, 0.62)
        .to(second, { strokeDashoffset: -1.05, duration: 0.75, ease: 'power1.out' }, 0.62)
        .set(second, { opacity: 0 });
    }
    tl.add(() => flashEnd(flow), second ? 1.3 : 0.7);
  }

  const setCounters = (progress: number) => {
    counters.forEach((counter, index) => {
      counter.textContent = String(Math.round((counterTargets[index] ?? 0) * progress));
    });
  };

  const light = (nodes: SVGGElement[]) => {
    nodes.forEach(node => {
      node.classList.add('is-lit');
      const shape = node.querySelector('.node-shape');
      if (shape) gsap.fromTo(shape, { scale: 1.7 }, { scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.55)' });
    });
  };

  const resetToStart = () => {
    loop?.kill();
    loop = null;
    intro?.kill();
    gsap.set(activeEdges, { strokeDashoffset: 1 });
    gsap.set(pulseEdges, { opacity: 0 });
    gsap.set(unresolvedEdges, { opacity: 0 });
    gsap.set(unknownBits, { opacity: 0 });
    gsap.set(changedParts, { scale: 0, transformOrigin: '50% 50%' });
    if (changedTag) gsap.set(changedTag, { opacity: 0, scale: 0.6 });
    reachable.forEach(node => node.classList.remove('is-lit'));
    setCounters(0);
  };

  const startLoop = () => {
    loop?.kill();
    loop = gsap.timeline({ repeat: -1, paused: !visible });
    loop.add(() => emitRipple(0.6), 0);
    FLOWS.forEach((flow, index) => loop!.add(() => sendPulse(flow), 0.25 + index * 1.35));
    loop.add(() => sendPulse('unknown'), 4.3);
    loop.to({}, { duration: 5.6 }, 0);
  };

  const buildIntro = () => {
    const hop1Edges = byHop(activeEdges, '1');
    const hop2Edges = byHop(activeEdges, '2');
    const hop1Nodes = byHop(reachable, '1').filter(node => !node.classList.contains('node-unknown'));
    const hop2Nodes = byHop(reachable, '2').filter(node => !node.classList.contains('node-unknown'));
    const counterProxy = { value: 0 };

    const tl = gsap.timeline({ paused: true });
    tl.to(changedParts, { scale: 1, duration: 0.9, ease: 'back.out(2.4)', stagger: { each: 0.06, from: 'end' } }, 0)
      .add(() => emitRipple(1), 0.15)
      .to(changedTag, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(3)' }, 0.35)
      .to(hop1Edges, { strokeDashoffset: 0, duration: 0.75, ease: 'power2.inOut', stagger: 0.08 }, 0.4)
      .add(() => light(hop1Nodes), 1)
      .add(() => emitRipple(0.7), 1)
      .to(hop2Edges, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut', stagger: 0.08 }, 1.1)
      .to(unresolvedEdges, { opacity: 1, duration: 0.6, ease: 'power1.out' }, 1.25)
      .add(() => light(hop2Nodes), 1.75)
      .to(unknownBits, { opacity: 1, duration: 0.5 }, 1.8)
      .to(counterProxy, { value: 1, duration: 1.1, ease: 'power2.out', onUpdate: () => setCounters(counterProxy.value) }, 1.3)
      .add(startLoop, 2.4);
    return tl;
  };

  resetToStart();

  /* Pause the ambient loop while the figure is off-screen. */
  ScrollTrigger.create({
    trigger: graphEl,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: self => {
      visible = self.isActive;
      if (!loop) return;
      if (visible) loop.resume();
      else loop.pause();
    }
  });

  /* Subtle depth: the stage and the rings drift in opposite directions with the pointer. */
  const stage = graphEl.querySelector<HTMLElement>('[data-graph-stage]');
  const rings = graphEl.querySelector<SVGSVGElement>('[data-graph-rings]');
  if (stage && rings && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const tween = { duration: 1.1, ease: 'power3.out' };
    const stageX = gsap.quickTo(stage, 'x', tween);
    const stageY = gsap.quickTo(stage, 'y', tween);
    const ringsX = gsap.quickTo(rings, 'x', tween);
    const ringsY = gsap.quickTo(rings, 'y', tween);
    graphEl.addEventListener('pointermove', event => {
      const box = graphEl.getBoundingClientRect();
      const dx = (event.clientX - box.left) / box.width - 0.5;
      const dy = (event.clientY - box.top) / box.height - 0.5;
      stageX(dx * 10);
      stageY(dy * 8);
      ringsX(dx * -6);
      ringsY(dy * -5);
    });
    graphEl.addEventListener('pointerleave', () => {
      stageX(0);
      stageY(0);
      ringsX(0);
      ringsY(0);
    });
  }

  return {
    play() {
      intro = buildIntro();
      intro.play(0);
    },
    replay() {
      resetToStart();
      intro = buildIntro();
      intro.play(0);
    }
  };
}

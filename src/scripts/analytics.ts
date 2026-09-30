export type AnalyticsEventName =
  | 'early_access_section_viewed'
  | 'early_access_form_started'
  | 'early_access_form_submitted'
  | 'early_access_form_failed'
  | 'discuss_pilot_clicked'
  | 'cta_clicked';

/** `cta_clicked` is the only event with properties, and they are exactly these two. Never form data. */
export interface CtaParams {
  location: string;
  page: string;
}

const analyticsEventNames = new Set<AnalyticsEventName>([
  'early_access_section_viewed',
  'early_access_form_started',
  'early_access_form_submitted',
  'early_access_form_failed',
  'discuss_pilot_clicked',
  'cta_clicked'
]);

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
    dataLayer?: unknown[];
    __graphentraIntroFallback?: number;
  }
}

/**
 * Sends one of the known event names to whichever analytics tool is present, and always
 * dispatches `graphentra:analytics` for a future first-party adapter. Never includes form data.
 * Provider-agnostic: gtag, then Plausible, then a dataLayer. No tracker is loaded by this site.
 */
export function trackEvent(name: AnalyticsEventName, params?: CtaParams): void {
  if (!analyticsEventNames.has(name)) return;
  try {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
    else if (typeof window.plausible === 'function') window.plausible(name, params ? { props: { ...params } } : undefined);
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name, ...params });
    window.dispatchEvent(new CustomEvent('graphentra:analytics', { detail: { event: name, ...params } }));
  } catch (error) {
    console.warn('Graphentra analytics event could not be recorded.', {
      event: name,
      reason: error instanceof Error ? error.name : undefined
    });
  }
}

/** Fires once when at least 30% of the section, or 30% of the viewport, shows the section. */
export function observeEarlyAccessSection(): void {
  const section = document.getElementById('early-access');
  if (!section || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(
    entries => {
      const seen = entries.some(
        entry => entry.isIntersecting && (entry.intersectionRatio >= 0.3 || entry.intersectionRect.height >= window.innerHeight * 0.3)
      );
      if (!seen) return;
      trackEvent('early_access_section_viewed');
      observer.disconnect();
    },
    { threshold: [0, 0.1, 0.2, 0.3] }
  );
  observer.observe(section);
}

const isEarlyAccessLink = (link: HTMLAnchorElement): boolean => {
  const href = link.getAttribute('href') ?? '';
  return href === '#early-access' || href.endsWith('#early-access');
};

/**
 * Every link to the early-access form reports `cta_clicked` with where it sat (the nearest
 * `data-cta-location`, else "page") and which page it was on. One delegated listener.
 */
export function initCtaTracking(): void {
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!target || !isEarlyAccessLink(target)) return;
    const location = target.closest<HTMLElement>('[data-cta-location]')?.dataset.ctaLocation ?? 'page';
    trackEvent('cta_clicked', { location, page: window.location.pathname });
  });
}

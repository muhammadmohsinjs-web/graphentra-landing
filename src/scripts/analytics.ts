export type AnalyticsEventName =
  | 'early_access_section_viewed'
  | 'early_access_form_started'
  | 'early_access_form_submitted'
  | 'early_access_form_failed'
  | 'discuss_pilot_clicked';

const analyticsEventNames = new Set<AnalyticsEventName>([
  'early_access_section_viewed',
  'early_access_form_started',
  'early_access_form_submitted',
  'early_access_form_failed',
  'discuss_pilot_clicked'
]);

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string) => void;
    dataLayer?: unknown[];
    __graphentraIntroFallback?: number;
  }
}

/**
 * Sends one of the known event names to whichever analytics tool is present, and always
 * dispatches `graphentra:analytics` for a future first-party adapter. Never includes form data.
 */
export function trackEvent(name: AnalyticsEventName): void {
  if (!analyticsEventNames.has(name)) return;
  try {
    if (typeof window.gtag === 'function') window.gtag('event', name);
    else if (typeof window.plausible === 'function') window.plausible(name);
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name });
    window.dispatchEvent(new CustomEvent('graphentra:analytics', { detail: { event: name } }));
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

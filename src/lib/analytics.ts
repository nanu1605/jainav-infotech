// Umami custom events sent from code (spec §17). cta_click, chip_click and download are
// data-umami-event attributes in the markup instead.
type AnalyticsEvent = 'form_submit' | 'language_switch' | 'theme_switch'

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, string>) => void }
  }
}

/** Sends an Umami event. Does nothing while the script is absent (off, blocked or not loaded). */
export function track(event: AnalyticsEvent, data?: Record<string, string>) {
  try {
    window.umami?.track(event, data)
  } catch {
    // Analytics never breaks the page.
  }
}

import { defineRouting } from 'next-intl/routing'

// Spec §4.4: English unprefixed, Hindi under /hi, never redirect on cookie or browser language.
export const routing = defineRouting({
  locales: ['en', 'hi'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false,
  localeCookie: false,
  // hreflang is emitted per page from hiStatus (Phase 3), not for every route.
  alternateLinks: false,
})

export type Locale = (typeof routing.locales)[number]

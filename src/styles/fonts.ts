import { Mukta, Plus_Jakarta_Sans } from 'next/font/google'

// Placeholders until the brand kit (spec §5.4).
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
})

// Not preloaded: four weights are ~260 KB that every English page fetched ahead of its CSS and
// scripts (spec §15 LCP). Its unicode-range loads only the weights a page's Devanagari text uses.
const mukta = Mukta({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-mukta',
  preload: false,
})

export const fontVariables = `${jakarta.variable} ${mukta.variable}`

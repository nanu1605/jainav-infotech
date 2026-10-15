import { Mukta, Plus_Jakarta_Sans } from 'next/font/google'

// Placeholders until the brand kit (spec §5.4).
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
})

const mukta = Mukta({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-mukta',
})

export const fontVariables = `${jakarta.variable} ${mukta.variable}`

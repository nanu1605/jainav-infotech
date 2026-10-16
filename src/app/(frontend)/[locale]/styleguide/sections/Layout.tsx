import { useLocale } from 'next-intl'
import type { ReactNode } from 'react'

import { Container } from '@/components/layout/Container'
import { Grid } from '@/components/layout/Grid'
import { Section } from '@/components/layout/Section'
import { Stack } from '@/components/layout/Stack'

// Sample content (stands in for CMS data), not UI chrome.
const COPY = {
  en: {
    container: {
      title: 'Container',
      note: 'Centred column with side gutters. Panels here are narrower than every size, so each one fills it.',
      sizes: { prose: 'Prose · 48rem', default: 'Default · 80rem', wide: 'Wide · 96rem' },
    },
    section: {
      title: 'Section',
      note: 'Vertical rhythm, optional subtle tone, and an eyebrow / title / intro header at the right heading level.',
      eyebrow: 'Services',
      heading: 'Software built around how your business already works',
      intro:
        'From a restaurant ordering system to an AI assistant that runs on your own PC, we design, build and support it end to end.',
      centredEyebrow: 'Why Jainav',
      centredHeading: 'We ship our own products',
      centredIntro:
        'MenuMesh, VYRO and Baby are used every day, so we know what it takes to run software.',
      principles: ['Privacy by default', 'Fast, light software', 'Built in Indore, for the world'],
      bare: 'A section without a header: only the rhythm and the container.',
    },
    pillars: [
      ['Custom software & SaaS', 'Web apps, SaaS platforms, mobile and desktop apps.'],
      ['AI & ML solutions', 'LLM apps and assistants, search and RAG, automation, forecasting.'],
      ['Cloud & DevOps', 'CI/CD, containers, cloud setup, monitoring and cost tuning.'],
      [
        'E-commerce & web platforms',
        'Online stores, marketplaces, portals and fast marketing sites.',
      ],
    ],
    grid: {
      title: 'Grid',
      note: 'One column on phones; 2 from small screens; 3 or 4 from large screens.',
    },
    stack: {
      title: 'Stack',
      note: 'Direction, gap and alignment. Rows wrap, so longer Hindi labels never overflow.',
      chips: [
        'My restaurant → MenuMesh',
        'My PC → VYRO',
        'A private assistant → Baby',
        'Custom software → Services',
      ],
      col: 'Column · gap md',
      row: 'Row · align center · gap sm',
      baseline: 'Row · align baseline',
      stat: '3 products',
      statNote: 'built and run in Indore',
    },
  },
  hi: {
    container: {
      title: 'कंटेनर',
      note: 'किनारों पर जगह के साथ बीच में रखा कॉलम। यहाँ के पैनल हर साइज़ से छोटे हैं, इसलिए हर कंटेनर पूरी चौड़ाई लेता है।',
      sizes: { prose: 'प्रोज़ · 48rem', default: 'डिफ़ॉल्ट · 80rem', wide: 'चौड़ा · 96rem' },
    },
    section: {
      title: 'सेक्शन',
      note: 'ऊपर-नीचे की एक जैसी जगह, हल्का बैकग्राउंड (वैकल्पिक), और सही हेडिंग लेवल के साथ आईब्रो / शीर्षक / परिचय।',
      eyebrow: 'सेवाएँ',
      heading: 'ऐसा सॉफ़्टवेयर जो आपके व्यवसाय के मौजूदा काम करने के तरीक़े के हिसाब से बने',
      intro:
        'रेस्टोरेंट के ऑर्डर सिस्टम से लेकर आपके अपने कंप्यूटर पर चलने वाले AI असिस्टेंट तक, हम शुरुआत से अंत तक डिज़ाइन करते हैं, बनाते हैं और सपोर्ट करते हैं।',
      centredEyebrow: 'Jainav क्यों',
      centredHeading: 'हम अपने ख़ुद के प्रोडक्ट बनाते और चलाते हैं',
      centredIntro:
        'MenuMesh, VYRO और Baby रोज़ इस्तेमाल होते हैं, इसलिए हम जानते हैं कि सॉफ़्टवेयर चलाने में क्या लगता है।',
      principles: [
        'डिफ़ॉल्ट रूप से निजता',
        'तेज़ और हल्का सॉफ़्टवेयर',
        'इंदौर में बना, दुनिया के लिए',
      ],
      bare: 'बिना हेडर वाला सेक्शन: सिर्फ़ जगह और कंटेनर।',
    },
    pillars: [
      ['कस्टम सॉफ़्टवेयर और SaaS', 'वेब ऐप, SaaS प्लेटफ़ॉर्म, मोबाइल और डेस्कटॉप ऐप।'],
      ['AI और ML समाधान', 'LLM ऐप और असिस्टेंट, सर्च और RAG, ऑटोमेशन, पूर्वानुमान।'],
      ['क्लाउड और DevOps', 'CI/CD, कंटेनर, क्लाउड सेटअप, मॉनिटरिंग और ख़र्च में कटौती।'],
      [
        'ई-कॉमर्स और वेब प्लेटफ़ॉर्म',
        'ऑनलाइन स्टोर, मार्केटप्लेस, पोर्टल और तेज़ मार्केटिंग वेबसाइटें।',
      ],
    ],
    grid: { title: 'ग्रिड', note: 'फ़ोन पर एक कॉलम; छोटी स्क्रीन से 2; बड़ी स्क्रीन से 3 या 4।' },
    stack: {
      title: 'स्टैक',
      note: 'दिशा, दूरी और अलाइनमेंट। पंक्तियाँ अगली लाइन में चली जाती हैं, इसलिए लंबे हिंदी लेबल बाहर नहीं निकलते।',
      chips: [
        'मेरा रेस्टोरेंट → MenuMesh',
        'मेरा PC → VYRO',
        'एक निजी असिस्टेंट → Baby',
        'कस्टम सॉफ़्टवेयर → सेवाएँ',
      ],
      col: 'कॉलम · दूरी md',
      row: 'पंक्ति · बीच में · दूरी sm',
      baseline: 'पंक्ति · बेसलाइन पर',
      stat: '3 प्रोडक्ट',
      statNote: 'इंदौर में बने और यहीं से चलाए जाते हैं',
    },
  },
}

function Demo({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-fg">{title}</h3>
        <p className="mt-1 text-sm text-fg-muted">{note}</p>
      </div>
      {children}
    </div>
  )
}

const tile = 'rounded-lg border border-border bg-surface p-4 text-sm text-fg-muted'

export default function LayoutSection() {
  const c = COPY[useLocale() === 'hi' ? 'hi' : 'en']

  return (
    <div className="space-y-12">
      <Demo title={c.container.title} note={c.container.note}>
        <div className="space-y-2 rounded-lg border border-dashed border-border-strong py-2">
          {(['prose', 'default', 'wide'] as const).map((size) => (
            <Container key={size} size={size}>
              <div className="rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-fg">
                {c.container.sizes[size]}
              </div>
            </Container>
          ))}
        </div>
      </Demo>

      <Demo title={c.section.title} note={c.section.note}>
        <div className="space-y-4">
          <Section
            tone="subtle"
            level={3}
            eyebrow={c.section.eyebrow}
            title={c.section.heading}
            intro={c.section.intro}
            className="rounded-lg border border-border py-10 sm:py-12"
          >
            <Grid cols={2} className="gap-4 lg:gap-4">
              {c.pillars.map(([name, text]) => (
                <div key={name} className={tile}>
                  <p className="font-medium text-fg">{name}</p>
                  <p className="mt-1">{text}</p>
                </div>
              ))}
            </Grid>
          </Section>
          <Section
            level={3}
            align="center"
            eyebrow={c.section.centredEyebrow}
            title={c.section.centredHeading}
            intro={c.section.centredIntro}
            className="rounded-lg border border-border py-10 sm:py-12"
          >
            <Stack direction="row" gap="sm" className="justify-center">
              {c.section.principles.map((principle) => (
                <span
                  key={principle}
                  className="rounded-full border border-border bg-bg-subtle px-3 py-1.5 text-sm text-fg"
                >
                  {principle}
                </span>
              ))}
            </Stack>
          </Section>
          <Section className="rounded-lg border border-dashed border-border-strong py-8 sm:py-8">
            <p className="text-sm text-fg-muted">{c.section.bare}</p>
          </Section>
        </div>
      </Demo>

      <Demo title={c.grid.title} note={c.grid.note}>
        {([2, 3, 4] as const).map((cols) => (
          <Grid key={cols} cols={cols} className="gap-3 lg:gap-3">
            {c.pillars.slice(0, cols).map(([name]) => (
              <div key={name} className={tile}>
                <span className="font-medium text-fg">{cols}</span> · {name}
              </div>
            ))}
          </Grid>
        ))}
      </Demo>

      <Demo title={c.stack.title} note={c.stack.note}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={tile}>
            <p className="mb-3 font-medium text-fg">{c.stack.col}</p>
            <Stack>
              {c.pillars.slice(0, 3).map(([name]) => (
                <div key={name} className="rounded-md bg-bg-subtle px-3 py-2 text-fg">
                  {name}
                </div>
              ))}
            </Stack>
          </div>
          <div className={tile}>
            <p className="mb-3 font-medium text-fg">{c.stack.row}</p>
            <Stack direction="row" gap="sm" align="center">
              {c.stack.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-border bg-bg px-3 py-1.5 text-sm text-fg"
                >
                  {chip}
                </span>
              ))}
            </Stack>
          </div>
        </div>
        <div className={tile}>
          <p className="mb-3 font-medium text-fg">{c.stack.baseline}</p>
          <Stack direction="row" gap="sm" align="baseline">
            <span className="font-display text-4xl leading-snug font-bold text-fg">
              {c.stack.stat}
            </span>
            <span className="text-fg-muted">{c.stack.statNote}</span>
          </Stack>
        </div>
      </Demo>
    </div>
  )
}

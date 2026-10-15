import { ArrowRight } from 'lucide-react'
import { useLocale } from 'next-intl'
import type { ReactNode } from 'react'

import { CountUp } from '@/components/motion/CountUp'
import { MagneticButton } from '@/components/motion/MagneticButton'
import { Parallax } from '@/components/motion/Parallax'
import { Reveal } from '@/components/motion/Reveal'
import { Spotlight } from '@/components/motion/Spotlight'
import { Stagger, StaggerItem } from '@/components/motion/Stagger'
import { TextReveal } from '@/components/motion/TextReveal'
import { Tilt } from '@/components/motion/Tilt'
import { Marquee } from '@/components/ui/Marquee'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

// Sample content, like CMS data. Numbers are illustrative only.
const copy = {
  note: {
    en: 'Reveals play once, when content scrolls in from below; reload at the top of the page to replay. Pointer effects need a mouse. With reduced motion everything is static.',
    hi: 'रिवील एक बार चलते हैं, जब कंटेंट नीचे से स्क्रॉल होकर आता है; दोबारा देखने के लिए पेज के ऊपर से रीलोड करें। पॉइंटर इफ़ेक्ट के लिए माउस चाहिए। रिड्यूस्ड मोशन में सब कुछ स्थिर रहता है।',
  },
  headline: {
    en: 'Software we build, and software we build for you.',
    hi: 'सॉफ़्टवेयर जो हम बनाते हैं, और जो हम आपके लिए बनाते हैं।',
  },
  longHeadline: {
    en: 'QR table ordering for restaurants, a full picture of your PC and a private voice assistant — all built in Indore.',
    hi: 'रेस्टोरेंट के लिए QR टेबल ऑर्डरिंग, आपके PC की पूरी जानकारी और एक निजी वॉइस असिस्टेंट — सब कुछ इंदौर में बना।',
  },
  reveal: [
    {
      en: 'Privacy by default: what can stay on your device, stays there.',
      hi: 'प्राइवेसी सबसे पहले: जो आपके डिवाइस पर रह सकता है, वह वहीं रहता है।',
    },
    {
      en: 'Fast, light software that respects your machine.',
      hi: 'तेज़ और हल्का सॉफ़्टवेयर, जो आपकी मशीन का ख़याल रखता है।',
    },
  ],
  services: [
    {
      en: 'Custom software & SaaS',
      hi: 'कस्टम सॉफ़्टवेयर और SaaS',
      body: {
        en: 'Web apps, SaaS platforms, mobile and desktop apps.',
        hi: 'वेब ऐप, SaaS प्लेटफ़ॉर्म, मोबाइल और डेस्कटॉप ऐप।',
      },
    },
    {
      en: 'AI & ML solutions',
      hi: 'AI और ML समाधान',
      body: {
        en: 'LLM assistants, search and RAG, automation, forecasting.',
        hi: 'LLM असिस्टेंट, सर्च और RAG, ऑटोमेशन और पूर्वानुमान।',
      },
    },
    {
      en: 'Cloud & DevOps',
      hi: 'क्लाउड और DevOps',
      body: {
        en: 'CI/CD, containers, cloud setup, monitoring, cost tuning.',
        hi: 'CI/CD, कंटेनर, क्लाउड सेटअप, मॉनिटरिंग और ख़र्च में बचत।',
      },
    },
    {
      en: 'E-commerce & web platforms',
      hi: 'ई-कॉमर्स और वेब प्लेटफ़ॉर्म',
      body: {
        en: 'Online stores, marketplaces, portals, fast marketing sites.',
        hi: 'ऑनलाइन स्टोर, मार्केटप्लेस, पोर्टल और तेज़ मार्केटिंग साइट।',
      },
    },
  ],
  stats: [
    {
      value: 100000,
      format: { style: 'currency', currency: 'INR', maximumFractionDigits: 0 },
      en: 'Sample project budget',
      hi: 'नमूना प्रोजेक्ट बजट',
    },
    { value: 12500, en: 'Downloads (sample)', hi: 'डाउनलोड (नमूना)' },
    {
      value: 0.999,
      format: { style: 'percent', maximumFractionDigits: 1 },
      en: 'Uptime (sample)',
      hi: 'अपटाइम (नमूना)',
    },
    {
      value: 250000,
      format: { notation: 'compact' },
      en: 'Orders served (sample)',
      hi: 'परोसे गए ऑर्डर (नमूना)',
    },
  ] satisfies { value: number; format?: Intl.NumberFormatOptions; en: string; hi: string }[],
  tilt: {
    en: 'Know your machine. Live temperatures, fan speeds and clocks.',
    hi: 'अपनी मशीन को जानिए। लाइव तापमान, फ़ैन स्पीड और क्लॉक स्पीड।',
  },
  spotlight: {
    en: 'Talk to your PC in English, Hindi or Hinglish. The wake word and speech recognition run on your computer.',
    hi: 'अपने PC से अंग्रेज़ी, हिंदी या हिंग्लिश में बात करें। वेक वर्ड और स्पीच रिकग्निशन आपके कंप्यूटर पर ही चलते हैं।',
  },
  buttons: {
    start: { en: 'Start a project', hi: 'प्रोजेक्ट शुरू करें' },
    explore: { en: 'Explore products', hi: 'प्रोडक्ट देखें' },
    buy: { en: 'Buy Pro — available soon', hi: 'Pro ख़रीदें — जल्द उपलब्ध' },
    talk: { en: 'Talk to us', hi: 'हमसे बात करें' },
  },
  stack: [
    'Rust',
    'Tauri',
    'Next.js',
    'Payload',
    'PostgreSQL',
    'TypeScript',
    'Docker',
    'Cloudflare',
  ],
  features: [
    { en: 'Table QR ordering', hi: 'टेबल QR ऑर्डरिंग' },
    { en: 'Animated CPU and GPU gauges', hi: 'एनिमेटेड CPU और GPU गेज' },
    { en: 'On-device speech recognition', hi: 'डिवाइस पर ही स्पीच रिकग्निशन' },
    { en: 'Per-table bills and printed receipts', hi: 'हर टेबल का बिल और प्रिंटेड रसीद' },
    { en: 'English, Hindi and Hinglish', hi: 'अंग्रेज़ी, हिंदी और हिंग्लिश' },
  ],
}

function Demo({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-3">
      <p className="text-xs font-medium text-fg-muted">{name}</p>
      {children}
    </div>
  )
}

export default function MotionSection() {
  const locale = useLocale() as Locale

  return (
    <div className="space-y-10">
      <p className="max-w-prose text-sm text-fg-muted">{copy.note[locale]}</p>

      <Demo name="TextReveal">
        <TextReveal
          as="h3"
          text={copy.headline[locale]}
          className="font-display text-3xl font-bold text-balance text-fg"
        />
        <TextReveal
          as="p"
          text={copy.longHeadline[locale]}
          className="max-w-prose text-lg text-fg-muted"
        />
      </Demo>

      <Demo name="Reveal · delay">
        <div className="grid gap-3 sm:grid-cols-2">
          {copy.reveal.map((text, i) => (
            <Reveal
              key={text.en}
              delay={i * 0.15}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <p className="text-fg">{text[locale]}</p>
            </Reveal>
          ))}
        </div>
      </Demo>

      <Demo name="Stagger · StaggerItem">
        <Stagger as="ul" className="grid gap-3 sm:grid-cols-2">
          {copy.services.map((service) => (
            <StaggerItem
              as="li"
              key={service.en}
              className="rounded-lg border border-border bg-surface p-5"
            >
              <p className="font-display font-semibold text-fg">{service[locale]}</p>
              <p className="mt-1 text-sm text-fg-muted">{service.body[locale]}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Demo>

      <Demo name="CountUp">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {copy.stats.map((stat) => (
            <div key={stat.en} className="flex flex-col-reverse gap-1">
              <dt className="text-sm text-fg-muted">{stat[locale]}</dt>
              <dd className="font-display text-2xl font-bold text-fg sm:text-3xl">
                <CountUp value={stat.value} format={'format' in stat ? stat.format : undefined} />
              </dd>
            </div>
          ))}
        </dl>
      </Demo>

      <Demo name="Parallax">
        <div className="relative h-48 overflow-hidden rounded-lg border border-border bg-bg-subtle">
          <Parallax
            offset={24}
            className="absolute top-8 left-[12%] size-28 rounded-full bg-(image:--gradient-1) opacity-60 blur-xl"
          />
          <Parallax
            offset={56}
            className="absolute top-10 right-[14%] size-24 rounded-xl border border-border bg-surface shadow-lg"
          />
          <Parallax
            offset={12}
            className="absolute bottom-6 left-1/3 size-16 rounded-lg bg-brand-accent/30"
          />
        </div>
      </Demo>

      <div className="grid gap-6 sm:grid-cols-2">
        <Demo name="Tilt">
          <Tilt>
            <div className="rounded-lg border border-border bg-surface p-6 shadow-md">
              <p className="font-display text-xl font-semibold text-fg">VYRO</p>
              <p className="mt-2 text-fg-muted">{copy.tilt[locale]}</p>
            </div>
          </Tilt>
        </Demo>
        <Demo name="Spotlight">
          <Spotlight className="rounded-lg border border-border bg-surface p-6">
            <p className="font-display text-xl font-semibold text-fg">Baby</p>
            <p className="mt-2 text-fg-muted">{copy.spotlight[locale]}</p>
          </Spotlight>
        </Demo>
      </div>

      <Demo name="MagneticButton">
        <div className="flex flex-wrap items-center gap-3">
          <MagneticButton size="lg">
            {copy.buttons.start[locale]}
            <ArrowRight aria-hidden />
          </MagneticButton>
          <MagneticButton variant="secondary" size="lg">
            {copy.buttons.explore[locale]}
          </MagneticButton>
          <MagneticButton asChild variant="ghost">
            <Link href="/contact">{copy.buttons.talk[locale]}</Link>
          </MagneticButton>
          <MagneticButton disabled>{copy.buttons.buy[locale]}</MagneticButton>
        </div>
      </Demo>

      <Demo name="Marquee · reverse · pauseOnHover={false}">
        <div className="space-y-4">
          <Marquee speedSeconds={30}>
            {copy.stack.map((name) => (
              <span
                key={name}
                className="font-display text-xl font-semibold whitespace-nowrap text-fg-muted"
              >
                {name}
              </span>
            ))}
          </Marquee>
          <Marquee reverse pauseOnHover={false} speedSeconds={50}>
            {copy.features.map((feature) => (
              <span
                key={feature.en}
                className="rounded-full border border-border bg-surface px-4 py-2 text-sm whitespace-nowrap text-fg"
              >
                {feature[locale]}
              </span>
            ))}
          </Marquee>
        </div>
      </Demo>
    </div>
  )
}

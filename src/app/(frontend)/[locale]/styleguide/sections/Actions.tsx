import {
  ArrowRight,
  ArrowUpRight,
  Copy,
  Download,
  Info,
  Menu,
  Search,
  Share2,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useLocale } from 'next-intl'
import type { ReactNode } from 'react'

import { Badge, PlatformBadge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Spinner } from '@/components/ui/Spinner'
import { Tooltip } from '@/components/ui/Tooltip'
import { Link } from '@/i18n/navigation'

type Text = { en: string; hi: string }

// Sample content (like CMS data), so it lives here rather than in the messages files.
const COPY = {
  variants: { en: 'Button: variants', hi: 'Button: वैरिएंट' },
  sizes: { en: 'Button: sizes', hi: 'Button: साइज़' },
  states: { en: 'Button: states', hi: 'Button: स्थितियाँ' },
  links: { en: 'Button as a link', hi: 'लिंक के रूप में Button' },
  iconButtons: { en: 'IconButton', hi: 'IconButton' },
  badges: { en: 'Badge: tones and sizes', hi: 'Badge: रंग और साइज़' },
  status: { en: 'StatusBadge and PlatformBadge', hi: 'StatusBadge और PlatformBadge' },
  tooltips: { en: 'Tooltip (hover or keyboard focus)', hi: 'Tooltip (होवर या कीबोर्ड फ़ोकस)' },
  explore: { en: 'Explore products', hi: 'प्रोडक्ट देखें' },
  build: { en: 'Build with us', hi: 'हमारे साथ बनाएँ' },
  start: { en: 'Start a project', hi: 'प्रोजेक्ट शुरू करें' },
  docs: { en: 'Read the docs', hi: 'डॉक्स पढ़ें' },
  download: { en: 'Download free', hi: 'मुफ़्त डाउनलोड करें' },
  downloadWindows: { en: 'Download for Windows', hi: 'Windows के लिए डाउनलोड करें' },
  version: { en: 'Version 1.4.0 · 8.2 MB', hi: 'वर्शन 1.4.0 · 8.2 MB' },
  downloading: { en: 'Downloading…', hi: 'डाउनलोड हो रहा है…' },
  buy: { en: 'Buy VYRO Pro', hi: 'VYRO Pro ख़रीदें' },
  soon: { en: 'Available soon', hi: 'जल्द उपलब्ध' },
  waitlist: { en: 'Join the waitlist', hi: 'वेटलिस्ट में शामिल हों' },
  visit: { en: 'Visit MenuMesh', hi: 'MenuMesh पर जाएँ' },
  demo: { en: 'Book a demo', hi: 'डेमो बुक करें' },
  talk: { en: 'Talk to us', hi: 'हमसे बात करें' },
  menu: { en: 'Open menu', hi: 'मेन्यू खोलें' },
  search: { en: 'Search', hi: 'खोजें' },
  share: { en: 'Share', hi: 'शेयर करें' },
  close: { en: 'Close', hi: 'बंद करें' },
  copySha: { en: 'Copy SHA-256 checksum', hi: 'SHA-256 चेकसम कॉपी करें' },
  plans: { en: 'Free and Pro plans', hi: 'Free और Pro प्लान' },
  plansHint: {
    en: 'VYRO comes in Free and Pro. The feature split and prices will be announced before launch.',
    hi: 'VYRO के दो प्लान हैं: Free और Pro। किस प्लान में क्या मिलेगा और क़ीमतें, लॉन्च से पहले बताई जाएँगी।',
  },
  rust: { en: 'Rust + Tauri', hi: 'Rust + Tauri' },
  new: { en: 'New', hi: 'नया' },
  featured: { en: 'Featured', hi: 'फ़ीचर्ड' },
  normal: { en: 'All systems normal', hi: 'सब कुछ सामान्य है' },
  price: { en: 'Price to be decided', hi: 'क़ीमत अभी तय नहीं' },
  eol: { en: 'Support ended', hi: 'सपोर्ट बंद हो गया' },
  betaChannel: { en: 'Beta channel', hi: 'बीटा चैनल' },
  onDevice: { en: 'Runs on your device', hi: 'आपके डिवाइस पर चलता है' },
} satisfies Record<string, Text>

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-fg-muted">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export default function ActionsSection() {
  const locale = useLocale()
  const c = (text: Text) => (locale === 'hi' ? text.hi : text.en)

  return (
    <div className="space-y-10">
      <Group title={c(COPY.variants)}>
        <Button>
          <Download aria-hidden />
          {c(COPY.download)}
        </Button>
        <Button variant="secondary">
          {c(COPY.build)}
          <ArrowRight aria-hidden />
        </Button>
        <Button variant="ghost">{c(COPY.talk)}</Button>
        <Button variant="link">{c(COPY.docs)}</Button>
      </Group>

      <Group title={c(COPY.sizes)}>
        <Button size="sm">{c(COPY.start)}</Button>
        <Button size="md">{c(COPY.start)}</Button>
        <Button size="lg">{c(COPY.start)}</Button>
        <Button size="sm" variant="secondary">
          {c(COPY.demo)}
        </Button>
        <Button size="lg" variant="secondary">
          {c(COPY.demo)}
        </Button>
      </Group>

      <Group title={c(COPY.states)}>
        <Button disabled>{c(COPY.waitlist)}</Button>
        <Button variant="secondary" disabled>
          {c(COPY.talk)}
        </Button>
        {/* Spec §8.5: "Buy" stays visible but disabled while the store is off. */}
        <span className="inline-flex flex-col items-start gap-1">
          <Button aria-disabled>{c(COPY.buy)}</Button>
          <span className="text-xs text-fg-muted">{c(COPY.soon)}</span>
        </span>
        <Button disabled>
          <Spinner aria-hidden className="size-[1.1em] text-current" />
          {c(COPY.downloading)}
        </Button>
      </Group>

      <Group title={c(COPY.links)}>
        <Button asChild>
          <Link href="/products">{c(COPY.explore)}</Link>
        </Button>
        <Button asChild variant="secondary">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /go/* is a redirect route, not a page */}
          <a href="/go/menumesh">
            {c(COPY.visit)}
            <ArrowUpRight aria-hidden />
          </a>
        </Button>
        <Button asChild variant="link">
          <Link href="/products/vyro/docs">{c(COPY.docs)}</Link>
        </Button>
      </Group>

      <Group title={c(COPY.iconButtons)}>
        <IconButton label={c(COPY.menu)} size="sm">
          <Menu aria-hidden />
        </IconButton>
        <IconButton label={c(COPY.search)}>
          <Search aria-hidden />
        </IconButton>
        <IconButton label={c(COPY.share)} variant="secondary">
          <Share2 aria-hidden />
        </IconButton>
        <IconButton label={c(COPY.download)} variant="primary" size="lg">
          <Download aria-hidden />
        </IconButton>
        <IconButton label={c(COPY.close)} variant="secondary" disabled>
          <X aria-hidden />
        </IconButton>
      </Group>

      <Group title={c(COPY.badges)}>
        <Badge>{c(COPY.rust)}</Badge>
        <Badge tone="primary">{c(COPY.new)}</Badge>
        <Badge tone="accent">{c(COPY.featured)}</Badge>
        <Badge tone="success">{c(COPY.normal)}</Badge>
        <Badge tone="warning">{c(COPY.price)}</Badge>
        <Badge tone="danger">{c(COPY.eol)}</Badge>
        <Badge tone="info">{c(COPY.betaChannel)}</Badge>
        <Badge tone="success" size="md">
          <ShieldCheck aria-hidden />
          {c(COPY.onDevice)}
        </Badge>
        <Badge tone="primary" size="md">
          {c(COPY.new)}
        </Badge>
      </Group>

      <Group title={c(COPY.status)}>
        <StatusBadge status="live" />
        <StatusBadge status="beta" />
        <StatusBadge status="coming-soon" />
        <StatusBadge status="retired" />
        <StatusBadge status="live" size="md" />
        <PlatformBadge platform="windows" />
        <PlatformBadge platform="macos" />
        <PlatformBadge platform="linux" />
        <PlatformBadge platform="web" />
        <PlatformBadge platform="android" />
        <PlatformBadge platform="ios" />
      </Group>

      <Group title={c(COPY.tooltips)}>
        {/* The tooltip repeats the button's name; title={undefined} avoids a second, native tooltip. */}
        <Tooltip content={c(COPY.copySha)}>
          <IconButton label={c(COPY.copySha)} title={undefined} variant="secondary">
            <Copy aria-hidden />
          </IconButton>
        </Tooltip>
        {/* The version is also printed under the button: a tooltip never holds the only copy. */}
        <span className="inline-flex flex-col items-start gap-1">
          <Tooltip content={c(COPY.version)}>
            <Button>
              <Download aria-hidden />
              {c(COPY.downloadWindows)}
            </Button>
          </Tooltip>
          <span className="text-xs text-fg-muted">{c(COPY.version)}</span>
        </span>
        <Tooltip content={c(COPY.plansHint)}>
          <Button variant="ghost">
            <Info aria-hidden />
            {c(COPY.plans)}
          </Button>
        </Tooltip>
      </Group>
    </div>
  )
}

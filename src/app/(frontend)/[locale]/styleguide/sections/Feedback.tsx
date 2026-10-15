'use client'

import { RefreshCw } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback, useState, type ReactNode } from 'react'

import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/feedback/Dialog'
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/components/feedback/Drawer'
import { toast } from '@/components/feedback/Toast'
import { Checkbox } from '@/components/forms/Checkbox'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Card, CardTitle } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { Tooltip } from '@/components/ui/Tooltip'

type Text = { en: string; hi: string }

// Sample content (like CMS data), so it lives here rather than in the messages files.
const COPY = {
  toasts: { en: 'Toast: neutral, success, danger', hi: 'Toast: सामान्य, सफल, गड़बड़ी' },
  toastHint: {
    en: 'Toasts appear at the bottom of the screen and close on their own. Press F8 to reach them with the keyboard.',
    hi: 'Toast स्क्रीन के नीचे दिखते हैं और अपने-आप बंद हो जाते हैं। कीबोर्ड से उन तक पहुँचने के लिए F8 दबाएँ।',
  },
  neutral: { en: 'Neutral', hi: 'सामान्य' },
  success: { en: 'Success', hi: 'सफल' },
  danger: { en: 'Danger', hi: 'गड़बड़ी' },
  updateReady: { en: 'A new version of VYRO is ready', hi: 'VYRO का नया वर्शन तैयार है' },
  updateReadyText: {
    en: 'It installs the next time you open the app.',
    hi: 'अगली बार ऐप खोलने पर यह इंस्टॉल हो जाएगा।',
  },
  saved: { en: 'Your settings are saved', hi: 'आपकी सेटिंग्स सेव हो गई हैं' },
  notSent: { en: 'Your message wasn’t sent', hi: 'आपका संदेश नहीं भेजा जा सका' },
  retry: {
    en: 'Check your internet connection and try again.',
    hi: 'अपना इंटरनेट कनेक्शन जाँचें और फिर से कोशिश करें।',
  },
  dialog: {
    en: 'Dialog (Escape closes it, focus returns to the button)',
    hi: 'Dialog (Escape से बंद होता है, फ़ोकस बटन पर लौट आता है)',
  },
  signOutAll: { en: 'Sign out everywhere', hi: 'हर जगह से साइन आउट करें' },
  signOutTitle: { en: 'Sign out of every device?', hi: 'सभी डिवाइस से साइन आउट करें?' },
  signOutText: {
    en: 'You’ll be signed out on every browser and device, including this one.',
    hi: 'आप इस डिवाइस समेत हर ब्राउज़र और डिवाइस से साइन आउट हो जाएँगे।',
  },
  cancel: { en: 'Cancel', hi: 'रद्द करें' },
  signedOut: { en: 'Signed out everywhere', hi: 'हर जगह से साइन आउट हो गया' },
  demoOnly: {
    en: 'This is a styleguide demo, so nothing actually changed.',
    hi: 'यह स्टाइलगाइड का डेमो है, इसलिए असल में कुछ नहीं बदला।',
  },
  drawer: { en: 'Drawer: right, left, bottom', hi: 'Drawer: दाएँ, बाएँ, नीचे' },
  right: { en: 'From the right', hi: 'दाईं ओर से' },
  left: { en: 'From the left', hi: 'बाईं ओर से' },
  bottom: { en: 'From the bottom', hi: 'नीचे से' },
  filterTitle: { en: 'Filter products', hi: 'प्रोडक्ट फ़िल्टर करें' },
  filterText: {
    en: 'Show only the products you need.',
    hi: 'सिर्फ़ वही प्रोडक्ट दिखाएँ जो आपके काम के हैं।',
  },
  platform: { en: 'Platform', hi: 'प्लेटफ़ॉर्म' },
  status: { en: 'Status', hi: 'स्थिति' },
  showProducts: { en: 'Show products', hi: 'प्रोडक्ट दिखाएँ' },
  loading: {
    en: 'Skeleton and Spinner while loading (Tooltip on the refresh button)',
    hi: 'लोड होते समय Skeleton और Spinner (रीफ़्रेश बटन पर Tooltip)',
  },
  ourProducts: { en: 'Our products', hi: 'हमारे प्रोडक्ट' },
  refresh: { en: 'Refresh the list', hi: 'सूची रीफ़्रेश करें' },
  loadingProducts: { en: 'Loading products', hi: 'प्रोडक्ट लोड हो रहे हैं' },
  menumesh: { en: 'QR table ordering for restaurants.', hi: 'रेस्टोरेंट के लिए QR टेबल ऑर्डरिंग।' },
  vyro: { en: 'Know your machine.', hi: 'अपनी मशीन को जानिए।' },
  baby: {
    en: 'Your private voice assistant for Windows.',
    hi: 'Windows के लिए आपका प्राइवेट वॉइस असिस्टेंट।',
  },
  live: { en: 'Callout as a live message', hi: 'लाइव संदेश के रूप में Callout' },
  checkUpdates: { en: 'Check for updates', hi: 'अपडेट देखें' },
  checkOffline: { en: 'Check while offline', hi: 'ऑफ़लाइन रहते हुए जाँचें' },
  checking: { en: 'Checking…', hi: 'जाँच हो रही है…' },
  upToDate: { en: 'VYRO is up to date', hi: 'VYRO अप टू डेट है' },
  upToDateText: {
    en: 'You have 1.4.0, the latest stable release.',
    hi: 'आपके पास 1.4.0 है, जो सबसे नया स्टेबल रिलीज़ है।',
  },
  checkFailed: { en: 'Couldn’t check for updates', hi: 'अपडेट की जाँच नहीं हो सकी' },
} satisfies Record<string, Text>

const PRODUCTS = [
  { name: 'MenuMesh', text: COPY.menumesh, status: 'live' },
  { name: 'VYRO', text: COPY.vyro, status: 'beta' },
  { name: 'Baby', text: COPY.baby, status: 'coming-soon' },
] as const

const SIDES = ['right', 'left', 'bottom'] as const

type Localize = (text: Text) => string

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-fg-muted">{title}</h3>
      {note && <p className="text-sm text-fg-muted">{note}</p>}
      {children}
    </div>
  )
}

function ProductsDemo({ c }: { c: Localize }) {
  const [loading, setLoading] = useState(false)
  const refresh = () => {
    if (loading) return
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <CardTitle as="h4">{c(COPY.ourProducts)}</CardTitle>
        <div className="flex items-center gap-2">
          {loading && <Spinner label={c(COPY.loadingProducts)} />}
          {/* The tooltip repeats the button's name; title={undefined} avoids a second, native tooltip. */}
          <Tooltip content={c(COPY.refresh)}>
            <IconButton
              label={c(COPY.refresh)}
              title={undefined}
              variant="secondary"
              onClick={refresh}
            >
              <RefreshCw aria-hidden />
            </IconButton>
          </Tooltip>
        </div>
      </div>
      <div aria-busy={loading}>
        {loading ? (
          <div className="space-y-4">
            {PRODUCTS.map(({ name }) => (
              <div key={name} className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-4">
            {PRODUCTS.map(({ name, text, status }) => (
              <li key={name} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-fg-muted">{c(text)}</p>
                </div>
                <StatusBadge status={status} className="shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}

type Outcome = 'ok' | 'failed'

function UpdateCheckDemo({ c }: { c: Localize }) {
  const [checking, setChecking] = useState<Outcome | null>(null)
  const [result, setResult] = useState<Outcome | null>(null)
  const check = (outcome: Outcome) => {
    if (checking) return
    setResult(null)
    setChecking(outcome)
    setTimeout(() => {
      setChecking(null)
      setResult(outcome)
    }, 1200)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {(
          [
            ['ok', COPY.checkUpdates],
            ['failed', COPY.checkOffline],
          ] as const
        ).map(([outcome, label]) => (
          // aria-disabled, not disabled: the focused button keeps focus while it works.
          <Button
            key={outcome}
            variant="secondary"
            aria-disabled={checking !== null}
            onClick={() => check(outcome)}
          >
            {checking === outcome && <Spinner aria-hidden className="size-[1.1em] text-current" />}
            {checking === outcome ? c(COPY.checking) : c(label)}
          </Button>
        ))}
      </div>
      {/* The live region stays mounted so each new message is announced. */}
      <div role="status">
        {result === 'ok' && (
          <Callout tone="success" title={c(COPY.upToDate)}>
            {c(COPY.upToDateText)}
          </Callout>
        )}
        {result === 'failed' && (
          <Callout tone="danger" title={c(COPY.checkFailed)}>
            {c(COPY.retry)}
          </Callout>
        )}
      </div>
    </>
  )
}

export default function FeedbackSection() {
  const locale = useLocale()
  const c: Localize = (text) => (locale === 'hi' ? text.hi : text.en)
  const t = useTranslations('ui')

  // Dialogs and drawers portal to <body>, outside this panel's data-theme wrapper: carry the
  // panel's theme over so the dark panel's overlays open dark.
  const [theme, setTheme] = useState<string>()
  const panelRef = useCallback((node: HTMLElement | null) => {
    setTheme(node?.closest('[data-theme]')?.getAttribute('data-theme') ?? undefined)
  }, [])

  return (
    <div ref={panelRef} className="space-y-10">
      <Group title={c(COPY.toasts)} note={c(COPY.toastHint)}>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              toast({ title: c(COPY.updateReady), description: c(COPY.updateReadyText) })
            }
          >
            {c(COPY.neutral)}
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast({ tone: 'success', title: c(COPY.saved) })}
          >
            {c(COPY.success)}
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast({ tone: 'danger', title: c(COPY.notSent), description: c(COPY.retry) })
            }
          >
            {c(COPY.danger)}
          </Button>
        </div>
      </Group>

      <Group title={c(COPY.dialog)}>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">{c(COPY.signOutAll)}</Button>
          </DialogTrigger>
          <DialogContent
            data-theme={theme}
            title={c(COPY.signOutTitle)}
            description={c(COPY.signOutText)}
          >
            {/* Cancel comes first, so the safe choice gets initial focus. */}
            <div className="flex flex-wrap justify-end gap-2">
              <DialogClose asChild>
                <Button variant="secondary">{c(COPY.cancel)}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  onClick={() => toast({ title: c(COPY.signedOut), description: c(COPY.demoOnly) })}
                >
                  {c(COPY.signOutAll)}
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </Group>

      <Group title={c(COPY.drawer)}>
        <div className="flex flex-wrap items-center gap-3">
          {SIDES.map((side) => (
            <Drawer key={side}>
              <DrawerTrigger asChild>
                <Button variant="secondary">{c(COPY[side])}</Button>
              </DrawerTrigger>
              <DrawerContent
                side={side}
                data-theme={theme}
                title={c(COPY.filterTitle)}
                description={c(COPY.filterText)}
              >
                <div className="grid gap-6">
                  <fieldset>
                    <legend className="mb-1 text-sm font-semibold">{c(COPY.platform)}</legend>
                    <Checkbox label={t('platform.windows')} defaultChecked />
                    <Checkbox label={t('platform.web')} defaultChecked />
                  </fieldset>
                  <fieldset>
                    <legend className="mb-1 text-sm font-semibold">{c(COPY.status)}</legend>
                    <Checkbox label={t('status.live')} defaultChecked />
                    <Checkbox label={t('status.beta')} defaultChecked />
                    <Checkbox label={t('status.coming-soon')} />
                  </fieldset>
                  <DrawerClose asChild>
                    <Button className="justify-self-start">{c(COPY.showProducts)}</Button>
                  </DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
          ))}
        </div>
      </Group>

      <Group title={c(COPY.loading)}>
        <ProductsDemo c={c} />
      </Group>

      <Group title={c(COPY.live)}>
        <UpdateCheckDemo c={c} />
      </Group>
    </div>
  )
}

import { useLocale } from 'next-intl'
import type { ReactNode } from 'react'

import { Gallery } from '@/components/media/Gallery'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { VideoLoop } from '@/components/media/VideoLoop'
import type { Media } from '@/payload-types'
import { tokens } from '@/styles/tokens.generated'

type Text = { en: string; hi: string }

// Sample content (like CMS data), so it lives here rather than in the messages files.
const COPY = {
  ratios: { en: 'ResponsiveImage: aspect ratios', hi: 'ResponsiveImage: आस्पेक्ट रेशियो' },
  ratiosNote: {
    en: 'One image in three frames. object-cover crops it around the focal point set in the CMS.',
    hi: 'एक ही इमेज, तीन फ़्रेम में। object-cover इसे CMS में चुने गए फ़ोकल पॉइंट के आसपास क्रॉप करता है।',
  },
  dashAlt: {
    en: 'Placeholder screenshot: an app window with a sidebar and a rising line chart',
    hi: 'प्लेसहोल्डर स्क्रीनशॉट: साइडबार और ऊपर जाते लाइन चार्ट वाली ऐप विंडो',
  },
  captioned: { en: 'ResponsiveImage: with a caption', hi: 'ResponsiveImage: कैप्शन के साथ' },
  darkAlt: {
    en: 'Placeholder screenshot: the same app window in dark mode',
    hi: 'प्लेसहोल्डर स्क्रीनशॉट: वही ऐप विंडो डार्क मोड में',
  },
  darkCaption: {
    en: 'VYRO in dark mode. Placeholder art until real screenshots are uploaded.',
    hi: 'डार्क मोड में VYRO। असली स्क्रीनशॉट अपलोड होने तक यह प्लेसहोल्डर है।',
  },
  video: { en: 'VideoLoop', hi: 'VideoLoop' },
  videoLabel: {
    en: 'VYRO’s temperature chart updating (sample loop)',
    hi: 'VYRO का तापमान चार्ट अपडेट होते हुए (नमूना लूप)',
  },
  videoNote: {
    en: 'No video files yet, so this shows the poster state. With a file, the loop plays muted only while it is on screen and stays paused when reduced motion is on. The play/pause button is always there, and the visitor’s choice sticks. Captions come from a WebVTT track in the page’s language.',
    hi: 'अभी कोई वीडियो फ़ाइल नहीं है, इसलिए यहाँ सिर्फ़ पोस्टर दिख रहा है। फ़ाइल होने पर लूप बिना आवाज़ के तभी चलता है जब वह स्क्रीन पर हो, और रिड्यूस्ड मोशन चालू होने पर रुका रहता है। प्ले/पॉज़ बटन हमेशा रहता है और विज़िटर की पसंद याद रहती है। कैप्शन पेज की भाषा वाले WebVTT ट्रैक से आते हैं।',
  },
  cue: { en: 'CPU temperature: 54 °C', hi: 'CPU का तापमान: 54 °C' },
  gallery: { en: 'Gallery and Lightbox', hi: 'Gallery और Lightbox' },
  galleryNote: {
    en: 'Select a thumbnail to open the viewer. ← and → move between images, and Esc closes it and returns focus to the thumbnail.',
    hi: 'व्यूअर खोलने के लिए कोई थंबनेल चुनें। ← और → से इमेज बदलें, और Esc से व्यूअर बंद करें; फ़ोकस वापस थंबनेल पर आ जाता है।',
  },
  g1Alt: {
    en: 'Placeholder screenshot: dashboard with a line chart, light theme',
    hi: 'प्लेसहोल्डर स्क्रीनशॉट: लाइन चार्ट वाला डैशबोर्ड, लाइट थीम',
  },
  g1Caption: { en: 'Dashboard, light theme', hi: 'डैशबोर्ड, लाइट थीम' },
  g2Alt: {
    en: 'Placeholder screenshot: tall layout, dark theme',
    hi: 'प्लेसहोल्डर स्क्रीनशॉट: लंबा लेआउट, डार्क थीम',
  },
  g2Caption: {
    en: 'A tall image fits the viewer without cropping.',
    hi: 'लंबी इमेज व्यूअर में बिना क्रॉप हुए पूरी दिखती है।',
  },
  g3Alt: {
    en: 'Placeholder screenshot: square layout, light theme',
    hi: 'प्लेसहोल्डर स्क्रीनशॉट: वर्गाकार लेआउट, लाइट थीम',
  },
  g4Alt: {
    en: 'Placeholder screenshot: wide layout, dark theme',
    hi: 'प्लेसहोल्डर स्क्रीनशॉट: चौड़ा लेआउट, डार्क थीम',
  },
  g4Caption: {
    en: 'A wide image. The square one before it has no caption.',
    hi: 'चौड़ी इमेज। इससे पहले वाली वर्गाकार इमेज का कोई कैप्शन नहीं है।',
  },
  lazy: {
    en: 'ResponsiveImage: lazy, below the fold',
    hi: 'ResponsiveImage: लेज़ी, स्क्रीन के नीचे',
  },
  lazyNote: {
    en: 'Images load lazily by default, so this one is fetched only as it nears the screen. Only the page’s main (LCP) image gets priority.',
    hi: 'इमेज डिफ़ॉल्ट रूप से लेज़ी लोड होती हैं, इसलिए यह तभी लोड होगी जब स्क्रीन के पास आएगी। priority सिर्फ़ पेज की मुख्य (LCP) इमेज को मिलती है।',
  },
  lazyAlt: {
    en: 'Placeholder banner: a wide app window with a line chart',
    hi: 'प्लेसहोल्डर बैनर: लाइन चार्ट वाली एक चौड़ी ऐप विंडो',
  },
} satisfies Record<string, Text>

type Palette = Record<keyof (typeof tokens)['light'], string>
type Accent = 'primary' | 'brand-accent' | 'info' | 'success'

/** Stand-in screenshot (app window with a line chart) drawn from theme tokens, until real media exists. */
const shot = (w: number, h: number, p: Palette, accent: Accent) => {
  const u = Math.min(w, h) / 20
  const top = u * 2.5
  const side = w * 0.22
  const [x, y] = [side + u, top + u]
  const [cw, ch] = [w - x - u, h - y - u]
  const points = [0.75, 0.55, 0.62, 0.38, 0.45, 0.22, 0.3]
    .map(
      (v, i, all) => `${x + u + ((cw - 2 * u) * i) / (all.length - 1)},${y + u + (ch - 2 * u) * v}`,
    )
    .join(' ')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="${w}" height="${h}" fill="${p['bg-subtle']}"/>` +
    `<rect width="${w}" height="${top}" fill="${p.surface}"/>` +
    [0, 1, 2]
      .map(
        (i) => `<circle cx="${u * (1.2 + i)}" cy="${top / 2}" r="${u * 0.3}" fill="${p.border}"/>`,
      )
      .join('') +
    `<rect y="${top}" width="${side}" height="${h - top}" fill="${p.surface}"/>` +
    [0, 1, 2, 3]
      .map(
        (i) =>
          `<rect x="${u}" y="${top + u + i * u * 1.6}" width="${side - 2 * u}" height="${u * 0.7}" rx="${u * 0.35}" fill="${i ? p.border : p[accent]}"/>`,
      )
      .join('') +
    `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="${u * 0.6}" fill="${p.surface}" stroke="${p.border}"/>` +
    `<polyline points="${points}" fill="none" stroke="${p[accent]}" stroke-width="${u * 0.4}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const media = (
  id: number,
  w: number,
  h: number,
  p: Palette,
  accent: Accent,
  extra: Partial<Media>,
): Media => ({
  id,
  url: shot(w, h, p, accent),
  width: w,
  height: h,
  mimeType: 'image/svg+xml',
  updatedAt: '',
  createdAt: '',
  ...extra,
})

const { light, dark } = tokens
const POSTER = shot(1280, 720, dark, 'primary')
// A video upload whose file isn't there yet: no src, so the element keeps showing the poster.
const NO_FILE: Media = { id: 0, url: null, mimeType: 'video/mp4', updatedAt: '', createdAt: '' }
const FRAMES = [
  ['16:9', 'aspect-video'],
  ['4:3', 'aspect-[4/3]'],
  ['1:1', 'aspect-square'],
] as const

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-fg-muted">{title}</h3>
      {note && <p className="max-w-prose text-sm text-fg-muted">{note}</p>}
      {children}
    </div>
  )
}

export default function MediaSection() {
  const locale = useLocale()
  const c = (text: Text) => (locale === 'hi' ? text.hi : text.en)

  // Focal point on the chart, so every crop keeps it in view.
  const dashboard = media(1, 1200, 800, light, 'primary', {
    alt: c(COPY.dashAlt),
    focalX: 70,
    focalY: 55,
  })
  const gallery = [
    media(1, 1200, 800, light, 'primary', { alt: c(COPY.g1Alt), caption: c(COPY.g1Caption) }),
    media(2, 800, 1100, dark, 'brand-accent', { alt: c(COPY.g2Alt), caption: c(COPY.g2Caption) }),
    media(3, 1000, 1000, light, 'info', { alt: c(COPY.g3Alt) }),
    media(4, 1600, 700, dark, 'success', { alt: c(COPY.g4Alt), caption: c(COPY.g4Caption) }),
  ]
  const captions = `data:text/vtt;charset=utf-8,${encodeURIComponent(`WEBVTT\n\n00:00.000 --> 00:04.000\n${c(COPY.cue)}\n`)}`

  return (
    <div className="space-y-10">
      <Group title={c(COPY.ratios)} note={c(COPY.ratiosNote)}>
        <div className="grid items-start gap-4 sm:grid-cols-3">
          {FRAMES.map(([ratio, frame]) => (
            <figure key={ratio} className="space-y-2">
              <div
                className={`relative ${frame} overflow-hidden rounded-lg border border-border bg-bg-subtle`}
              >
                <ResponsiveImage
                  media={dashboard}
                  fill
                  sizes="(min-width: 1280px) 15vw, (min-width: 640px) 30vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="text-sm text-fg-muted tabular-nums">{ratio}</figcaption>
            </figure>
          ))}
        </div>
      </Group>

      <Group title={c(COPY.captioned)}>
        <figure className="space-y-2">
          <ResponsiveImage
            src={shot(1200, 675, dark, 'brand-accent')}
            alt={c(COPY.darkAlt)}
            width={1200}
            height={675}
            sizes="(min-width: 1280px) 45vw, 100vw"
            className="h-auto w-full rounded-lg border border-border"
          />
          <figcaption className="text-sm text-fg-muted">{c(COPY.darkCaption)}</figcaption>
        </figure>
      </Group>

      <Group title={c(COPY.video)} note={c(COPY.videoNote)}>
        <VideoLoop
          src={NO_FILE}
          poster={POSTER}
          label={c(COPY.videoLabel)}
          captions={captions}
          className="aspect-video rounded-lg border border-border"
        />
      </Group>

      <Group title={c(COPY.gallery)} note={c(COPY.galleryNote)}>
        <Gallery images={gallery} />
      </Group>

      <Group title={c(COPY.lazy)} note={c(COPY.lazyNote)}>
        <ResponsiveImage
          src={shot(1500, 500, light, 'brand-accent')}
          alt={c(COPY.lazyAlt)}
          width={1500}
          height={500}
          sizes="(min-width: 1280px) 45vw, 100vw"
          // next/image makes data: URIs eager; real files are lazy without this.
          loading="lazy"
          className="h-auto w-full rounded-lg border border-border"
        />
      </Group>
    </div>
  )
}

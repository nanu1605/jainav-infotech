import { Check, Newspaper, SearchX } from 'lucide-react'
import { useLocale } from 'next-intl'
import type { ReactNode } from 'react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion'
import { Avatar } from '@/components/ui/Avatar'
import { PlatformBadge, StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Quote } from '@/components/ui/Quote'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { Stat } from '@/components/ui/Stat'
import { Steps } from '@/components/ui/Steps'
import { Table } from '@/components/ui/Table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Tag } from '@/components/ui/Tag'
import { Link } from '@/i18n/navigation'
import { tokens } from '@/styles/tokens.generated'

type Text = { en: string; hi: string }

// Sample content (like CMS data), so it lives here rather than in the messages files.
const COPY = {
  cards: {
    en: 'Card: default, raised, interactive',
    hi: 'Card: डिफ़ॉल्ट, उभरा हुआ, क्लिक करने लायक',
  },
  saas: { en: 'Custom software & SaaS', hi: 'कस्टम सॉफ़्टवेयर और SaaS' },
  saasText: {
    en: 'Web apps, SaaS platforms, mobile and desktop apps.',
    hi: 'वेब ऐप, SaaS प्लेटफ़ॉर्म, मोबाइल और डेस्कटॉप ऐप।',
  },
  ai: { en: 'AI & ML solutions', hi: 'AI और ML समाधान' },
  aiText: {
    en: 'LLM apps and assistants, search and RAG, automation, forecasting and analytics.',
    hi: 'LLM ऐप और असिस्टेंट, सर्च और RAG, ऑटोमेशन, फ़ोरकास्टिंग और एनालिटिक्स।',
  },
  menumesh: { en: 'QR table ordering for restaurants.', hi: 'रेस्टोरेंट के लिए QR टेबल ऑर्डरिंग।' },
  vyro: {
    en: 'Live temperatures, fan speeds, voltages and clocks for your CPU, GPU, RAM, storage and motherboard, in a light, fast app.',
    hi: 'आपके CPU, GPU, RAM, स्टोरेज और मदरबोर्ड का तापमान, फ़ैन की रफ़्तार, वोल्टेज और क्लॉक स्पीड, एक हल्के और तेज़ ऐप में।',
  },
  baby: {
    en: 'Your private voice assistant for Windows.',
    hi: 'Windows के लिए आपका प्राइवेट वॉइस असिस्टेंट।',
  },
  tags: { en: 'Tag: static, links, filters', hi: 'Tag: सामान्य, लिंक, फ़िल्टर' },
  restaurants: { en: 'Restaurants', hi: 'रेस्टोरेंट' },
  onDevice: { en: 'On-device AI', hi: 'डिवाइस पर चलने वाला AI' },
  engineering: { en: 'Engineering', hi: 'इंजीनियरिंग' },
  all: { en: 'All posts', hi: 'सभी पोस्ट' },
  releases: { en: 'Release notes', hi: 'रिलीज़ नोट्स' },
  hiring: { en: 'Hiring (none open)', hi: 'भर्ती (अभी कोई नहीं)' },
  stats: { en: 'Stat', hi: 'Stat' },
  products: { en: 'Products we build and run', hi: 'प्रोडक्ट, जिन्हें हम बनाते और चलाते हैं' },
  productsText: { en: 'MenuMesh, VYRO and Baby', hi: 'MenuMesh, VYRO और Baby' },
  languages: { en: 'Languages', hi: 'भाषाएँ' },
  languagesText: {
    en: 'English and Hindi, across the site',
    hi: 'पूरी साइट पर अंग्रेज़ी और हिंदी',
  },
  pillars: { en: 'Service pillars', hi: 'सर्विस के क्षेत्र' },
  release: { en: 'Latest VYRO release', hi: 'VYRO का नया रिलीज़' },
  accordion: { en: 'Accordion: single and multiple', hi: 'Accordion: एक या कई खुले' },
  q1: {
    en: 'Does VYRO need other monitoring tools?',
    hi: 'क्या VYRO को दूसरे मॉनिटरिंग टूल चाहिए?',
  },
  a1: {
    en: 'No. VYRO reads your sensors directly, without third-party monitoring tools.',
    hi: 'नहीं। VYRO किसी थर्ड-पार्टी मॉनिटरिंग टूल के बिना सीधे आपके सेंसर पढ़ता है।',
  },
  q2: {
    en: 'Who collects the payment for food orders in MenuMesh?',
    hi: 'MenuMesh में खाने के ऑर्डर का पेमेंट कौन लेता है, और बिल कैसे प्रिंट होता है?',
  },
  a2: {
    en: 'The restaurant collects the food bill itself. MenuMesh generates and prints the bill.',
    hi: 'खाने के बिल का पेमेंट रेस्टोरेंट ख़ुद लेता है। MenuMesh बिल बनाता और प्रिंट करता है।',
  },
  q3: { en: 'Which languages does Baby understand?', hi: 'Baby कौन-कौन सी भाषाएँ समझता है?' },
  a3: { en: 'English, Hindi and Hinglish.', hi: 'अंग्रेज़ी, हिंदी और हिंग्लिश।' },
  q4: { en: 'Is there a macOS version? (disabled)', hi: 'क्या macOS वर्शन है? (बंद)' },
  tabs: { en: 'Tabs', hi: 'Tabs' },
  overview: { en: 'Overview', hi: 'परिचय' },
  features: { en: 'Features', hi: 'फ़ीचर' },
  requirements: { en: 'System requirements', hi: 'सिस्टम की ज़रूरतें' },
  changelog: { en: 'Changelog', hi: 'बदलाव' },
  overviewText: {
    en: 'Know your machine. Full system and multi-monitor details, with animated gauges.',
    hi: 'अपनी मशीन को जानिए। पूरे सिस्टम और हर मॉनिटर की जानकारी, ऐनिमेटेड गेज के साथ।',
  },
  featuresText: {
    en: 'Animated CPU and GPU speedometers, every fan speed, voltages and clocks. Built with Rust and Tauri.',
    hi: 'CPU और GPU के ऐनिमेटेड स्पीडोमीटर, हर फ़ैन की रफ़्तार, वोल्टेज और क्लॉक स्पीड। Rust और Tauri से बना।',
  },
  requirementsText: {
    en: 'Windows 10 or 11, 64-bit. Low CPU and memory use.',
    hi: 'Windows 10 या 11, 64-बिट। CPU और मेमोरी का कम इस्तेमाल।',
  },
  steps: { en: 'Steps', hi: 'Steps' },
  discover: { en: 'Discover', hi: 'समझना' },
  discoverText: {
    en: 'We learn your goals, your users and your constraints.',
    hi: 'हम आपके लक्ष्य, आपके यूज़र और आपकी सीमाओं को समझते हैं।',
  },
  design: { en: 'Design', hi: 'डिज़ाइन' },
  designText: {
    en: 'Flows, screens and architecture you can review before we build.',
    hi: 'फ़्लो, स्क्रीन और आर्किटेक्चर, जिन्हें आप बनने से पहले देख सकते हैं।',
  },
  buildStep: { en: 'Build', hi: 'निर्माण' },
  buildText: {
    en: 'Small, tested releases you can try every week.',
    hi: 'छोटे और टेस्ट किए हुए रिलीज़, जिन्हें आप हर हफ़्ते आज़मा सकते हैं।',
  },
  support: { en: 'Support', hi: 'सपोर्ट' },
  supportText: {
    en: 'Monitoring, fixes and improvements after launch.',
    hi: 'लॉन्च के बाद मॉनिटरिंग, सुधार और बेहतरी।',
  },
  quotes: { en: 'Quote and Avatar (sample people)', hi: 'Quote और Avatar (नमूना लोग)' },
  quote1: {
    en: 'Orders reach the kitchen the moment guests tap “Order”. Our waiters spend their time at the tables now, not running back and forth.',
    hi: 'मेहमान जैसे ही “ऑर्डर” दबाते हैं, ऑर्डर सीधे किचन तक पहुँच जाता है। अब हमारे वेटर भाग-दौड़ के बजाय टेबल पर मेहमानों के साथ समय बिताते हैं।',
  },
  owner: { en: 'Owner', hi: 'मालिक' },
  cafe: { en: 'Sample Café, Indore', hi: 'सैंपल कैफ़े, इंदौर' },
  quote2: {
    en: 'VYRO shows every fan and temperature on one screen, and it barely uses any CPU itself.',
    hi: 'VYRO हर फ़ैन और तापमान एक ही स्क्रीन पर दिखाता है, और ख़ुद मुश्किल से CPU इस्तेमाल करता है।',
  },
  itLead: { en: 'IT lead', hi: 'IT लीड' },
  table: { en: 'Table', hi: 'Table' },
  tableCaption: { en: 'VYRO system requirements', hi: 'VYRO की सिस्टम ज़रूरतें' },
  part: { en: 'Part', hi: 'हिस्सा' },
  minimum: { en: 'Minimum', hi: 'कम से कम' },
  recommended: { en: 'Recommended', hi: 'सुझाया गया' },
  os: { en: 'Operating system', hi: 'ऑपरेटिंग सिस्टम' },
  cpu: { en: 'Processor', hi: 'प्रोसेसर' },
  anyCpu: { en: 'Any 64-bit processor', hi: 'कोई भी 64-बिट प्रोसेसर' },
  recentCpu: {
    en: 'A recent Intel or AMD processor with on-board sensors',
    hi: 'ऑन-बोर्ड सेंसर वाला कोई नया Intel या AMD प्रोसेसर',
  },
  memory: { en: 'Memory', hi: 'मेमोरी' },
  disk: { en: 'Disk space', hi: 'डिस्क स्पेस' },
  wideCaption: {
    en: 'Service pillars (scrolls sideways on small screens)',
    hi: 'सर्विस के क्षेत्र (छोटी स्क्रीन पर बगल में स्क्रॉल होता है)',
  },
  pillar: { en: 'Pillar', hi: 'क्षेत्र' },
  whatWeBuild: { en: 'What we build', hi: 'हम क्या बनाते हैं' },
  cloud: { en: 'Cloud & DevOps', hi: 'क्लाउड और DevOps' },
  cloudText: {
    en: 'CI/CD, containers, cloud setup, monitoring, cost tuning.',
    hi: 'CI/CD, कंटेनर, क्लाउड सेटअप, मॉनिटरिंग और ख़र्च में कटौती।',
  },
  callouts: { en: 'Callout', hi: 'Callout' },
  plansTitle: { en: 'Free and Pro plans', hi: 'Free और Pro प्लान' },
  plansText: {
    en: 'The feature split and prices will be announced before launch.',
    hi: 'किस प्लान में क्या मिलेगा और क़ीमतें, लॉन्च से पहले बताई जाएँगी।',
  },
  publishedTitle: { en: 'Release published', hi: 'रिलीज़ प्रकाशित हो गया' },
  publishedText: {
    en: 'VYRO 1.4.0 is live on the stable channel.',
    hi: 'VYRO 1.4.0 अब स्टेबल चैनल पर उपलब्ध है।',
  },
  draftText: {
    en: 'This page’s Hindi translation is a draft. English is shown where Hindi is missing.',
    hi: 'इस पेज का हिंदी अनुवाद अभी ड्राफ़्ट है। जहाँ हिंदी नहीं है, वहाँ अंग्रेज़ी दिखाई गई है।',
  },
  uninstallTitle: { en: 'Before you uninstall', hi: 'अनइंस्टॉल करने से पहले' },
  uninstallText: {
    en: 'Uninstalling removes Baby’s local memory from this PC. This can’t be undone.',
    hi: 'अनइंस्टॉल करने से इस PC से Baby की लोकल मेमोरी हट जाएगी। इसे वापस नहीं लाया जा सकता।',
  },
  empty: { en: 'EmptyState', hi: 'EmptyState' },
  noPosts: { en: 'No posts yet', hi: 'अभी कोई पोस्ट नहीं है' },
  noPostsText: {
    en: 'Our first articles on building MenuMesh, VYRO and Baby are on the way.',
    hi: 'MenuMesh, VYRO और Baby को बनाने पर हमारे पहले लेख जल्द आ रहे हैं।',
  },
  subscribe: { en: 'Subscribe to the newsletter', hi: 'न्यूज़लेटर सब्सक्राइब करें' },
  noResults: { en: 'No results for “gaming”', hi: '“गेमिंग” के लिए कोई नतीजा नहीं मिला' },
  noResultsText: {
    en: 'Try a shorter word or check the spelling.',
    hi: 'कोई छोटा शब्द आज़माएँ या स्पेलिंग जाँच लें।',
  },
  noJobs: { en: 'No open roles right now', hi: 'अभी कोई पद ख़ाली नहीं है' },
  loading: { en: 'Skeleton and Spinner', hi: 'Skeleton और Spinner' },
  checking: { en: 'Checking for updates', hi: 'अपडेट देखे जा रहे हैं' },
  saving: { en: 'Saving…', hi: 'सेव हो रहा है…' },
} satisfies Record<string, Text>

const { light } = tokens
const AVATAR_PHOTO = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="${light['brand-accent']}"/><circle cx="80" cy="64" r="30" fill="${light.surface}"/><rect x="28" y="104" width="104" height="90" rx="46" fill="${light.surface}"/></svg>`,
)}`

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-fg-muted">{title}</h3>
      {children}
    </div>
  )
}

export default function ContentSection() {
  const locale = useLocale()
  const c = (text: Text) => (locale === 'hi' ? text.hi : text.en)

  return (
    <div className="space-y-10">
      <Group title={c(COPY.cards)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>{c(COPY.saas)}</CardTitle>
            <CardDescription>{c(COPY.saasText)}</CardDescription>
          </Card>
          <Card variant="raised">
            <CardTitle>{c(COPY.ai)}</CardTitle>
            <CardDescription>{c(COPY.aiText)}</CardDescription>
          </Card>
          <Card variant="interactive">
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status="live" />
              <PlatformBadge platform="web" />
            </div>
            <CardTitle href="/products/menumesh">MenuMesh</CardTitle>
            <CardDescription>{c(COPY.menumesh)}</CardDescription>
          </Card>
          <Card variant="interactive">
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status="beta" />
              <PlatformBadge platform="windows" />
            </div>
            <CardTitle href="/products/vyro">VYRO</CardTitle>
            <CardDescription>{c(COPY.vyro)}</CardDescription>
          </Card>
          <Card variant="interactive" className="sm:col-span-2">
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status="coming-soon" />
              <PlatformBadge platform="windows" />
            </div>
            <CardTitle href="/products/baby">Baby</CardTitle>
            <CardDescription>{c(COPY.baby)}</CardDescription>
          </Card>
        </div>
      </Group>

      <Group title={c(COPY.tags)}>
        <div className="flex flex-wrap items-center gap-2">
          <Tag>Rust</Tag>
          <Tag>Tauri</Tag>
          <Tag>{c(COPY.restaurants)}</Tag>
          <Tag>{c(COPY.onDevice)}</Tag>
        </div>
        <nav aria-label={c(COPY.tags)} className="flex flex-wrap items-center gap-2">
          <Tag asChild>
            <Link href="/blog" aria-current="page">
              {c(COPY.all)}
            </Link>
          </Tag>
          <Tag asChild>
            <Link href="/blog?tag=engineering">{c(COPY.engineering)}</Link>
          </Tag>
          <Tag asChild>
            <Link href="/blog?tag=releases">{c(COPY.releases)}</Link>
          </Tag>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Tag asChild>
            <button type="button" aria-pressed>
              <Check aria-hidden />
              {c(COPY.onDevice)}
            </button>
          </Tag>
          <Tag asChild>
            <button type="button" aria-pressed={false}>
              {c(COPY.restaurants)}
            </button>
          </Tag>
          <Tag asChild>
            <button type="button" aria-pressed={false} disabled>
              {c(COPY.hiring)}
            </button>
          </Tag>
        </div>
      </Group>

      <Group title={c(COPY.stats)}>
        <div className="grid gap-8 sm:grid-cols-2">
          <Stat value="3" label={c(COPY.products)} description={c(COPY.productsText)} />
          <Stat value="2" label={c(COPY.languages)} description={c(COPY.languagesText)} />
          <Stat value="4" label={c(COPY.pillars)} />
          <Stat
            value={
              <>
                1.4<span className="text-fg-subtle">.0</span>
              </>
            }
            label={c(COPY.release)}
          />
        </div>
      </Group>

      <Group title={c(COPY.accordion)}>
        <Accordion type="single" collapsible defaultValue="q1">
          <AccordionItem value="q1">
            <AccordionTrigger>{c(COPY.q1)}</AccordionTrigger>
            <AccordionContent>{c(COPY.a1)}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2">
            <AccordionTrigger>{c(COPY.q2)}</AccordionTrigger>
            <AccordionContent>{c(COPY.a2)}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="q4" disabled>
            <AccordionTrigger>{c(COPY.q4)}</AccordionTrigger>
            <AccordionContent>—</AccordionContent>
          </AccordionItem>
        </Accordion>
        <Accordion type="multiple" defaultValue={['q2', 'q3']}>
          <AccordionItem value="q2">
            <AccordionTrigger>{c(COPY.q2)}</AccordionTrigger>
            <AccordionContent>{c(COPY.a2)}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="q3">
            <AccordionTrigger>{c(COPY.q3)}</AccordionTrigger>
            <AccordionContent>{c(COPY.a3)}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Group>

      <Group title={c(COPY.tabs)}>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{c(COPY.overview)}</TabsTrigger>
            <TabsTrigger value="features">{c(COPY.features)}</TabsTrigger>
            <TabsTrigger value="requirements">{c(COPY.requirements)}</TabsTrigger>
            <TabsTrigger value="changelog" disabled>
              {c(COPY.changelog)}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-fg-muted">
            {c(COPY.overviewText)}
          </TabsContent>
          <TabsContent value="features" className="text-fg-muted">
            {c(COPY.featuresText)}
          </TabsContent>
          <TabsContent value="requirements" className="text-fg-muted">
            {c(COPY.requirementsText)}
          </TabsContent>
        </Tabs>
      </Group>

      <Group title={c(COPY.steps)}>
        <Steps
          steps={[
            { title: c(COPY.discover), description: c(COPY.discoverText) },
            { title: c(COPY.design), description: c(COPY.designText) },
            { title: c(COPY.buildStep), description: c(COPY.buildText) },
            { title: c(COPY.support), description: c(COPY.supportText) },
          ]}
        />
      </Group>

      <Group title={c(COPY.quotes)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <Quote name="Riya Sharma" role={c(COPY.owner)} company={c(COPY.cafe)}>
              {c(COPY.quote1)}
            </Quote>
          </Card>
          <Card>
            <Quote name="Arjun Mehta" role={c(COPY.itLead)} image={AVATAR_PHOTO}>
              {c(COPY.quote2)}
            </Quote>
          </Card>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name="Riya Sharma" size="sm" />
          <Avatar name="Riya Sharma" />
          <Avatar name="Riya Sharma" size="lg" />
          <Avatar name="अनन्या वर्मा" size="lg" />
          <Avatar name="Arjun Mehta" image={AVATAR_PHOTO} size="sm" />
          <Avatar name="Arjun Mehta" image={AVATAR_PHOTO} />
          <Avatar name="Arjun Mehta" image={AVATAR_PHOTO} size="lg" />
        </div>
      </Group>

      <Group title={c(COPY.table)}>
        <Table caption={c(COPY.tableCaption)}>
          <thead>
            <tr>
              <th scope="col">{c(COPY.part)}</th>
              <th scope="col">{c(COPY.minimum)}</th>
              <th scope="col">{c(COPY.recommended)}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{c(COPY.os)}</th>
              <td>Windows 10, 64-bit</td>
              <td>Windows 11</td>
            </tr>
            <tr>
              <th scope="row">{c(COPY.cpu)}</th>
              <td>{c(COPY.anyCpu)}</td>
              <td>{c(COPY.recentCpu)}</td>
            </tr>
            <tr>
              <th scope="row">{c(COPY.memory)}</th>
              <td>4 GB</td>
              <td>8 GB</td>
            </tr>
            <tr>
              <th scope="row">{c(COPY.disk)}</th>
              <td>50 MB</td>
              <td>100 MB</td>
            </tr>
          </tbody>
        </Table>
        <Table caption={c(COPY.wideCaption)} className="min-w-[36rem]">
          <thead>
            <tr>
              <th scope="col">{c(COPY.pillar)}</th>
              <th scope="col">{c(COPY.whatWeBuild)}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{c(COPY.saas)}</th>
              <td>{c(COPY.saasText)}</td>
            </tr>
            <tr>
              <th scope="row">{c(COPY.ai)}</th>
              <td>{c(COPY.aiText)}</td>
            </tr>
            <tr>
              <th scope="row">{c(COPY.cloud)}</th>
              <td>{c(COPY.cloudText)}</td>
            </tr>
          </tbody>
        </Table>
      </Group>

      <Group title={c(COPY.callouts)}>
        <Callout title={c(COPY.plansTitle)}>{c(COPY.plansText)}</Callout>
        <Callout tone="success" title={c(COPY.publishedTitle)}>
          {c(COPY.publishedText)}
        </Callout>
        <Callout tone="warning">{c(COPY.draftText)}</Callout>
        <Callout tone="danger" title={c(COPY.uninstallTitle)}>
          {c(COPY.uninstallText)}
        </Callout>
      </Group>

      <Group title={c(COPY.empty)}>
        <EmptyState
          icon={<Newspaper />}
          title={c(COPY.noPosts)}
          description={c(COPY.noPostsText)}
          action={<Button variant="secondary">{c(COPY.subscribe)}</Button>}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            icon={<SearchX />}
            title={c(COPY.noResults)}
            description={c(COPY.noResultsText)}
          />
          <EmptyState title={c(COPY.noJobs)} />
        </div>
      </Group>

      <Group title={c(COPY.loading)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="space-y-3">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </Card>
          <Card className="space-y-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </Card>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Spinner className="size-4" />
          <Spinner />
          <Spinner className="size-8 text-primary" label={c(COPY.checking)} />
          <Button variant="secondary" disabled>
            <Spinner aria-hidden className="size-[1.1em] text-current" />
            {c(COPY.saving)}
          </Button>
        </div>
      </Group>
    </div>
  )
}

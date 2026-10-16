'use client'

import { ChevronDown, RotateCcw } from 'lucide-react'
import { useLocale } from 'next-intl'
import { NavigationMenu } from 'radix-ui'
import type { ReactNode } from 'react'

import { AnnouncementBar, type AnnouncementBarProps } from '@/components/layout/AnnouncementBar'
import { Breadcrumbs, type BreadcrumbsProps } from '@/components/layout/Breadcrumbs'
import { Container } from '@/components/layout/Container'
import { Footer, type FooterProps } from '@/components/layout/Footer'
import { Header, type HeaderNavItem } from '@/components/layout/Header'
import { LanguageSuggestionBanner } from '@/components/layout/LanguageSuggestion'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { Logo } from '@/components/layout/Logo'
import { MegaMenu, type MenuProduct } from '@/components/layout/MegaMenu'
import { ProductSubNav } from '@/components/layout/ProductSubNav'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Button, buttonVariants } from '@/components/ui/Button'

// Sample content (stands in for CMS data), not UI chrome.
type Copy = {
  nav: HeaderNavItem[]
  products: MenuProduct[]
  columns: FooterProps['columns']
  demos: Record<
    | 'header'
    | 'mobile'
    | 'megaMenu'
    | 'footer'
    | 'footerMinimal'
    | 'announcement'
    | 'breadcrumbs'
    | 'subNav'
    | 'suggestion'
    | 'controls',
    [title: string, note: string]
  >
  filler: string
  newsletter: [title: string, text: string]
  announcements: AnnouncementBarProps[]
  crumbs: BreadcrumbsProps['items'][]
  reset: string
}

const SOCIALS: FooterProps['socials'] = [
  { platform: 'linkedin', url: 'https://www.linkedin.com/' },
  { platform: 'x', url: 'https://x.com/' },
  { platform: 'instagram', url: 'https://www.instagram.com/' },
  { platform: 'youtube', url: 'https://www.youtube.com/' },
  { platform: 'github', url: 'https://github.com/' },
  { platform: 'facebook', url: 'https://www.facebook.com/' },
]

// Real details come from siteSettings; until Tanishq provides them they stay placeholders.
const LEGAL: FooterProps['legal'] = {
  legalName: 'Jainav Infotech Private Limited',
  cin: '{{CIN}}',
  registeredAddress: '{{REGISTERED_ADDRESS}}',
  email: '{{EMAIL}}',
  phone: '{{PHONE}}',
}

const COPY: Record<'en' | 'hi', Copy> = {
  en: {
    nav: [
      { label: 'Products', href: '/products', megaMenu: 'products' },
      { label: 'Services', href: '/services' },
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
    products: [
      {
        name: 'MenuMesh',
        slug: 'menumesh',
        status: 'live',
        tagline: 'QR table ordering for restaurants.',
      },
      { name: 'VYRO', slug: 'vyro', status: 'beta', tagline: 'Know your machine.' },
      {
        name: 'Baby',
        slug: 'baby',
        status: 'coming-soon',
        tagline: 'Your private voice assistant for Windows.',
      },
    ],
    columns: [
      {
        title: 'Products',
        links: [
          { label: 'MenuMesh', href: '/products/menumesh' },
          { label: 'VYRO', href: '/products/vyro' },
          { label: 'Baby', href: '/products/baby' },
          { label: 'All products', href: '/products' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'Services', href: '/services' },
          { label: 'About', href: '/about' },
          { label: 'Careers', href: '/careers' },
          { label: 'Blog', href: '/blog' },
          { label: 'Changelog', href: '/changelog' },
          { label: 'Contact', href: '/contact' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacy policy', href: '/legal/privacy' },
          { label: 'Terms of service', href: '/legal/terms' },
          { label: 'Refund and cancellation policy', href: '/legal/refunds' },
          { label: 'End-user licence agreement', href: '/legal/eula' },
        ],
      },
    ],
    demos: {
      header: [
        'Header · desktop',
        'Shown at 1152px; scroll sideways. Hover or press Enter on Products for the mega-menu. Once the page scrolls it compacts: a background, blur and shadow fade in and the row moves up, but the layout below never shifts.',
      ],
      mobile: [
        'Header · mobile',
        'Below the desktop breakpoint the menu button opens a full-screen menu.',
      ],
      megaMenu: ['Mega-menu', 'Open here for review; click outside to close it.'],
      footer: [
        'Footer',
        'Link columns, newsletter slot, social links, language switch and the legal block.',
      ],
      footerMinimal: ['Footer · minimal', 'Only the parts that exist are shown.'],
      announcement: ['Announcement bar', 'Dismissing it is remembered for that announcement id.'],
      breadcrumbs: ['Breadcrumbs', 'The last item is the current page. Long trails wrap.'],
      subNav: [
        'Product sub-navigation',
        'Sticky under the header on hosted products; scrolls sideways on phones.',
      ],
      suggestion: [
        'Language suggestion',
        'Floats on English pages for browsers that prefer Hindi, until a language is chosen. Shown inline here.',
      ],
      controls: [
        'Logo, language switch, theme toggle',
        'Used in the header, mobile menu and footer.',
      ],
    },
    filler:
      'MenuMesh, VYRO and Baby are software products built and run by Jainav Infotech in Indore. We also build custom software for businesses.',
    newsletter: [
      'Product updates, once a month',
      'New releases from MenuMesh, VYRO and Baby. The sign-up form arrives in Phase 4.',
    ],
    announcements: [
      {
        id: 'styleguide-baby',
        text: 'Baby is coming soon: a private voice assistant for Windows.',
        link: { label: 'Join the waitlist', href: '/products/baby' },
      },
      { id: 'styleguide-plain', text: 'Our office is closed on 2 October.' },
    ],
    crumbs: [
      [
        { label: 'Home', href: '/' },
        { label: 'Products', href: '/products' },
        { label: 'VYRO', href: '/products/vyro' },
        { label: 'Pricing' },
      ],
      [
        { label: 'Home', href: '/' },
        { label: 'Blog', href: '/blog' },
        { label: 'How Baby keeps its wake word, speech recognition and memory on your own PC' },
      ],
      [{ label: 'Home' }],
    ],
    reset: 'Show dismissed demos again',
  },
  hi: {
    nav: [
      { label: 'प्रोडक्ट', href: '/products', megaMenu: 'products' },
      { label: 'सेवाएँ', href: '/services' },
      { label: 'हमारे बारे में', href: '/about' },
      { label: 'ब्लॉग', href: '/blog' },
      { label: 'संपर्क', href: '/contact' },
    ],
    products: [
      {
        name: 'MenuMesh',
        slug: 'menumesh',
        status: 'live',
        tagline: 'रेस्टोरेंट के लिए QR से टेबल पर ऑर्डर।',
      },
      { name: 'VYRO', slug: 'vyro', status: 'beta', tagline: 'अपनी मशीन को पहचानें।' },
      {
        name: 'Baby',
        slug: 'baby',
        status: 'coming-soon',
        tagline: 'Windows के लिए आपका निजी वॉइस असिस्टेंट।',
      },
    ],
    columns: [
      {
        title: 'प्रोडक्ट',
        links: [
          { label: 'MenuMesh', href: '/products/menumesh' },
          { label: 'VYRO', href: '/products/vyro' },
          { label: 'Baby', href: '/products/baby' },
          { label: 'सभी प्रोडक्ट', href: '/products' },
        ],
      },
      {
        title: 'कंपनी',
        links: [
          { label: 'सेवाएँ', href: '/services' },
          { label: 'हमारे बारे में', href: '/about' },
          { label: 'करियर', href: '/careers' },
          { label: 'ब्लॉग', href: '/blog' },
          { label: 'चेंजलॉग', href: '/changelog' },
          { label: 'संपर्क', href: '/contact' },
        ],
      },
      {
        title: 'क़ानूनी',
        links: [
          { label: 'गोपनीयता नीति', href: '/legal/privacy' },
          { label: 'सेवा की शर्तें', href: '/legal/terms' },
          { label: 'रिफ़ंड और कैंसलेशन नीति', href: '/legal/refunds' },
          { label: 'एंड-यूज़र लाइसेंस अनुबंध', href: '/legal/eula' },
        ],
      },
    ],
    demos: {
      header: [
        'हेडर · डेस्कटॉप',
        '1152px पर दिखाया गया है; बगल में स्क्रॉल करें। मेगा-मेन्यू के लिए "प्रोडक्ट" पर माउस ले जाएँ या Enter दबाएँ। पेज स्क्रॉल होते ही हेडर सिमट जाता है: बैकग्राउंड, ब्लर और शैडो उभरते हैं और पंक्ति ऊपर खिसकती है, पर नीचे का लेआउट कभी नहीं हिलता।',
      ],
      mobile: [
        'हेडर · मोबाइल',
        'डेस्कटॉप ब्रेकपॉइंट से छोटी स्क्रीन पर मेन्यू बटन पूरी स्क्रीन वाला मेन्यू खोलता है।',
      ],
      megaMenu: ['मेगा-मेन्यू', 'देखने के लिए यहाँ खुला है; बंद करने के लिए बाहर क्लिक करें।'],
      footer: [
        'फ़ुटर',
        'लिंक कॉलम, न्यूज़लेटर की जगह, सोशल लिंक, भाषा बदलने का विकल्प और क़ानूनी जानकारी।',
      ],
      footerMinimal: ['फ़ुटर · न्यूनतम', 'सिर्फ़ वही हिस्से दिखते हैं जो मौजूद हैं।'],
      announcement: ['घोषणा पट्टी', 'बंद करने पर उस घोषणा की id के लिए याद रखा जाता है।'],
      breadcrumbs: [
        'ब्रेडक्रंब',
        'आख़िरी आइटम मौजूदा पेज है। लंबा रास्ता अगली लाइन में चला जाता है।',
      ],
      subNav: [
        'प्रोडक्ट सब-नेविगेशन',
        'होस्ट किए गए प्रोडक्ट पर हेडर के नीचे टिका रहता है; फ़ोन पर बगल में स्क्रॉल होता है।',
      ],
      suggestion: [
        'भाषा सुझाव',
        'हिंदी पसंद करने वाले ब्राउज़र को अंग्रेज़ी पेज पर दिखता है, जब तक भाषा न चुनी जाए। यहाँ पेज के अंदर दिखाया गया है।',
      ],
      controls: [
        'लोगो, भाषा और थीम बदलने के बटन',
        'हेडर, मोबाइल मेन्यू और फ़ुटर में इस्तेमाल होते हैं।',
      ],
    },
    filler:
      'MenuMesh, VYRO और Baby, जैनव इन्फोटेक के बनाए और इंदौर से चलाए जाने वाले सॉफ़्टवेयर प्रोडक्ट हैं। हम व्यवसायों के लिए कस्टम सॉफ़्टवेयर भी बनाते हैं।',
    newsletter: [
      'प्रोडक्ट अपडेट, महीने में एक बार',
      'MenuMesh, VYRO और Baby की नई रिलीज़। साइन-अप फ़ॉर्म फ़ेज़ 4 में आएगा।',
    ],
    announcements: [
      {
        id: 'styleguide-baby',
        text: 'Baby जल्द आ रहा है: Windows के लिए एक निजी वॉइस असिस्टेंट, जो अंग्रेज़ी, हिंदी और हिंग्लिश समझता है और आपकी आवाज़ को आपके कंप्यूटर पर ही रखता है।',
        link: { label: 'वेटलिस्ट में शामिल हों', href: '/products/baby' },
      },
      { id: 'styleguide-plain', text: '2 अक्टूबर को हमारा ऑफ़िस बंद रहेगा।' },
    ],
    crumbs: [
      [
        { label: 'होम', href: '/' },
        { label: 'प्रोडक्ट', href: '/products' },
        { label: 'VYRO', href: '/products/vyro' },
        { label: 'कीमतें' },
      ],
      [
        { label: 'होम', href: '/' },
        { label: 'ब्लॉग', href: '/blog' },
        {
          label:
            'Baby अपना वेक वर्ड, आवाज़ पहचानने की सुविधा और मेमोरी आपके अपने कंप्यूटर पर कैसे रखता है',
        },
      ],
      [{ label: 'होम' }],
    ],
    reset: 'बंद किए गए डेमो फिर दिखाएँ',
  },
}

function Demo({ demo: [title, note], children }: { demo: [string, string]; children: ReactNode }) {
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

const frame = 'rounded-lg border border-border bg-bg'

function resetDismissed() {
  try {
    localStorage.removeItem('jv-announcement-dismissed')
    localStorage.removeItem('jv-lang-pref')
  } catch {
    // Nothing stored.
  }
  window.location.reload()
}

export default function NavigationSection() {
  const c = COPY[useLocale() === 'hi' ? 'hi' : 'en']
  const products = c.nav[0]!

  return (
    <div className="space-y-12">
      <Demo demo={c.demos.header}>
        <div className={`${frame} overflow-x-auto`}>
          <div className="min-h-[30rem] w-[72rem]">
            <Header nav={c.nav} products={c.products} showAccount />
            <Container className="py-10">
              <p className="max-w-2xl text-fg-muted">{c.filler}</p>
            </Container>
          </div>
        </div>
      </Demo>

      <Demo demo={c.demos.mobile}>
        <div className={`${frame} max-w-[23.4375rem] overflow-hidden`}>
          <Header nav={c.nav} products={c.products} />
          <Container className="py-6">
            <p className="text-sm text-fg-muted">{c.filler}</p>
          </Container>
        </div>
      </Demo>

      <Demo demo={c.demos.megaMenu}>
        <div className={`${frame} min-h-[27rem] overflow-x-auto p-3`}>
          <NavigationMenu.Root defaultValue="products" aria-label={c.demos.megaMenu[0]}>
            <NavigationMenu.List>
              <NavigationMenu.Item value="products">
                <NavigationMenu.Trigger
                  className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                >
                  {products.label}
                  <ChevronDown aria-hidden />
                </NavigationMenu.Trigger>
                <MegaMenu products={c.products} href={products.href} />
              </NavigationMenu.Item>
            </NavigationMenu.List>
          </NavigationMenu.Root>
        </div>
      </Demo>

      <Demo demo={c.demos.footer}>
        <div className={`${frame} overflow-hidden`}>
          <Footer
            columns={c.columns}
            socials={SOCIALS}
            legal={LEGAL}
            newsletter={
              <div className="rounded-lg border border-dashed border-border-strong p-4">
                <p className="font-medium text-fg">{c.newsletter[0]}</p>
                <p className="mt-1 text-sm text-fg-muted">{c.newsletter[1]}</p>
              </div>
            }
          />
        </div>
      </Demo>

      <Demo demo={c.demos.footerMinimal}>
        <div className={`${frame} overflow-hidden`}>
          <Footer
            columns={c.columns.slice(2)}
            socials={[]}
            legal={{ legalName: LEGAL.legalName }}
          />
        </div>
      </Demo>

      <Demo demo={c.demos.announcement}>
        <div className="space-y-3">
          {c.announcements.map((announcement) => (
            <div key={announcement.id} className="overflow-hidden rounded-lg">
              <AnnouncementBar {...announcement} />
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={resetDismissed}>
            <RotateCcw aria-hidden />
            {c.reset}
          </Button>
        </div>
      </Demo>

      <Demo demo={c.demos.breadcrumbs}>
        <div className="space-y-3">
          {c.crumbs.map((items, i) => (
            <Breadcrumbs key={i} items={items} />
          ))}
        </div>
      </Demo>

      <Demo demo={c.demos.subNav}>
        <div className="space-y-3">
          <div className={`${frame} overflow-hidden`}>
            <ProductSubNav slug="vyro" name="VYRO" active="pricing" />
          </div>
          <div className={`${frame} max-w-xs overflow-hidden`}>
            <ProductSubNav slug="vyro" name="VYRO" active="support" />
          </div>
        </div>
      </Demo>

      <Demo demo={c.demos.suggestion}>
        <LanguageSuggestionBanner className="max-w-sm" />
      </Demo>

      <Demo demo={c.demos.controls}>
        <div className="flex flex-wrap items-center gap-4">
          <Logo />
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </Demo>
    </div>
  )
}

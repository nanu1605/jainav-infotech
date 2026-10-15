/**
 * Seed content from spec Appendix A: drafts to confirm, English plus draft Hindi.
 * {{LIKE_THIS}} values are placeholders only Tanishq can provide (spec §21); nothing here is a
 * real company detail, price or URL. Product accent colors are placeholders too.
 */
import type { CollectionSlug, RequiredDataFromCollectionSlug } from 'payload'

import { richText } from './richText'

/** Hindi values for localized leaf fields; arrays are matched to the English rows by index. */
export type HiPatch = { [key: string]: string | HiPatch | HiPatch[] | undefined }
export type SeedDoc<S extends CollectionSlug> = {
  en: RequiredDataFromCollectionSlug<S>
  hi: HiPatch
}

const draftHi = { hiStatus: 'draft' } as const

// ─── Products ────────────────────────────────────────────────────────────────

export const products: SeedDoc<'products'>[] = [
  {
    en: {
      name: 'MenuMesh',
      slug: 'menumesh',
      tagline: 'QR table ordering for restaurants.',
      summary:
        'Guests scan the table QR, browse the menu and order from their phone. Orders reach waiters and the kitchen instantly, and managers handle menus, prices, per-table billing and printed bills.',
      type: 'saas',
      category: 'restaurants',
      platforms: ['web'],
      status: 'live', // {{CONFIRM}}
      hostingMode: 'external',
      externalUrl: null, // {{MENUMESH_URL}}
      accentColor: '#EA580C', // placeholder
      primaryButton: { type: 'visit' },
      featured: true,
      sortOrder: 1,
      ...draftHi,
      layout: [
        {
          blockType: 'productHero',
          eyebrow: 'MenuMesh by Jainav',
          heading: 'QR table ordering for restaurants.',
          subheading: 'Guests order from their phone. The kitchen sees it instantly.',
          animation: 'menumesh',
        },
        {
          blockType: 'howItWorks',
          heading: 'How it works',
          steps: [
            { title: 'Scan the table QR', text: 'Each table has its own QR code.' },
            {
              title: 'Browse the menu',
              text: 'The menu opens on the guest’s phone. No app to install.',
            },
            { title: 'Order', text: 'The order is linked to the table and the waiter serving it.' },
            { title: 'Kitchen gets it', text: 'Waiters and the kitchen see new orders at once.' },
          ],
        },
        {
          blockType: 'featureGrid',
          heading: 'Everything a busy floor needs',
          items: [
            { icon: 'qr-code', title: 'Table QR ordering' },
            { icon: 'user-round-check', title: 'A waiter assigned to each table order' },
            { icon: 'chef-hat', title: 'Waiter and kitchen panel', text: 'Mark dishes as served.' },
            {
              icon: 'layout-dashboard',
              title: 'Manager panel',
              text: 'Menu, pricing, per-table bills, printed bills and order history.',
            },
            { icon: 'rotate-ccw', title: 'Tables reset after billing' },
            { icon: 'bar-chart-3', title: 'Waiter reports', text: 'On the Growth and Pro plans.' },
            { icon: 'store', title: 'Multi-restaurant management' },
          ],
        },
        {
          blockType: 'ctaBand',
          heading: 'Bring QR ordering to your restaurant',
          useProductButtons: true,
        },
      ],
    },
    hi: {
      tagline: 'रेस्टोरेंट के लिए QR टेबल ऑर्डरिंग।',
      summary:
        'मेहमान टेबल का QR स्कैन करते हैं, मेन्यू देखते हैं और अपने फ़ोन से ऑर्डर करते हैं। ऑर्डर तुरंत वेटर और किचन तक पहुँचते हैं, और मैनेजर मेन्यू, दाम, हर टेबल का बिल और प्रिंटेड बिल संभालते हैं।',
      layout: [
        {
          eyebrow: 'MenuMesh, Jainav की ओर से',
          heading: 'रेस्टोरेंट के लिए QR टेबल ऑर्डरिंग।',
          subheading: 'मेहमान फ़ोन से ऑर्डर करते हैं। किचन को तुरंत दिखता है।',
        },
        {
          heading: 'यह कैसे काम करता है',
          steps: [
            { title: 'टेबल का QR स्कैन करें', text: 'हर टेबल का अपना QR कोड होता है।' },
            {
              title: 'मेन्यू देखें',
              text: 'मेन्यू मेहमान के फ़ोन पर खुलता है। कोई ऐप इंस्टॉल नहीं करना।',
            },
            { title: 'ऑर्डर करें', text: 'ऑर्डर टेबल और उसे सर्व करने वाले वेटर से जुड़ जाता है।' },
            { title: 'किचन तक पहुँचे', text: 'वेटर और किचन नए ऑर्डर तुरंत देखते हैं।' },
          ],
        },
        {
          heading: 'व्यस्त रेस्टोरेंट की हर ज़रूरत',
          items: [
            { title: 'टेबल QR ऑर्डरिंग' },
            { title: 'हर टेबल ऑर्डर के लिए तय वेटर' },
            { title: 'वेटर और किचन पैनल', text: 'सर्व किए गए व्यंजन मार्क करें।' },
            {
              title: 'मैनेजर पैनल',
              text: 'मेन्यू, दाम, हर टेबल का बिल, प्रिंटेड बिल और ऑर्डर हिस्ट्री।',
            },
            { title: 'बिलिंग के बाद टेबल रीसेट' },
            { title: 'वेटर रिपोर्ट', text: 'Growth और Pro प्लान में।' },
            { title: 'कई रेस्टोरेंट का प्रबंधन' },
          ],
        },
        { heading: 'अपने रेस्टोरेंट में QR ऑर्डरिंग लाएँ' },
      ],
    },
  },
  {
    en: {
      name: 'Baby',
      slug: 'baby',
      tagline: 'Your private voice assistant for Windows.',
      summary:
        'Talk to your PC in English, Hindi or Hinglish. The wake word, speech recognition, voice and memory run on your computer; only what’s needed to answer goes to the AI model.',
      type: 'desktop',
      category: 'assistants',
      platforms: ['windows'],
      status: 'coming-soon',
      hostingMode: 'external',
      externalUrl: null, // {{BABY_URL}}
      accentColor: '#9333EA', // placeholder
      // While Baby is coming soon the button resolves to "Join the waitlist" (spec §8.5).
      primaryButton: { type: 'contact' },
      featured: true,
      sortOrder: 3,
      ...draftHi,
      layout: [
        {
          blockType: 'productHero',
          eyebrow: 'Baby by Jainav',
          heading: 'Your private voice assistant for Windows.',
          subheading: 'Talk to your PC in English, Hindi or Hinglish.',
          animation: 'baby',
        },
        {
          blockType: 'privacy',
          heading: 'What stays on your PC',
          local: [
            { text: 'Wake word' },
            { text: 'Speech-to-text' },
            { text: 'Voice' },
            { text: 'Memory' },
          ],
          cloud: [
            { text: 'The text of your request (and relevant memory context) for the AI model' },
          ],
          note: 'To be confirmed before publishing.',
        },
        {
          blockType: 'featureGrid',
          heading: 'What Baby does',
          items: [
            { icon: 'audio-lines', title: 'Wake word' },
            { icon: 'mic', title: 'On-device speech recognition' },
            { icon: 'volume-2', title: 'Natural voice' },
            { icon: 'languages', title: 'English, Hindi and Hinglish' },
            { icon: 'brain', title: 'Local memory' },
            { icon: 'shield-check', title: 'Safe, allow-listed system actions' },
          ],
        },
      ],
    },
    hi: {
      tagline: 'Windows के लिए आपका निजी वॉइस असिस्टेंट।',
      summary:
        'अपने PC से अंग्रेज़ी, हिंदी या हिंग्लिश में बात करें। वेक वर्ड, स्पीच रिकग्निशन, आवाज़ और मेमोरी आपके कंप्यूटर पर चलते हैं; जवाब के लिए ज़रूरी जानकारी ही AI मॉडल तक जाती है।',
      layout: [
        {
          eyebrow: 'Baby, Jainav की ओर से',
          heading: 'Windows के लिए आपका निजी वॉइस असिस्टेंट।',
          subheading: 'अपने PC से अंग्रेज़ी, हिंदी या हिंग्लिश में बात करें।',
        },
        {
          heading: 'आपके PC पर क्या रहता है',
          local: [
            { text: 'वेक वर्ड' },
            { text: 'स्पीच-टू-टेक्स्ट' },
            { text: 'आवाज़' },
            { text: 'मेमोरी' },
          ],
          cloud: [{ text: 'AI मॉडल के लिए आपके अनुरोध का टेक्स्ट (और ज़रूरी मेमोरी संदर्भ)' }],
          note: 'प्रकाशित करने से पहले पुष्टि की जाएगी।',
        },
        {
          heading: 'Baby क्या करता है',
          items: [
            { title: 'वेक वर्ड' },
            { title: 'डिवाइस पर स्पीच रिकग्निशन' },
            { title: 'स्वाभाविक आवाज़' },
            { title: 'अंग्रेज़ी, हिंदी और हिंग्लिश' },
            { title: 'लोकल मेमोरी' },
            { title: 'सुरक्षित, अनुमति-सूची वाले सिस्टम एक्शन' },
          ],
        },
      ],
    },
  },
  {
    en: {
      name: 'VYRO',
      slug: 'vyro',
      tagline: 'Know your machine.',
      summary:
        'Live temperatures, fan speeds, voltages and clocks for your CPU, GPU, RAM, storage and motherboard, plus full system and multi-monitor details, in a light, fast app with animated gauges.',
      type: 'desktop',
      category: 'pc-tools',
      platforms: ['windows'],
      status: 'beta', // {{CONFIRM}}
      hostingMode: 'hosted',
      accentColor: '#0891B2', // placeholder
      primaryButton: { type: 'download', channel: 'stable' },
      // secondaryButton (Buy Pro) is linked to the Pro plan once plans exist (see seed.ts).
      featured: true,
      sortOrder: 2,
      ...draftHi,
      layout: [
        {
          blockType: 'productHero',
          eyebrow: 'VYRO by Jainav',
          heading: 'Know your machine.',
          subheading: 'Live temperatures, fan speeds, voltages and clocks in a light, fast app.',
          animation: 'vyro',
        },
        {
          blockType: 'featureGrid',
          heading: 'Every sensor, one glance',
          items: [
            {
              icon: 'gauge',
              title: 'Animated CPU and GPU speedometers',
              text: 'With live clock speeds.',
            },
            {
              icon: 'thermometer',
              title: 'Temperatures',
              text: 'CPU, GPU, RAM, storage and motherboard.',
            },
            { icon: 'fan', title: 'Every fan speed' },
            { icon: 'zap', title: 'Voltages and clocks' },
            { icon: 'cpu', title: 'Full system information' },
            { icon: 'monitor', title: 'Single and multi-monitor details' },
            {
              icon: 'scan-search',
              title: 'Reads sensors directly',
              text: 'No third-party monitoring tools.',
            },
            {
              icon: 'feather',
              title: 'Low CPU and memory use',
              text: 'Built with Rust and Tauri.',
            },
          ],
        },
        { blockType: 'pricing', heading: 'Free and Pro', source: 'plans' },
        { blockType: 'download', heading: 'Download VYRO', channel: 'stable' },
      ],
    },
    hi: {
      tagline: 'अपनी मशीन को जानिए।',
      summary:
        'आपके CPU, GPU, RAM, स्टोरेज और मदरबोर्ड का लाइव तापमान, फ़ैन स्पीड, वोल्टेज और क्लॉक, साथ ही पूरी सिस्टम और मल्टी-मॉनिटर जानकारी, एनिमेटेड गेज वाले हल्के और तेज़ ऐप में।',
      layout: [
        {
          eyebrow: 'VYRO, Jainav की ओर से',
          heading: 'अपनी मशीन को जानिए।',
          subheading: 'लाइव तापमान, फ़ैन स्पीड, वोल्टेज और क्लॉक, एक हल्के और तेज़ ऐप में।',
        },
        {
          heading: 'हर सेंसर, एक नज़र में',
          items: [
            { title: 'एनिमेटेड CPU और GPU स्पीडोमीटर', text: 'लाइव क्लॉक स्पीड के साथ।' },
            { title: 'तापमान', text: 'CPU, GPU, RAM, स्टोरेज और मदरबोर्ड।' },
            { title: 'हर फ़ैन की स्पीड' },
            { title: 'वोल्टेज और क्लॉक' },
            { title: 'पूरी सिस्टम जानकारी' },
            { title: 'सिंगल और मल्टी-मॉनिटर जानकारी' },
            {
              title: 'सेंसर सीधे पढ़ता है',
              text: 'किसी थर्ड-पार्टी मॉनिटरिंग टूल की ज़रूरत नहीं।',
            },
            { title: 'कम CPU और मेमोरी उपयोग', text: 'Rust और Tauri से बना।' },
          ],
        },
        { heading: 'Free और Pro' },
        { heading: 'VYRO डाउनलोड करें' },
      ],
    },
  },
]

/** VYRO plans. Free vs Pro feature split and the Pro price are {{TO_DECIDE}} (spec Appendix A). */
export const vyroPlans: {
  en: Omit<RequiredDataFromCollectionSlug<'plans'>, 'product'>
  hi: HiPatch
}[] = [
  {
    en: {
      code: 'free',
      name: 'Free',
      billing: 'one_time',
      priceINR: 0,
      active: true,
      sortOrder: 1,
    },
    hi: { name: 'फ़्री' },
  },
  {
    // Inactive until the price is decided; 12 months of updates and 2 devices are the spec §22 defaults.
    en: {
      code: 'pro',
      name: 'Pro',
      billing: 'one_time',
      priceINR: null, // {{TO_DECIDE}}
      maxActivations: 2,
      updatesForMonths: 12,
      highlight: true,
      active: false,
      sortOrder: 2,
    },
    hi: { name: 'प्रो' },
  },
]

// ─── Services ────────────────────────────────────────────────────────────────

export const services: (SeedDoc<'services'> & { related: string[] })[] = [
  {
    related: ['menumesh', 'vyro', 'baby'],
    en: {
      title: 'Custom software & SaaS',
      slug: 'custom-software',
      summary: 'Web apps, SaaS platforms, and mobile and desktop apps.',
      icon: 'code',
      sortOrder: 1,
      capabilities: [
        { text: 'Web apps' },
        { text: 'SaaS platforms' },
        { text: 'Mobile and desktop apps' },
      ],
      ...draftHi,
    },
    hi: {
      title: 'कस्टम सॉफ़्टवेयर और SaaS',
      summary: 'वेब ऐप, SaaS प्लेटफ़ॉर्म, और मोबाइल व डेस्कटॉप ऐप।',
      capabilities: [
        { text: 'वेब ऐप' },
        { text: 'SaaS प्लेटफ़ॉर्म' },
        { text: 'मोबाइल और डेस्कटॉप ऐप' },
      ],
    },
  },
  {
    related: ['baby'],
    en: {
      title: 'AI & ML solutions',
      slug: 'ai-ml',
      summary: 'LLM apps and assistants, search and RAG, automation, forecasting and analytics.',
      icon: 'brain',
      sortOrder: 2,
      capabilities: [
        { text: 'LLM apps and assistants' },
        { text: 'Search and RAG' },
        { text: 'Automation' },
        { text: 'Forecasting and analytics' },
      ],
      ...draftHi,
    },
    hi: {
      title: 'AI और ML समाधान',
      summary: 'LLM ऐप और असिस्टेंट, सर्च और RAG, ऑटोमेशन, फ़ोरकास्टिंग और एनालिटिक्स।',
      capabilities: [
        { text: 'LLM ऐप और असिस्टेंट' },
        { text: 'सर्च और RAG' },
        { text: 'ऑटोमेशन' },
        { text: 'फ़ोरकास्टिंग और एनालिटिक्स' },
      ],
    },
  },
  {
    related: [],
    en: {
      title: 'Cloud & DevOps',
      slug: 'cloud-devops',
      summary: 'CI/CD, containers, cloud setup, monitoring and cost tuning.',
      icon: 'cloud-cog',
      sortOrder: 3,
      capabilities: [
        { text: 'CI/CD' },
        { text: 'Containers' },
        { text: 'Cloud setup' },
        { text: 'Monitoring' },
        { text: 'Cost tuning' },
      ],
      ...draftHi,
    },
    hi: {
      title: 'क्लाउड और DevOps',
      summary: 'CI/CD, कंटेनर, क्लाउड सेटअप, मॉनिटरिंग और लागत अनुकूलन।',
      capabilities: [
        { text: 'CI/CD' },
        { text: 'कंटेनर' },
        { text: 'क्लाउड सेटअप' },
        { text: 'मॉनिटरिंग' },
        { text: 'लागत अनुकूलन' },
      ],
    },
  },
  {
    related: ['menumesh'],
    en: {
      title: 'E-commerce & web platforms',
      slug: 'ecommerce-web',
      summary: 'Online stores, marketplaces, portals and fast marketing sites.',
      icon: 'shopping-cart',
      sortOrder: 4,
      capabilities: [
        { text: 'Online stores' },
        { text: 'Marketplaces' },
        { text: 'Portals' },
        { text: 'Fast marketing sites' },
      ],
      ...draftHi,
    },
    hi: {
      title: 'ई-कॉमर्स और वेब प्लेटफ़ॉर्म',
      summary: 'ऑनलाइन स्टोर, मार्केटप्लेस, पोर्टल और तेज़ मार्केटिंग साइट।',
      capabilities: [
        { text: 'ऑनलाइन स्टोर' },
        { text: 'मार्केटप्लेस' },
        { text: 'पोर्टल' },
        { text: 'तेज़ मार्केटिंग साइट' },
      ],
    },
  },
]

// ─── Team, FAQs ──────────────────────────────────────────────────────────────

export const founder: SeedDoc<'team'> = {
  en: {
    name: '{{FOUNDER_FULL_NAME}}',
    role: 'Founder',
    bio: 'Software engineer, previously at Bosch Global Software Technologies (DevOps); Google Summer of Code 2022 contributor.', // {{CONFIRM_WORDING}}
    founder: true,
    sortOrder: 1,
  },
  hi: {
    role: 'संस्थापक',
    bio: 'सॉफ़्टवेयर इंजीनियर, पहले Bosch Global Software Technologies (DevOps) में; Google Summer of Code 2022 योगदानकर्ता।',
  },
}

export const faqs: SeedDoc<'faqs'>[] = [
  {
    en: {
      question: 'What does Jainav Infotech do?',
      answer:
        'We build our own software products, MenuMesh, VYRO and Baby, and custom software for businesses.',
      category: 'general',
      sortOrder: 1,
    },
    hi: {
      question: 'Jainav Infotech क्या करता है?',
      answer:
        'हम अपने सॉफ़्टवेयर प्रोडक्ट, MenuMesh, VYRO और Baby, और व्यवसायों के लिए कस्टम सॉफ़्टवेयर बनाते हैं।',
    },
  },
  {
    en: {
      question: 'Where is Jainav Infotech based?',
      answer: 'Indore, Madhya Pradesh, India.',
      category: 'general',
      sortOrder: 2,
    },
    hi: { question: 'Jainav Infotech कहाँ स्थित है?', answer: 'इंदौर, मध्य प्रदेश, भारत।' },
  },
  {
    en: {
      question: 'Can you build custom software for my business?',
      answer:
        'Yes. We take on custom software and SaaS, AI and ML, cloud and DevOps, and e-commerce projects. Tell us about yours through the contact form.',
      category: 'services',
      sortOrder: 3,
    },
    hi: {
      question: 'क्या आप मेरे व्यवसाय के लिए कस्टम सॉफ़्टवेयर बना सकते हैं?',
      answer:
        'हाँ। हम कस्टम सॉफ़्टवेयर और SaaS, AI और ML, क्लाउड और DevOps, और ई-कॉमर्स प्रोजेक्ट करते हैं। संपर्क फ़ॉर्म से हमें अपने प्रोजेक्ट के बारे में बताएँ।',
    },
  },
]

// ─── Pages ───────────────────────────────────────────────────────────────────

const whyJainav = {
  en: [
    { icon: 'shield', title: 'Privacy by default', text: 'Data stays where it belongs.' },
    {
      icon: 'feather',
      title: 'Fast, light software',
      text: 'Small, quick apps that respect your machine.',
    },
    { icon: 'map-pin', title: 'Built in Indore, for the world' },
    { icon: 'package-check', title: 'We ship our own products', text: 'We build what we use.' },
  ],
  hi: [
    { title: 'प्राइवेसी पहले से', text: 'डेटा वहीं रहता है जहाँ उसे रहना चाहिए।' },
    { title: 'तेज़, हल्का सॉफ़्टवेयर', text: 'छोटे, तेज़ ऐप जो आपकी मशीन का ध्यान रखते हैं।' },
    { title: 'इंदौर में बना, दुनिया के लिए' },
    { title: 'हम अपने प्रोडक्ट खुद बनाते हैं', text: 'हम वही बनाते हैं जो खुद इस्तेमाल करते हैं।' },
  ],
}

const processSteps = {
  en: [
    { title: 'Discover', text: 'We learn your goals, users and constraints.' },
    { title: 'Design', text: 'We agree on scope, flows and a plan.' },
    { title: 'Build', text: 'We ship in small, reviewable steps.' },
    { title: 'Support', text: 'We keep it running and improving.' },
  ],
  hi: [
    { title: 'समझना', text: 'हम आपके लक्ष्य, उपयोगकर्ता और सीमाएँ समझते हैं।' },
    { title: 'डिज़ाइन', text: 'हम दायरा, फ़्लो और योजना तय करते हैं।' },
    { title: 'निर्माण', text: 'हम छोटे, जाँचने योग्य चरणों में काम पहुँचाते हैं।' },
    { title: 'सहायता', text: 'हम इसे चलाते और बेहतर बनाते रहते हैं।' },
  ],
}

const contactCta = {
  en: {
    blockType: 'cta' as const,
    heading: 'Have a project in mind?',
    text: 'Tell us what you need and we’ll take it from there.',
    primary: { label: 'Start a project', href: '/contact' },
    showNewsletter: true,
  },
  hi: {
    heading: 'कोई प्रोजेक्ट सोच रहे हैं?',
    text: 'हमें बताइए आपको क्या चाहिए, आगे हम संभाल लेंगे।',
    primary: { label: 'प्रोजेक्ट शुरू करें' },
  },
}

export const pages: SeedDoc<'pages'>[] = [
  {
    en: {
      title: 'Home',
      slug: 'home',
      ...draftHi,
      layout: [
        {
          blockType: 'hero',
          headline: 'Software we build, and software we build for you.',
          subheadline:
            'Products like MenuMesh, VYRO and Baby, plus custom software for your business.',
          primary: { label: 'Explore products', href: '/products' },
          secondary: { label: 'Build with us', href: '/services' },
          chips: [
            { label: 'My restaurant', href: '/products/menumesh' },
            { label: 'My PC', href: '/products/vyro' },
            { label: 'A private assistant', href: '/products/baby' },
            { label: 'Custom software', href: '/services' },
          ],
        },
        { blockType: 'productShowcase', heading: 'Our products', mode: 'featured' },
        { blockType: 'servicesOverview', heading: 'What we build for you' },
        { blockType: 'principles', heading: 'Why Jainav', items: whyJainav.en },
        { blockType: 'process', heading: 'How we work', steps: processSteps.en },
        { blockType: 'latest', heading: 'Latest', postsCount: 2, changelogCount: 3 },
        contactCta.en,
      ],
    },
    hi: {
      title: 'होम',
      layout: [
        {
          headline: 'सॉफ़्टवेयर जो हम बनाते हैं, और जो हम आपके लिए बनाते हैं।',
          subheadline:
            'MenuMesh, VYRO और Baby जैसे प्रोडक्ट, और आपके व्यवसाय के लिए कस्टम सॉफ़्टवेयर।',
          primary: { label: 'प्रोडक्ट देखें' },
          secondary: { label: 'हमारे साथ बनाएँ' },
          chips: [
            { label: 'मेरा रेस्टोरेंट' },
            { label: 'मेरा PC' },
            { label: 'एक निजी असिस्टेंट' },
            { label: 'कस्टम सॉफ़्टवेयर' },
          ],
        },
        { heading: 'हमारे प्रोडक्ट' },
        { heading: 'हम आपके लिए क्या बनाते हैं' },
        { heading: 'Jainav क्यों', items: whyJainav.hi },
        { heading: 'हम कैसे काम करते हैं', steps: processSteps.hi },
        { heading: 'नया क्या है' },
        contactCta.hi,
      ],
    },
  },
  {
    en: {
      title: 'About',
      slug: 'about',
      ...draftHi,
      layout: [
        {
          blockType: 'hero',
          headline: 'About Jainav Infotech',
          subheadline: 'A product company from Indore, Madhya Pradesh.',
        },
        { blockType: 'principles', heading: 'What we value', items: whyJainav.en },
        { blockType: 'team', heading: 'Founder' },
        { blockType: 'companyFacts', heading: 'Company facts' },
        contactCta.en,
      ],
    },
    hi: {
      title: 'हमारे बारे में',
      layout: [
        {
          headline: 'Jainav Infotech के बारे में',
          subheadline: 'इंदौर, मध्य प्रदेश की एक प्रोडक्ट कंपनी।',
        },
        { heading: 'हमारे मूल्य', items: whyJainav.hi },
        { heading: 'संस्थापक' },
        { heading: 'कंपनी की जानकारी' },
        contactCta.hi,
      ],
    },
  },
  {
    en: {
      title: 'Services',
      slug: 'services',
      ...draftHi,
      layout: [
        {
          blockType: 'hero',
          headline: 'We built these. We can build yours.',
          subheadline: 'Custom software from the team behind MenuMesh, VYRO and Baby.',
          primary: { label: 'Start a project', href: '/contact' },
        },
        { blockType: 'servicesOverview', heading: 'What we do' },
        { blockType: 'process', heading: 'How we work', steps: processSteps.en },
        {
          blockType: 'principles',
          heading: 'Ways to work with us',
          items: [
            { icon: 'clipboard-check', title: 'Fixed-scope project' },
            { icon: 'calendar-sync', title: 'Monthly retainer' },
            { icon: 'user-round-cog', title: 'Dedicated developer' },
          ],
        },
        { blockType: 'faq', heading: 'Questions' },
        contactCta.en,
      ],
    },
    hi: {
      title: 'सेवाएँ',
      layout: [
        {
          headline: 'ये हमने बनाए। आपका भी बना सकते हैं।',
          subheadline: 'MenuMesh, VYRO और Baby बनाने वाली टीम से कस्टम सॉफ़्टवेयर।',
          primary: { label: 'प्रोजेक्ट शुरू करें' },
        },
        { heading: 'हम क्या करते हैं' },
        { heading: 'हम कैसे काम करते हैं', steps: processSteps.hi },
        {
          heading: 'हमारे साथ काम करने के तरीके',
          items: [
            { title: 'तय दायरे वाला प्रोजेक्ट' },
            { title: 'मासिक रिटेनर' },
            { title: 'समर्पित डेवलपर' },
          ],
        },
        { heading: 'सवाल' },
        contactCta.hi,
      ],
    },
  },
]

// ─── Legal drafts (full text in Phase 3; Owner approves by publishing, spec §8.13) ─

const legalPlaceholder = {
  en: richText(
    'Draft placeholder. The full text is prepared in Phase 3 and published by the Owner after review.',
  ),
  hi: richText(
    'ड्राफ़्ट। पूरा पाठ Phase 3 में तैयार होगा और समीक्षा के बाद Owner इसे प्रकाशित करेंगे। अंग्रेज़ी और हिंदी संस्करण में अंतर होने पर अंग्रेज़ी संस्करण मान्य होगा।',
  ),
}

export const legalPages: SeedDoc<'legal-pages'>[] = [
  ['privacy', 'Privacy Policy', 'गोपनीयता नीति'],
  ['terms', 'Terms of Service', 'सेवा की शर्तें'],
  ['refunds-cancellation', 'Refunds and Cancellation', 'रिफ़ंड और रद्दीकरण'],
  ['shipping-delivery', 'Shipping and Delivery', 'शिपिंग और डिलीवरी'],
  ['eula-vyro', 'VYRO End User License Agreement', 'VYRO अंतिम उपयोगकर्ता लाइसेंस अनुबंध'],
  ['cookies', 'Cookie Policy', 'कुकी नीति'],
  ['privacy-requests', 'Privacy Requests and Grievances', 'गोपनीयता अनुरोध और शिकायतें'],
].map(([slug, title, titleHi]) => ({
  en: { title, slug, version: '0.1', body: legalPlaceholder.en, ...draftHi },
  hi: { title: titleHi },
}))

/** Rich text has no per-row ids, so Hindi bodies are written as whole values. */
export const legalBodyHi = legalPlaceholder.hi

// ─── Globals ─────────────────────────────────────────────────────────────────

export const siteSettings = {
  en: {
    company: {
      legalName: 'Jainav Infotech Private Limited',
      cin: '{{CIN}}',
      registeredAddress: '{{REGISTERED_ADDRESS}}',
      phone: '{{PHONE}}',
      whatsapp: '{{WHATSAPP_NUMBER}}',
    },
    storeEnabled: false,
    maintenanceMode: false,
    defaultSeo: {
      title: 'Jainav Infotech',
      description: 'Software products and custom software from Indore, India.',
    },
  },
  hi: {
    defaultSeo: {
      title: 'Jainav Infotech',
      description: 'इंदौर, भारत से सॉफ़्टवेयर प्रोडक्ट और कस्टम सॉफ़्टवेयर।',
    },
  },
}

export const navigation = {
  en: {
    header: [
      { label: 'Products', href: '/products', megaMenu: 'products' as const },
      { label: 'Services', href: '/services' },
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
    footer: [
      {
        title: 'Products',
        links: [
          { label: 'MenuMesh', href: '/products/menumesh' },
          { label: 'VYRO', href: '/products/vyro' },
          { label: 'Baby', href: '/products/baby' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Services', href: '/services' },
          { label: 'Careers', href: '/careers' },
          { label: 'Blog', href: '/blog' },
          { label: 'Changelog', href: '/changelog' },
          { label: 'Contact', href: '/contact' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacy', href: '/legal/privacy' },
          { label: 'Terms', href: '/legal/terms' },
          { label: 'Refunds', href: '/legal/refunds-cancellation' },
          { label: 'Shipping', href: '/legal/shipping-delivery' },
          { label: 'Cookies', href: '/legal/cookies' },
        ],
      },
    ],
  },
  hi: {
    header: [
      { label: 'प्रोडक्ट' },
      { label: 'सेवाएँ' },
      { label: 'हमारे बारे में' },
      { label: 'ब्लॉग' },
      { label: 'संपर्क' },
    ],
    footer: [
      {
        title: 'प्रोडक्ट',
        links: [{ label: 'MenuMesh' }, { label: 'VYRO' }, { label: 'Baby' }],
      },
      {
        title: 'कंपनी',
        links: [
          { label: 'हमारे बारे में' },
          { label: 'सेवाएँ' },
          { label: 'करियर' },
          { label: 'ब्लॉग' },
          { label: 'चेंजलॉग' },
          { label: 'संपर्क' },
        ],
      },
      {
        title: 'कानूनी',
        links: [
          { label: 'गोपनीयता' },
          { label: 'शर्तें' },
          { label: 'रिफ़ंड' },
          { label: 'शिपिंग' },
          { label: 'कुकी' },
        ],
      },
    ],
  },
}

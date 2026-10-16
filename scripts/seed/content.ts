/**
 * Seed content from spec Appendix A: drafts to confirm, English plus draft Hindi.
 * {{LIKE_THIS}} values are placeholders only Tanishq can provide (spec §21); nothing here is a
 * real company detail, price or URL. Product accent colors are placeholders too.
 */
import type { CollectionSlug, RequiredDataFromCollectionSlug } from 'payload'

import { richText } from './richText'

/** Hindi values for localized leaf fields; arrays are matched to the English rows by index. */
export type HiPatch = { [key: string]: string | HiPatch | HiPatch[] | undefined }
/** Seeded as drafts, so fields required only on publish (e.g. a legal page's effective date) may be empty. */
export type DraftSeedDoc<S extends CollectionSlug> = {
  en: Partial<RequiredDataFromCollectionSlug<S>>
  hi: HiPatch
}
export type SeedDoc<S extends CollectionSlug> = {
  en: RequiredDataFromCollectionSlug<S>
  hi: HiPatch
}

const draftHi = { hiStatus: 'draft' } as const

// ─── Products ────────────────────────────────────────────────────────────────

// Product copy checked against each product's own code, site and releases on 2026-10-16
// (MenuMesh: its repo and menumesh.in; Baby: nanu1605/baby v6.0.1; VYRO: nanu1605/vyro and
// vyro-releases v0.3.0). MenuMesh's Hindi follows MenuMesh's own approved words (ग्राहक, डिश).
export const products: SeedDoc<'products'>[] = [
  {
    en: {
      name: 'MenuMesh',
      slug: 'menumesh',
      tagline: 'QR table ordering for restaurants.',
      summary:
        'Guests scan the QR code on their table and order from their own phone, in English or Hindi. Waiters and the kitchen follow every dish until it’s served, and the bill, with your GST and charges, is ready in one tap. Guests pay you directly, and MenuMesh takes no commission.',
      type: 'saas',
      category: 'restaurants',
      platforms: ['web'],
      status: 'live', // {{CONFIRM}}: menumesh.in is still a holding page; 'beta' until it opens?
      hostingMode: 'external',
      externalUrl: 'https://menumesh.in',
      accentColor: '#FF6606', // MenuMesh's brand orange
      primaryButton: { type: 'visit' },
      featured: true,
      sortOrder: 1,
      ...draftHi,
      layout: [
        {
          blockType: 'productHero',
          eyebrow: 'MenuMesh by Jainav',
          heading: 'QR table ordering for restaurants.',
          subheading:
            'Guests order from their own phone. Waiters and the kitchen see every dish live, and the bill is ready in one tap.',
          animation: 'menumesh',
        },
        {
          blockType: 'howItWorks',
          heading: 'How it works',
          steps: [
            {
              title: 'Scan',
              text: 'Each table has its own QR code. Guests scan it and your menu opens for that table. No app, no login.',
            },
            {
              title: 'Order',
              text: 'Guests pick dishes, sizes and add-ons, add a note for the kitchen and place the order. Friends at the table can order from their own phones.',
            },
            {
              title: 'Cook and serve',
              text: 'Waiters see the order straight away, and the kitchen gets it once a waiter takes the table. Guests see each dish move from placed to served.',
            },
            {
              title: 'Bill and pay',
              text: 'One tap makes the bill with every dish, your taxes and any other charges. Print it, take payment the way you already do, and the table is free for the next guests.',
            },
          ],
        },
        {
          blockType: 'featureGrid',
          heading: 'Everything a busy floor needs',
          items: [
            {
              icon: 'qr-code',
              title: 'Table QR ordering',
              text: 'No app to install and no login for your guests.',
            },
            {
              icon: 'languages',
              title: 'Menu in English and Hindi',
              text: 'Guests switch in one tap. Dish names are written in Hindi for you, and you can change any of them.',
            },
            {
              icon: 'user-round-check',
              title: 'A waiter for every table',
              text: 'Assign a waiter to each table, and approve a table’s first order to stop prank orders.',
            },
            {
              icon: 'layout-grid',
              title: 'Live board for waiters',
              text: 'Every table at a glance, coloured by dish status. A badge shows when a guest calls a waiter or asks for the bill.',
            },
            {
              icon: 'chef-hat',
              title: 'Kitchen view',
              text: 'Tickets in columns for new, preparing and ready. On the Growth and Pro plans.',
            },
            {
              icon: 'receipt-text',
              title: 'Bills in one tap',
              text: 'GST and service charge added the same way every time, printed on 80 mm or 58 mm receipt printers. The table is free once it’s billed.',
            },
            {
              icon: 'image-up',
              title: 'Menu from a photo',
              text: 'Photograph your printed menu, or upload a PDF or CSV. Check the dishes, then add them in one go.',
            },
            {
              icon: 'wifi-off',
              title: 'Ready for a Wi-Fi drop',
              text: 'Dish updates on the staff board are kept on the device and sent when the connection is back.',
            },
            {
              icon: 'chart-column',
              title: 'Sales and reports',
              text: 'Today’s sales on every plan. Reports by dish and waiter, busy hours and CSV export on Growth and Pro.',
            },
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
        'ग्राहक अपनी टेबल का QR कोड स्कैन करके अपने फ़ोन से ऑर्डर करते हैं, अंग्रेज़ी या हिंदी में। वेटर और किचन हर डिश को परोसे जाने तक देखते रहते हैं, और आपके GST और शुल्कों के साथ बिल एक टैप में तैयार हो जाता है। ग्राहक सीधे आपको भुगतान करते हैं, और MenuMesh कोई कमीशन नहीं लेता।',
      layout: [
        {
          eyebrow: 'MenuMesh, Jainav की ओर से',
          heading: 'रेस्टोरेंट के लिए QR टेबल ऑर्डरिंग।',
          subheading:
            'ग्राहक अपने फ़ोन से ऑर्डर करते हैं। वेटर और किचन हर डिश लाइव देखते हैं, और बिल एक टैप में तैयार हो जाता है।',
        },
        {
          heading: 'यह कैसे काम करता है',
          steps: [
            {
              title: 'स्कैन',
              text: 'हर टेबल का अपना QR कोड होता है। ग्राहक उसे स्कैन करते हैं और आपका मेन्यू उसी टेबल के लिए खुल जाता है। न कोई ऐप, न लॉग इन।',
            },
            {
              title: 'ऑर्डर',
              text: 'ग्राहक डिश, साइज़ और ऐड-ऑन चुनते हैं, किचन के लिए नोट लिखते हैं और ऑर्डर कर देते हैं। टेबल पर बैठे दोस्त अपने-अपने फ़ोन से ऑर्डर कर सकते हैं।',
            },
            {
              title: 'बनाना और परोसना',
              text: 'वेटर को ऑर्डर तुरंत दिखता है, और जैसे ही कोई वेटर टेबल सँभालता है, ऑर्डर किचन पहुँच जाता है। ग्राहक हर डिश को “ऑर्डर हुआ” से “परोसा गया” तक बढ़ते देखते हैं।',
            },
            {
              title: 'बिल और भुगतान',
              text: 'एक टैप में बिल बन जाता है, जिसमें हर डिश, आपके टैक्स और लागू होने पर दूसरे शुल्क शामिल होते हैं। उसे प्रिंट करें, भुगतान वैसे ही लें जैसे अभी लेते हैं, और टेबल अगले ग्राहकों के लिए ख़ाली हो जाती है।',
            },
          ],
        },
        {
          heading: 'व्यस्त रेस्टोरेंट की हर ज़रूरत',
          items: [
            { title: 'टेबल QR ऑर्डरिंग', text: 'ग्राहकों को न कोई ऐप इंस्टॉल करना है, न लॉग इन।' },
            {
              title: 'अंग्रेज़ी और हिंदी में मेन्यू',
              text: 'ग्राहक एक टैप में भाषा बदलते हैं। डिश के नाम आपके लिए हिंदी में लिखे जाते हैं, और आप इनमें से कोई भी नाम बदल सकते हैं।',
            },
            {
              title: 'हर टेबल के लिए वेटर',
              text: 'हर टेबल पर एक वेटर तय करें, और फ़र्ज़ी ऑर्डर रोकने के लिए टेबल का पहला ऑर्डर मंज़ूर करें।',
            },
            {
              title: 'वेटरों का लाइव बोर्ड',
              text: 'हर टेबल एक नज़र में, डिश के स्टेटस के हिसाब से रंगों में। ग्राहक वेटर बुलाएँ या बिल माँगें, तो एक बैज दिखता है।',
            },
            {
              title: 'किचन स्क्रीन',
              text: 'नए, बन रहे और तैयार के कॉलम में टिकट। Growth और Pro प्लान में।',
            },
            {
              title: 'एक टैप में बिल',
              text: 'हर बिल पर GST और सर्विस चार्ज एक ही तरह से जुड़ते हैं, और बिल 80 mm या 58 mm रसीद प्रिंटर पर प्रिंट होता है। बिल बनते ही टेबल ख़ाली हो जाती है।',
            },
            {
              title: 'फ़ोटो से मेन्यू',
              text: 'अपने छपे हुए मेन्यू की फ़ोटो लें, या PDF या CSV अपलोड करें। डिश जाँचें, फिर सब एक साथ जोड़ दें।',
            },
            {
              title: 'Wi-Fi जाए तो भी चिंता नहीं',
              text: 'स्टाफ़ बोर्ड पर डिश के अपडेट डिवाइस पर सेव रहते हैं, और कनेक्शन लौटते ही भेज दिए जाते हैं।',
            },
            {
              title: 'बिक्री और रिपोर्ट',
              text: 'आज की बिक्री हर प्लान में। डिश और वेटर के हिसाब से रिपोर्ट, भीड़ के घंटे और CSV एक्सपोर्ट Growth और Pro प्लान में।',
            },
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
      tagline: 'Your personal voice assistant for Windows.',
      summary:
        'Talk to your PC in English, Hindi or Hinglish. Baby opens and closes apps, finds files, browses the web and runs longer jobs in the background, and it asks before it changes anything. Listening for the wake phrase and speech recognition run on your PC, and your chats and memory are saved there.',
      type: 'desktop',
      category: 'assistants',
      platforms: ['windows'],
      status: 'beta',
      hostingMode: 'external',
      externalUrl: null, // {{BABY_URL}}
      accentColor: '#6EA8FE', // Baby's app accent
      // Until a beta build is published here the button resolves to "Join the waitlist" (spec §8.5).
      primaryButton: { type: 'download', channel: 'beta' },
      featured: true,
      sortOrder: 3,
      ...draftHi,
      layout: [
        {
          blockType: 'productHero',
          eyebrow: 'Baby by Jainav',
          heading: 'Your personal voice assistant for Windows.',
          subheading: 'Talk to your PC in English, Hindi or Hinglish.',
          animation: 'baby',
        },
        {
          blockType: 'privacy',
          heading: 'What stays on your PC',
          local: [
            { text: 'Listening for the wake phrase' },
            { text: 'Turning your speech into text' },
            { text: 'Baby’s spoken replies' },
            { text: 'Your chats, memory and settings' },
            { text: 'Your API keys, sent only to their own provider' },
            { text: 'Files Baby reads and command results (Full install)' },
          ],
          cloud: [
            {
              text: 'Your messages, recent chat and relevant memories, to the AI provider you set up',
            },
            {
              text: 'A screenshot, if you ask about your screen and the local model can’t answer (Google Gemini)',
            },
            { text: 'Web searches and the pages you ask Baby to open' },
          ],
          note: 'Cloud models answer most messages by default because they’re faster. A cloud-only install has no local model, so everything you type or say goes to your provider as text. Skip the key on a Full install and every answer comes from your GPU. Nothing is sent to Jainav: there’s no account and no telemetry.',
        },
        {
          blockType: 'featureGrid',
          heading: 'What Baby does',
          items: [
            {
              icon: 'mic',
              title: 'Hands-free voice',
              text: 'Speech recognition runs on your PC. Talk over Baby to interrupt it.',
            },
            { icon: 'app-window', title: 'Opens, closes and switches apps' },
            { icon: 'folder-search', title: 'Finds files on your PC' },
            {
              icon: 'globe',
              title: 'Browses the web',
              text: 'Reads pages for you, and asks once before it clicks or types on a site.',
            },
            {
              icon: 'list-checks',
              title: 'Works in the background',
              text: 'Hand off a longer job, keep talking, and hear back when it’s done.',
            },
            {
              icon: 'brain',
              title: 'Remembers what you tell it',
              text: 'Across restarts, stored on your PC. Say “forget that” to remove it.',
            },
            {
              icon: 'languages',
              title: 'English, Hindi and Hinglish',
              text: 'Replies in your language, with a separate Hindi voice.',
            },
            {
              icon: 'shield-check',
              title: 'Asks before it changes anything',
              text: 'Dangerous commands are refused, and every action is logged.',
            },
            {
              icon: 'wifi-off',
              title: 'Works offline',
              text: 'On a Full install, the local model takes over when the internet drops.',
            },
          ],
        },
        {
          blockType: 'howItWorks',
          heading: 'How it works',
          steps: [
            { title: 'Say the wake phrase', text: 'Or press Ctrl+Alt+B, or just type.' },
            { title: 'Ask in your own words', text: 'In English, Hindi or Hinglish.' },
            {
              title: 'Baby does the work',
              text: 'It uses your apps, files and the web, and asks before anything changes.',
            },
            {
              title: 'Hear the answer',
              text: 'Baby replies aloud, and the activity feed shows every step.',
            },
          ],
        },
        {
          blockType: 'requirements',
          heading: 'System requirements',
          rows: [
            { label: 'Windows', minimum: 'Windows 11, 64-bit' },
            {
              label: 'Graphics',
              minimum: 'Any (cloud-only install)',
              recommended: 'NVIDIA GPU with 8 GB VRAM (Full install)',
            },
            {
              label: 'Disk space',
              minimum: 'About 3 GB (cloud-only)',
              recommended: 'About 8 GB (Full)',
            },
            {
              label: 'Internet',
              minimum: 'Needed for the first run',
              recommended: 'Optional afterwards on a Full install',
            },
            {
              label: 'AI provider key',
              minimum: 'An OpenRouter key (cloud-only)',
              recommended: 'Optional on a Full install',
            },
            { label: 'Microphone', minimum: 'Optional; you can type instead' },
            { label: 'Admin rights', minimum: 'Not needed to install' },
          ],
        },
      ],
    },
    hi: {
      tagline: 'Windows के लिए आपका पर्सनल वॉइस असिस्टेंट।',
      summary:
        'अपने PC से अंग्रेज़ी, हिंदी या हिंग्लिश में बात करें। Baby ऐप खोलता-बंद करता है, फ़ाइलें ढूँढता है, वेब ब्राउज़ करता है और लंबे काम बैकग्राउंड में करता है, और कुछ भी बदलने से पहले आपसे पूछता है। वेक फ़्रेज़ सुनना और आपकी आवाज़ को टेक्स्ट में बदलना आपके PC पर होता है, और आपकी चैट और मेमोरी वहीं सेव रहती हैं।',
      layout: [
        {
          eyebrow: 'Baby, Jainav की ओर से',
          heading: 'Windows के लिए आपका पर्सनल वॉइस असिस्टेंट।',
          subheading: 'अपने PC से अंग्रेज़ी, हिंदी या हिंग्लिश में बात करें।',
        },
        {
          heading: 'आपके PC पर क्या रहता है',
          local: [
            { text: 'वेक फ़्रेज़ के लिए सुनना' },
            { text: 'आपकी आवाज़ को टेक्स्ट में बदलना' },
            { text: 'Baby के बोले गए जवाब' },
            { text: 'आपकी चैट, मेमोरी और सेटिंग्स' },
            { text: 'आपकी API keys, जो सिर्फ़ अपने प्रोवाइडर को भेजी जाती हैं' },
            { text: 'Baby जो फ़ाइलें पढ़ता है और कमांड के नतीजे (Full इंस्टॉल)' },
          ],
          cloud: [
            { text: 'आपके मैसेज, हाल की चैट और काम की मेमोरी, आपके चुने AI प्रोवाइडर तक' },
            {
              text: 'स्क्रीनशॉट, अगर आप स्क्रीन के बारे में पूछें और लोकल मॉडल जवाब न दे पाए (Google Gemini)',
            },
            { text: 'वेब सर्च और वे पेज जो आप Baby से खुलवाते हैं' },
          ],
          note: 'ज़्यादातर मैसेज का जवाब डिफ़ॉल्ट रूप से क्लाउड मॉडल देते हैं, क्योंकि वे तेज़ हैं। सिर्फ़-क्लाउड इंस्टॉल में लोकल मॉडल नहीं होता, इसलिए आप जो भी लिखते या बोलते हैं, वह टेक्स्ट बनकर आपके प्रोवाइडर तक जाता है। Full इंस्टॉल में key न डालें, तो हर जवाब आपके GPU से आता है। Jainav को कुछ नहीं भेजा जाता: न कोई अकाउंट है, न टेलीमेट्री।',
        },
        {
          heading: 'Baby क्या करता है',
          items: [
            {
              title: 'हैंड्स-फ़्री वॉइस',
              text: 'स्पीच रिकग्निशन आपके PC पर चलती है। बीच में बोलकर Baby को रोक सकते हैं।',
            },
            { title: 'ऐप खोलता, बंद करता और बदलता है' },
            { title: 'आपके PC पर फ़ाइलें ढूँढता है' },
            {
              title: 'वेब ब्राउज़ करता है',
              text: 'आपके लिए पेज पढ़ता है, और किसी साइट पर क्लिक या टाइप करने से पहले एक बार पूछता है।',
            },
            {
              title: 'बैकग्राउंड में काम करता है',
              text: 'लंबा काम सौंपिए, बात करते रहिए, पूरा होते ही Baby बता देगा।',
            },
            {
              title: 'आपकी बताई बातें याद रखता है',
              text: 'रीस्टार्ट के बाद भी, आपके PC पर सेव। हटाने के लिए “forget that” कहें।',
            },
            {
              title: 'अंग्रेज़ी, हिंदी और हिंग्लिश',
              text: 'आपकी भाषा में जवाब देता है, हिंदी के लिए अलग आवाज़ में।',
            },
            {
              title: 'कुछ भी बदलने से पहले पूछता है',
              text: 'ख़तरनाक कमांड रोक दी जाती हैं, और हर एक्शन का रिकॉर्ड रहता है।',
            },
            {
              title: 'ऑफ़लाइन भी चलता है',
              text: 'Full इंस्टॉल में इंटरनेट जाने पर लोकल मॉडल काम संभाल लेता है।',
            },
          ],
        },
        {
          heading: 'यह कैसे काम करता है',
          steps: [
            { title: 'वेक फ़्रेज़ बोलें', text: 'या Ctrl+Alt+B दबाएँ, या सीधे टाइप करें।' },
            { title: 'अपने शब्दों में पूछें', text: 'अंग्रेज़ी, हिंदी या हिंग्लिश में।' },
            {
              title: 'Baby काम करता है',
              text: 'आपके ऐप, फ़ाइलें और वेब इस्तेमाल करता है, और कुछ भी बदलने से पहले पूछता है।',
            },
            {
              title: 'जवाब सुनें',
              text: 'Baby बोलकर जवाब देता है, और एक्टिविटी फ़ीड में हर कदम दिखता है।',
            },
          ],
        },
        {
          heading: 'सिस्टम की ज़रूरतें',
          rows: [
            { label: 'Windows', minimum: 'Windows 11, 64-bit' },
            {
              label: 'ग्राफ़िक्स',
              minimum: 'कोई भी (सिर्फ़-क्लाउड इंस्टॉल)',
              recommended: '8 GB VRAM वाला NVIDIA GPU (Full इंस्टॉल)',
            },
            {
              label: 'डिस्क स्पेस',
              minimum: 'लगभग 3 GB (सिर्फ़-क्लाउड)',
              recommended: 'लगभग 8 GB (Full)',
            },
            {
              label: 'इंटरनेट',
              minimum: 'पहली बार चलाने के लिए ज़रूरी',
              recommended: 'Full इंस्टॉल में बाद में ज़रूरी नहीं',
            },
            {
              label: 'AI प्रोवाइडर की key',
              minimum: 'OpenRouter key (सिर्फ़-क्लाउड)',
              recommended: 'Full इंस्टॉल में ज़रूरी नहीं',
            },
            { label: 'माइक्रोफ़ोन', minimum: 'ज़रूरी नहीं; टाइप भी कर सकते हैं' },
            { label: 'एडमिन अधिकार', minimum: 'इंस्टॉल के लिए ज़रूरी नहीं' },
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
        'See what your Windows PC is doing right now, on animated gauges: usage, clocks, temperatures, power and fan speeds, with seven days of history, health checks and alerts. Gamers also get frame rates, an overlay on top of the game and replays of recent sessions.',
      type: 'desktop',
      category: 'pc-tools',
      platforms: ['windows'],
      status: 'beta', // {{CONFIRM}}
      hostingMode: 'hosted',
      accentColor: '#4CC9F0', // VYRO's app accent
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
          heading: 'Your PC at a glance',
          items: [
            {
              icon: 'gauge',
              title: 'Animated CPU and GPU speedometers',
              text: 'With live clock speeds.',
            },
            {
              icon: 'thermometer',
              title: 'Temperatures',
              text: 'GPU and drives. CPU on AMD Ryzen, DDR5 memory on AMD systems, and the motherboard on supported MSI boards.',
            },
            {
              icon: 'fan',
              title: 'Fan and pump speeds',
              text: 'GPU fans, plus motherboard fans and pumps on supported MSI boards.',
            },
            { icon: 'zap', title: 'Voltages and clocks' },
            { icon: 'cpu', title: 'Full system information' },
            { icon: 'monitor', title: 'Single and multi-monitor details' },
            {
              icon: 'scan-search',
              title: 'Reads sensors directly',
              text: 'No other monitoring app needed.',
            },
            {
              icon: 'feather',
              title: 'Low CPU and memory use',
              text: 'Under 1% CPU on average with the window open, measured on our test PC with version 0.2.',
            },
            {
              icon: 'chart-line',
              title: '7 days of history',
              text: 'Charts from the last 5 minutes to the last 7 days, recorded even while the app is closed.',
            },
            {
              icon: 'bell',
              title: 'Health checks and alerts',
              text: 'Set a limit for any sensor and get a Windows notification when a reading crosses it.',
            },
            {
              icon: 'sliders-horizontal',
              title: 'Fan and pump control',
              text: 'Your own fan curves, with safety limits. If anything goes wrong, the BIOS settings come back. Only on the MSI B650M GAMING PLUS WIFI for now.',
            },
          ],
        },
        {
          blockType: 'featureGrid',
          heading: 'Made for gaming',
          items: [
            {
              icon: 'gamepad-2',
              title: 'Frame rate and overlay',
              text: 'FPS, 1% lows and frame time, shown over borderless and windowed games. Nothing is injected into the game.',
            },
            {
              icon: 'repeat',
              title: 'Automatic game profiles',
              text: 'Start a game and VYRO switches its profile, fan settings and overlay. Quit, and everything goes back.',
            },
            {
              icon: 'rewind',
              title: 'Session replay',
              text: 'Replay your last 100 game sessions with markers for frame-rate drops, stutters and heat or power limits.',
            },
          ],
        },
        {
          blockType: 'requirements',
          heading: 'System requirements',
          rows: [
            {
              label: 'Windows',
              minimum: 'Windows 10 (21H2) or Windows 11, 64-bit (x64)',
              recommended: 'Windows 11',
            },
            {
              label: 'CPU sensors',
              minimum: 'Any 64-bit CPU: usage and clocks',
              recommended: 'AMD Ryzen: also temperature, power and voltage',
            },
            {
              label: 'Motherboard sensors',
              minimum: 'MSI board with a Nuvoton NCT6687 chip',
              recommended: 'MSI B650M GAMING PLUS WIFI: also fan and pump control',
            },
            { label: 'Install', minimum: 'Administrator rights' },
            { label: 'Disk space', minimum: 'Up to 200 MB for history' },
          ],
        },
        { blockType: 'pricing', heading: 'Free and Pro', source: 'plans' },
        {
          blockType: 'download',
          heading: 'Download VYRO',
          channel: 'stable',
          note: 'The installer isn’t code-signed yet, so Windows SmartScreen may warn before it runs. Setup also installs the PawnIO driver, which VYRO uses to read CPU, fan and memory sensors.',
        },
      ],
    },
    hi: {
      tagline: 'अपनी मशीन को जानिए।',
      summary:
        'देखिए आपका Windows PC अभी क्या कर रहा है, एनिमेटेड गेज पर: इस्तेमाल, क्लॉक, तापमान, पावर और फ़ैन स्पीड, साथ में सात दिन की हिस्ट्री, हेल्थ चेक और अलर्ट। गेमर्स के लिए फ़्रेम रेट, गेम के ऊपर ओवरले और हाल के गेम सेशन का रीप्ले भी।',
      layout: [
        {
          eyebrow: 'VYRO, Jainav की ओर से',
          heading: 'अपनी मशीन को जानिए।',
          subheading: 'लाइव तापमान, फ़ैन स्पीड, वोल्टेज और क्लॉक, एक हल्के और तेज़ ऐप में।',
        },
        {
          heading: 'आपका PC, एक नज़र में',
          items: [
            { title: 'एनिमेटेड CPU और GPU स्पीडोमीटर', text: 'लाइव क्लॉक स्पीड के साथ।' },
            {
              title: 'तापमान',
              text: 'GPU और ड्राइव; AMD Ryzen पर CPU, AMD सिस्टम पर DDR5 मेमोरी, और सपोर्टेड MSI बोर्ड पर मदरबोर्ड।',
            },
            {
              title: 'फ़ैन और पंप की स्पीड',
              text: 'GPU फ़ैन, और सपोर्टेड MSI बोर्ड पर मदरबोर्ड के फ़ैन और पंप भी।',
            },
            { title: 'वोल्टेज और क्लॉक' },
            { title: 'पूरी सिस्टम जानकारी' },
            { title: 'सिंगल और मल्टी-मॉनिटर जानकारी' },
            { title: 'सेंसर सीधे पढ़ता है', text: 'किसी दूसरे मॉनिटरिंग ऐप की ज़रूरत नहीं।' },
            {
              title: 'कम CPU और मेमोरी उपयोग',
              text: 'हमारे टेस्ट PC पर वर्ज़न 0.2 में, विंडो खुली रहने पर भी औसतन 1% से कम CPU।',
            },
            {
              title: '7 दिन की हिस्ट्री',
              text: 'पिछले 5 मिनट से 7 दिन तक के चार्ट, ऐप बंद होने पर भी रिकॉर्ड होते रहते हैं।',
            },
            {
              title: 'हेल्थ चेक और अलर्ट',
              text: 'किसी भी सेंसर की सीमा तय करें; रीडिंग उसे पार करे तो Windows नोटिफ़िकेशन मिलेगा।',
            },
            {
              title: 'फ़ैन और पंप कंट्रोल',
              text: 'सुरक्षा सीमाओं के साथ अपने फ़ैन कर्व। कुछ गड़बड़ हो तो BIOS सेटिंग अपने-आप वापस आ जाती है। अभी सिर्फ़ MSI B650M GAMING PLUS WIFI पर।',
            },
          ],
        },
        {
          heading: 'गेमिंग के लिए',
          items: [
            {
              title: 'फ़्रेम रेट और ओवरले',
              text: 'FPS, 1% low और फ़्रेम टाइम, बॉर्डरलेस और विंडो मोड वाले गेम के ऊपर। गेम के अंदर कुछ नहीं डाला जाता।',
            },
            {
              title: 'अपने-आप बदलने वाली गेम प्रोफ़ाइल',
              text: 'गेम शुरू करते ही VYRO प्रोफ़ाइल, फ़ैन सेटिंग और ओवरले बदल देता है। गेम बंद करते ही सब पहले जैसा।',
            },
            {
              title: 'सेशन रीप्ले',
              text: 'अपने पिछले 100 गेम सेशन दोबारा देखें, फ़्रेम ड्रॉप, स्टटर और हीट या पावर लिमिट के मार्कर के साथ।',
            },
          ],
        },
        {
          heading: 'सिस्टम की ज़रूरतें',
          rows: [
            {
              label: 'Windows',
              minimum: 'Windows 10 (21H2) या Windows 11, 64-bit (x64)',
              recommended: 'Windows 11',
            },
            {
              label: 'CPU सेंसर',
              minimum: 'कोई भी 64-bit CPU: इस्तेमाल और क्लॉक',
              recommended: 'AMD Ryzen: साथ में तापमान, पावर और वोल्टेज',
            },
            {
              label: 'मदरबोर्ड सेंसर',
              minimum: 'Nuvoton NCT6687 चिप वाला MSI बोर्ड',
              recommended: 'MSI B650M GAMING PLUS WIFI: साथ में फ़ैन और पंप कंट्रोल',
            },
            { label: 'इंस्टॉल', minimum: 'एडमिनिस्ट्रेटर अनुमति' },
            { label: 'डिस्क स्पेस', minimum: 'हिस्ट्री के लिए 200 MB तक' },
          ],
        },
        { heading: 'Free और Pro' },
        {
          heading: 'VYRO डाउनलोड करें',
          note: 'इंस्टॉलर अभी कोड-साइन नहीं है, इसलिए चलाने से पहले Windows SmartScreen चेतावनी दिखा सकता है। सेटअप PawnIO ड्राइवर भी इंस्टॉल करता है, जिससे VYRO CPU, फ़ैन और मेमोरी के सेंसर पढ़ता है।',
        },
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
    name: 'Tanishq Jain',
    role: 'Founder',
    // From Tanishq's resume and the MenuMesh and VYRO repos (2026-10-16); written without pronouns.
    bio: 'Tanishq Jain founded Jainav Infotech and builds its products. MenuMesh is a QR table-ordering platform for restaurants, built with Next.js and Supabase, that takes an order from the guest’s phone through the kitchen to a GST bill. VYRO is a light Windows hardware monitor written in Rust and Svelte, with live sensors, history, health alerts and in-game frame rates. Baby is a voice assistant for Windows that keeps speech recognition and memory on the PC.\n\nBefore Jainav, Tanishq spent a year and a half as a software engineer at Bosch Global Software Technologies in Bangalore, building CI/CD pipelines and moving services to Docker and Kubernetes, then built a complete online counselling platform as a freelancer, from bookings to Razorpay payments. Tanishq was selected for Google Summer of Code 2022 (the PEcAn project) and studied Computer Science and Engineering at Bangalore Institute of Technology.',
    // {{CONFIRM}}: drafted from the products' principles; Tanishq to approve or replace.
    quote:
      'Software should be something you would want to use yourself: light on your machine, clear about what it does, and private from the start.',
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/tanishqjain010' },
      { label: 'Instagram', url: 'https://www.instagram.com/tan.ishq_1605/' },
    ],
    founder: true,
    sortOrder: 1,
  },
  hi: {
    role: 'संस्थापक',
    bio: 'तनिष्क जैन Jainav Infotech के संस्थापक हैं, और इसके प्रोडक्ट इन्हीं के बनाए हैं। MenuMesh रेस्टोरेंट के लिए QR टेबल-ऑर्डरिंग प्लैटफ़ॉर्म है, जो Next.js और Supabase पर बना है और ऑर्डर को ग्राहक के फ़ोन से किचन होते हुए GST बिल तक ले जाता है। VYRO, Rust और Svelte में लिखा एक हल्का Windows हार्डवेयर मॉनिटर है, जिसमें लाइव सेंसर, हिस्ट्री, हेल्थ अलर्ट और गेम के फ़्रेम रेट दिखते हैं। Baby, Windows के लिए वॉइस असिस्टेंट है, जो स्पीच रिकग्निशन और मेमोरी PC पर ही रखता है।\n\nJainav से पहले तनिष्क ने बेंगलुरु में Bosch Global Software Technologies में डेढ़ साल सॉफ़्टवेयर इंजीनियर के रूप में काम किया: CI/CD पाइपलाइन बनाईं और सर्विसेज़ को Docker और Kubernetes पर चलाया। फिर फ़्रीलांसर के तौर पर एक पूरा ऑनलाइन काउंसलिंग प्लैटफ़ॉर्म बनाया, बुकिंग से लेकर Razorpay पेमेंट तक। Google Summer of Code 2022 (PEcAn प्रोजेक्ट) में तनिष्क का चयन हुआ था, और पढ़ाई Bangalore Institute of Technology से कंप्यूटर साइंस एंड इंजीनियरिंग में की।',
    quote:
      'सॉफ़्टवेयर ऐसा होना चाहिए जिसे ख़ुद इस्तेमाल करने का मन करे: मशीन पर हल्का, अपने काम के बारे में साफ़, और शुरू से ही प्राइवेट।',
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
    primary: { label: 'Start a project', href: '/services#start' },
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
          primary: { label: 'Start a project', href: '/services#start' },
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

export const legalPages: DraftSeedDoc<'legal-pages'>[] = [
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

/**
 * Commerce settings (spec §9.2): the schema defaults, plus the seeded legal drafts' version as
 * the Terms and EULA a buyer accepts. GST stays off and the SAC code empty until the CA confirms
 * them ({{SAC_CODE}}, {{CONFIRM_WITH_CA}}).
 */
export const commerceSettings = { currentTermsVersion: '0.1', currentEulaVersion: '0.1' }

// ─── Globals ─────────────────────────────────────────────────────────────────

export const siteSettings = {
  en: {
    company: {
      legalName: 'Jainav Infotech Private Limited',
      cin: '{{CIN}}',
      registeredAddress:
        '8A Brejeshwary annex, near bangali square, Indore, Madhya Pradesh, 452016',
      phone: '+91 92441 17127',
      whatsapp: '919244117127',
      // One inbox for now: every form's alerts and replies go to it.
      emails: {
        hello: 'support@jainavinfotech.in',
        sales: 'support@jainavinfotech.in',
        support: 'support@jainavinfotech.in',
        careers: 'support@jainavinfotech.in',
        privacy: 'support@jainavinfotech.in',
      },
      businessHours: '9:00 am – 6:00 pm IST', // {{BUSINESS_DAYS}}
    },
    storeEnabled: false,
    maintenanceMode: false,
    defaultSeo: {
      title: 'Jainav Infotech',
      description: 'Software products and custom software from Indore, India.',
    },
  },
  hi: {
    company: { businessHours: 'सुबह 9:00 बजे से शाम 6:00 बजे तक (IST)' },
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

/**
 * Seed content from spec Appendix A: drafts to confirm, English plus draft Hindi.
 * {{LIKE_THIS}} values are placeholders only Tanishq can provide (spec §21); nothing here is a
 * real company detail, price or URL. Product accent colors are placeholders too.
 */
import type { CollectionSlug, RequiredDataFromCollectionSlug } from 'payload'

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
// (MenuMesh: its repo and menumesh.in; Baby: nanu1605/baby v6.0.1; Clokrix, then called VYRO:
// nanu1605/vyro and vyro-releases v0.3.0). Clokrix was rechecked on 2026-11-27 against its own
// site (clokrix.jainavinfotech.in), the Clokrix team's website copy and the team's answers for
// version 2.5.5. MenuMesh's Hindi follows MenuMesh's own approved words (ग्राहक, डिश).
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
      status: 'beta', // menumesh.in is still a holding page (Tanishq, 2026-11-26)
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
      name: 'Clokrix',
      slug: 'clokrix',
      tagline: 'Know your machine.',
      summary:
        'A light Windows hardware monitor: animated CPU and GPU speedometers, sensors for each part of your PC, history, health and alerts. It reads the sensors directly, with no third-party monitoring app or library.',
      type: 'desktop',
      category: 'pc-tools',
      platforms: ['windows'],
      status: 'live',
      // Clokrix is sold, downloaded and updated on its own site, not here (Tanishq, 2026-11-27).
      hostingMode: 'external',
      externalUrl: 'https://clokrix.jainavinfotech.in',
      accentColor: '#4CC9F0', // Clokrix's app accent
      primaryButton: { type: 'visit' },
      secondaryLinks: [
        { kind: 'other', label: 'Buy Pro', url: 'https://clokrix.jainavinfotech.in/buy' },
        // Always the newest build, the one the app updates from.
        { kind: 'other', label: 'Download', url: 'https://clokrix.jainavinfotech.in/download' },
      ],
      featured: true,
      sortOrder: 2,
      ...draftHi,
      layout: [
        {
          blockType: 'productHero',
          eyebrow: 'Clokrix by Jainav',
          heading: 'Know your machine.',
          subheading: 'Live temperatures, fan speeds, voltages and clocks in a light, fast app.',
          animation: 'vyro',
        },
        // The Clokrix team's answers for 2.5.5 (2026-11-27): Free is the Dashboard and Settings,
        // everything else is Pro, so the grids say which is which.
        {
          blockType: 'featureGrid',
          heading: 'Free: your PC at a glance',
          items: [
            {
              icon: 'gauge',
              title: 'Live dashboard',
              text: 'Animated CPU and GPU speedometers and every sensor, with layouts you edit.',
            },
            {
              icon: 'thermometer',
              title: 'Temperatures',
              text: 'GPU and drives. CPU on AMD Ryzen and Intel Core. DDR5 memory on Ryzen 7000 and later, and DDR4 modules that have a sensor on AM4 and Intel 12th to 14th gen. The motherboard on boards with Nuvoton or ITE chips.',
            },
            {
              icon: 'fan',
              title: 'Fan and pump speeds',
              text: 'GPU fans, plus motherboard fans and pumps on boards with Nuvoton chips (many MSI, most ASUS, many ASRock) or ITE chips (Gigabyte).',
            },
            { icon: 'zap', title: 'Voltages and clocks' },
            {
              icon: 'scan-search',
              title: 'Reads sensors directly',
              text: 'No third-party monitoring app or library.',
            },
            {
              icon: 'feather',
              title: 'Light on your PC',
              text: 'It animates only while readings change, pauses its window when closed to the tray, and shows its own CPU and memory use on the Dashboard.',
            },
          ],
        },
        {
          blockType: 'featureGrid',
          heading: 'Pro: every part of Clokrix',
          intro: 'Every PC gets Pro free for 7 days from Clokrix’s first start.',
          items: [
            { icon: 'cpu', title: 'Full system information' },
            { icon: 'monitor', title: 'Single and multi-monitor details' },
            {
              icon: 'chart-line',
              title: '7 days of history',
              text: 'Charts from the last 5 minutes to the last 7 days, recorded by the Clokrix Sensor Service even while the app is closed. Free keeps recording too, so your history is there when you get Pro.',
            },
            {
              icon: 'bell',
              title: 'Health checks and alerts',
              text: 'Set a limit for any sensor and get a Windows notification when a reading crosses it.',
            },
            {
              icon: 'sliders-horizontal',
              title: 'Fan control and GPU tuning',
              text: 'Your own fan curves and GPU tuning, with safety limits. One click returns the fans to the BIOS settings and the GPU to stock. Fan and pump control on the MSI B650M GAMING PLUS WIFI for now, with more boards as each is checked.',
            },
            { icon: 'app-window', title: 'Desktop widgets' },
            { icon: 'smartphone', title: 'Phone app', text: 'Your PC’s readings on your phone.' },
          ],
        },
        {
          blockType: 'featureGrid',
          heading: 'Pro: made for gaming',
          items: [
            {
              icon: 'gamepad-2',
              title: 'Frame rate and overlay',
              text: 'FPS, 1% lows and frame time, measured with Intel’s PresentMon. The overlay shows over borderless and windowed games, not exclusive fullscreen, and nothing is injected into the game.',
            },
            {
              icon: 'repeat',
              title: 'Automatic game profiles',
              text: 'Start a fullscreen or borderless game and Clokrix switches to its Gaming profile, or to the settings you saved for that game. Quit, and it switches back.',
            },
            {
              icon: 'rewind',
              title: 'Session replay',
              text: 'Replay your last 100 game sessions: frame rate, frame time, usage, temperatures and power on one timeline, with markers for drops, stutters and heat or power limits.',
            },
            { icon: 'timer', title: 'Benchmark' },
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
              recommended:
                'AMD Ryzen: also temperature, power and voltage; Intel Core: also temperature',
            },
            {
              label: 'Motherboard sensors',
              minimum:
                'A board with a Nuvoton chip (many MSI, most ASUS, many ASRock) or an ITE chip (Gigabyte)',
              recommended: 'MSI B650M GAMING PLUS WIFI: also fan and pump control',
            },
            { label: 'Install', minimum: 'Administrator rights' },
            { label: 'Disk space', minimum: 'Up to 200 MB for history and game sessions' },
          ],
        },
        {
          // As the Clokrix site's home and /buy pages state them (2026-11-27); Pro is bought there.
          blockType: 'pricing',
          heading: 'Free and Pro',
          source: 'manual',
          tiers: [
            {
              name: 'Free',
              price: '₹0',
              features: [
                { text: 'The Dashboard, with its layouts and editing, and Settings' },
                {
                  text: 'Pro free for 7 days on every PC from Clokrix’s first start, with no card needed',
                },
              ],
            },
            {
              name: 'Pro',
              price: '₹10,000',
              highlight: true,
              features: [
                { text: 'Once, for life, including all taxes ($100 outside India)' },
                {
                  text: 'Everything in Free, plus health and alerts, insights, history, system details for every part of your PC, gaming, the benchmark, fan control, GPU tuning, desktop widgets, the game overlay, profiles and the phone app',
                },
                { text: 'One PC at a time: you can move it to another PC once every 30 days' },
                { text: 'Every update, for good: one payment, not a subscription' },
              ],
            },
          ],
          fullPricingUrl: 'https://clokrix.jainavinfotech.in/buy',
        },
        {
          blockType: 'ctaBand',
          heading: 'Get Clokrix',
          text: 'Clokrix is free to download from its own website. The installer isn’t code-signed yet, so Windows SmartScreen may warn before it runs. Setup also installs the PawnIO driver (CPU, motherboard and memory sensors; it stays if Clokrix is removed) and Intel’s PresentMon (frame rates).',
          useProductButtons: true,
        },
      ],
    },
    hi: {
      tagline: 'अपनी मशीन को जानिए।',
      summary:
        'Windows के लिए एक हल्का हार्डवेयर मॉनिटर: एनिमेटेड CPU और GPU स्पीडोमीटर, आपके PC के हर हिस्से के सेंसर, हिस्ट्री, हेल्थ चेक और अलर्ट। यह सेंसर सीधे पढ़ता है, किसी थर्ड-पार्टी मॉनिटरिंग ऐप या लाइब्रेरी के बिना।',
      secondaryLinks: [{ label: 'Pro ख़रीदें' }, { label: 'डाउनलोड करें' }],
      layout: [
        {
          eyebrow: 'Clokrix, Jainav की ओर से',
          heading: 'अपनी मशीन को जानिए।',
          subheading: 'लाइव तापमान, फ़ैन स्पीड, वोल्टेज और क्लॉक, एक हल्के और तेज़ ऐप में।',
        },
        {
          heading: 'फ़्री: आपका PC, एक नज़र में',
          items: [
            {
              title: 'लाइव डैशबोर्ड',
              text: 'एनिमेटेड CPU और GPU स्पीडोमीटर और हर सेंसर, ऐसे लेआउट में जिन्हें आप बदल सकते हैं।',
            },
            {
              title: 'तापमान',
              text: 'GPU और ड्राइव। AMD Ryzen और Intel Core पर CPU। Ryzen 7000 और उसके बाद के प्रोसेसर पर DDR5 मेमोरी, और AM4 व Intel की 12वीं से 14वीं पीढ़ी पर सेंसर वाले DDR4 मॉड्यूल। Nuvoton या ITE चिप वाले बोर्ड पर मदरबोर्ड।',
            },
            {
              title: 'फ़ैन और पंप की स्पीड',
              text: 'GPU फ़ैन, और Nuvoton चिप (कई MSI, ज़्यादातर ASUS, कई ASRock) या ITE चिप (Gigabyte) वाले बोर्ड पर मदरबोर्ड के फ़ैन और पंप भी।',
            },
            { title: 'वोल्टेज और क्लॉक' },
            {
              title: 'सेंसर सीधे पढ़ता है',
              text: 'किसी थर्ड-पार्टी मॉनिटरिंग ऐप या लाइब्रेरी के बिना।',
            },
            {
              title: 'आपके PC पर हल्का',
              text: 'यह तभी एनिमेट करता है जब रीडिंग बदलती है, ट्रे में बंद करने पर अपनी विंडो रोक देता है, और डैशबोर्ड पर अपना CPU और मेमोरी उपयोग दिखाता है।',
            },
          ],
        },
        {
          heading: 'प्रो: Clokrix का हर हिस्सा',
          intro: 'हर PC पर Clokrix के पहली बार शुरू होने से 7 दिन तक प्रो मुफ़्त।',
          items: [
            { title: 'पूरी सिस्टम जानकारी' },
            { title: 'सिंगल और मल्टी-मॉनिटर जानकारी' },
            {
              title: '7 दिन की हिस्ट्री',
              text: 'पिछले 5 मिनट से 7 दिन तक के चार्ट, जिन्हें Clokrix Sensor Service ऐप बंद होने पर भी रिकॉर्ड करती है। फ़्री में भी रिकॉर्डिंग चलती रहती है, इसलिए प्रो लेने पर आपकी हिस्ट्री मौजूद रहती है।',
            },
            {
              title: 'हेल्थ चेक और अलर्ट',
              text: 'किसी भी सेंसर की सीमा तय करें; रीडिंग उसे पार करे तो Windows नोटिफ़िकेशन मिलेगा।',
            },
            {
              title: 'फ़ैन कंट्रोल और GPU ट्यूनिंग',
              text: 'सुरक्षा सीमाओं के साथ अपने फ़ैन कर्व और GPU ट्यूनिंग। एक क्लिक में फ़ैन BIOS सेटिंग पर और GPU स्टॉक सेटिंग पर लौट आते हैं। फ़ैन और पंप कंट्रोल अभी MSI B650M GAMING PLUS WIFI पर; हर बोर्ड की जाँच के बाद और बोर्ड जुड़ते जाएँगे।',
            },
            { title: 'डेस्कटॉप विजेट' },
            { title: 'फ़ोन ऐप', text: 'आपके PC की रीडिंग, आपके फ़ोन पर।' },
          ],
        },
        {
          heading: 'प्रो: गेमिंग के लिए',
          items: [
            {
              title: 'फ़्रेम रेट और ओवरले',
              text: 'FPS, 1% low और फ़्रेम टाइम, Intel के PresentMon से मापे हुए। ओवरले बॉर्डरलेस और विंडो मोड वाले गेम के ऊपर दिखता है, एक्सक्लूसिव फ़ुलस्क्रीन पर नहीं, और गेम के अंदर कुछ नहीं डाला जाता।',
            },
            {
              title: 'अपने-आप बदलने वाली गेम प्रोफ़ाइल',
              text: 'फ़ुलस्क्रीन या बॉर्डरलेस गेम शुरू करते ही Clokrix अपनी Gaming प्रोफ़ाइल पर, या उस गेम के लिए आपकी सेव की गई सेटिंग पर चला जाता है। गेम बंद करते ही वापस।',
            },
            {
              title: 'सेशन रीप्ले',
              text: 'अपने पिछले 100 गेम सेशन दोबारा देखें: फ़्रेम रेट, फ़्रेम टाइम, इस्तेमाल, तापमान और पावर एक ही टाइमलाइन पर, फ़्रेम ड्रॉप, स्टटर और हीट या पावर लिमिट के मार्कर के साथ।',
            },
            { title: 'बेंचमार्क' },
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
              recommended: 'AMD Ryzen: साथ में तापमान, पावर और वोल्टेज; Intel Core: साथ में तापमान',
            },
            {
              label: 'मदरबोर्ड सेंसर',
              minimum:
                'Nuvoton चिप (कई MSI, ज़्यादातर ASUS, कई ASRock) या ITE चिप (Gigabyte) वाला बोर्ड',
              recommended: 'MSI B650M GAMING PLUS WIFI: साथ में फ़ैन और पंप कंट्रोल',
            },
            { label: 'इंस्टॉल', minimum: 'एडमिनिस्ट्रेटर अनुमति' },
            { label: 'डिस्क स्पेस', minimum: 'हिस्ट्री और गेम सेशन के लिए 200 MB तक' },
          ],
        },
        {
          heading: 'Free और Pro',
          tiers: [
            {
              name: 'फ़्री',
              price: '₹0',
              features: [
                { text: 'डैशबोर्ड, उसके लेआउट और एडिटिंग के साथ, और सेटिंग' },
                {
                  text: 'हर PC पर Clokrix के पहली बार शुरू होने से 7 दिन तक प्रो मुफ़्त, कार्ड की ज़रूरत नहीं',
                },
              ],
            },
            {
              name: 'प्रो',
              price: '₹10,000',
              features: [
                { text: 'एक बार, हमेशा के लिए, सभी टैक्स सहित (भारत के बाहर $100)' },
                {
                  text: 'फ़्री का सब कुछ, साथ में हेल्थ चेक और अलर्ट, इनसाइट्स, हिस्ट्री, आपके PC के हर हिस्से की सिस्टम जानकारी, गेमिंग, बेंचमार्क, फ़ैन कंट्रोल, GPU ट्यूनिंग, डेस्कटॉप विजेट, गेम ओवरले, प्रोफ़ाइल और फ़ोन ऐप',
                },
                { text: 'एक समय में एक PC पर: हर 30 दिन में एक बार इसे दूसरे PC पर ले जा सकते हैं' },
                { text: 'हर अपडेट, हमेशा के लिए: एक ही भुगतान, कोई सब्सक्रिप्शन नहीं' },
              ],
            },
          ],
        },
        {
          heading: 'Clokrix पाएँ',
          text: 'Clokrix अपनी वेबसाइट पर मुफ़्त डाउनलोड के लिए उपलब्ध है। इंस्टॉलर अभी कोड-साइन नहीं है, इसलिए चलाने से पहले Windows SmartScreen चेतावनी दिखा सकता है। सेटअप PawnIO ड्राइवर (CPU, मदरबोर्ड और मेमोरी के सेंसर के लिए; Clokrix हटाने पर भी यह बना रहता है) और Intel का PresentMon (फ़्रेम रेट के लिए) भी इंस्टॉल करता है।',
        },
      ],
    },
  },
]

// ─── Redirects ───────────────────────────────────────────────────────────────

/**
 * Paths that send visitors to a product's page with a 308 (spec §7, §8.6). The site follows them
 * for unknown paths and unknown product slugs, keeping the visitor's language.
 */
export const redirects: { from: string; product: string }[] = [
  // Clokrix's vanity path.
  { from: '/clokrix', product: 'clokrix' },
  // The vanity path from when Clokrix was called VYRO.
  { from: '/vyro', product: 'clokrix' },
  // Clokrix's page until 2026-11-27; its old sub-pages (/products/vyro/pricing…) land here too.
  { from: '/products/vyro', product: 'clokrix' },
]

// ─── Services ────────────────────────────────────────────────────────────────

export const services: (SeedDoc<'services'> & { related: string[] })[] = [
  {
    related: ['menumesh', 'clokrix', 'baby'],
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
      capabilities: [{ text: 'वेब ऐप' }, { text: 'SaaS प्लेटफ़ॉर्म' }, { text: 'मोबाइल और डेस्कटॉप ऐप' }],
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
    // From Tanishq's resume and the MenuMesh and VYRO (now Clokrix) repos (2026-10-16); written
    // without pronouns.
    bio: 'Tanishq Jain founded Jainav Infotech and builds its products. MenuMesh is a QR table-ordering platform for restaurants, built with Next.js and Supabase, that takes an order from the guest’s phone through the kitchen to a GST bill. Clokrix is a light Windows hardware monitor written in Rust and Svelte, with live sensors, history, health alerts and in-game frame rates. Baby is a voice assistant for Windows that keeps speech recognition and memory on the PC.\n\nBefore Jainav, Tanishq spent a year and a half as a software engineer at Bosch Global Software Technologies in Bangalore, building CI/CD pipelines and moving services to Docker and Kubernetes, then built a complete online counselling platform as a freelancer, from bookings to Razorpay payments. Tanishq was selected for Google Summer of Code 2022 (the PEcAn project) and studied Computer Science and Engineering at Bangalore Institute of Technology.',
    quote:
      'If a hardware monitor slows down the game it’s measuring, it isn’t doing its job. I try to hold everything I build to tests that simple.',
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/tanishqjain010' },
      { label: 'Instagram', url: 'https://www.instagram.com/tan.ishq_1605/' },
    ],
    founder: true,
    sortOrder: 1,
  },
  hi: {
    role: 'संस्थापक',
    bio: 'तनिष्क जैन Jainav Infotech के संस्थापक हैं, और इसके प्रोडक्ट इन्हीं के बनाए हैं। MenuMesh रेस्टोरेंट के लिए QR टेबल-ऑर्डरिंग प्लैटफ़ॉर्म है, जो Next.js और Supabase पर बना है और ऑर्डर को ग्राहक के फ़ोन से किचन होते हुए GST बिल तक ले जाता है। Clokrix, Rust और Svelte में लिखा एक हल्का Windows हार्डवेयर मॉनिटर है, जिसमें लाइव सेंसर, हिस्ट्री, हेल्थ अलर्ट और गेम के फ़्रेम रेट दिखते हैं। Baby, Windows के लिए वॉइस असिस्टेंट है, जो स्पीच रिकग्निशन और मेमोरी PC पर ही रखता है।\n\nJainav से पहले तनिष्क ने बेंगलुरु में Bosch Global Software Technologies में डेढ़ साल सॉफ़्टवेयर इंजीनियर के रूप में काम किया: CI/CD पाइपलाइन बनाईं और सर्विसेज़ को Docker और Kubernetes पर चलाया। फिर फ़्रीलांसर के तौर पर एक पूरा ऑनलाइन काउंसलिंग प्लैटफ़ॉर्म बनाया, बुकिंग से लेकर Razorpay पेमेंट तक। Google Summer of Code 2022 (PEcAn प्रोजेक्ट) में तनिष्क का चयन हुआ था, और पढ़ाई Bangalore Institute of Technology से कंप्यूटर साइंस एंड इंजीनियरिंग में की।',
    quote:
      'अगर हार्डवेयर मॉनिटर उसी गेम को धीमा कर दे जिसे वह माप रहा है, तो वह अपना काम ठीक से नहीं कर रहा। मेरी कोशिश रहती है कि मैं जो भी बनाऊँ, वह ऐसी ही सीधी कसौटियों पर खरा उतरे।',
  },
}

export const faqs: SeedDoc<'faqs'>[] = [
  {
    en: {
      question: 'What does Jainav Infotech do?',
      answer:
        'We build our own software products, MenuMesh, Clokrix and Baby, and custom software for businesses.',
      category: 'general',
      sortOrder: 1,
    },
    hi: {
      question: 'Jainav Infotech क्या करता है?',
      answer:
        'हम अपने सॉफ़्टवेयर प्रोडक्ट, MenuMesh, Clokrix और Baby, और व्यवसायों के लिए कस्टम सॉफ़्टवेयर बनाते हैं।',
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
            'Products like MenuMesh, Clokrix and Baby, plus custom software for your business.',
          primary: { label: 'Explore products', href: '/products' },
          secondary: { label: 'Build with us', href: '/services' },
          chips: [
            { label: 'My restaurant', href: '/products/menumesh' },
            { label: 'My PC', href: '/products/clokrix' },
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
          subheadline: 'MenuMesh, Clokrix और Baby जैसे प्रोडक्ट, और आपके व्यवसाय के लिए कस्टम सॉफ़्टवेयर।',
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
          subheadline: 'Custom software from the team behind MenuMesh, Clokrix and Baby.',
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
          subheadline: 'MenuMesh, Clokrix और Baby बनाने वाली टीम से कस्टम सॉफ़्टवेयर।',
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

// ─── Legal drafts (Owner approves by publishing, spec §8.13) ─────────────────

/** Their text is in ./legal/{slug}.{en,hi}.md (seed.ts legalBody). */
export const legalPages: DraftSeedDoc<'legal-pages'>[] = [
  ['privacy', 'Privacy Policy', 'गोपनीयता नीति'],
  ['terms', 'Terms of Service', 'सेवा की शर्तें'],
  ['refunds-cancellation', 'Refunds and Cancellation', 'रिफ़ंड और रद्दीकरण'],
  ['shipping-delivery', 'Shipping and Delivery', 'शिपिंग और डिलीवरी'],
  ['cookies', 'Cookie Policy', 'कुकी नीति'],
  ['privacy-requests', 'Privacy Requests and Grievances', 'गोपनीयता अनुरोध और शिकायतें'],
].map(([slug, title, titleHi]) => ({
  en: { title, slug, version: '0.1', ...draftHi },
  hi: { title: titleHi },
}))

/**
 * Commerce settings (spec §9.2): the schema defaults, plus the versions checkout records with each
 * order: the seeded Terms draft's, and 0.1 for the EULA of a product sold here. No product EULA is
 * seeded: since 2026-11-27 Clokrix is sold on its own site (`pnpm seed:store` adds a sample
 * product's EULA locally). Also the refund window that Refunds and Cancellation states (7 days,
 * set by Tanishq on 2026-11-26; nothing enforces it). GST stays off and the SAC code empty until
 * the CA confirms them ({{SAC_CODE}}, {{CONFIRM_WITH_CA}}).
 */
export const commerceSettings = {
  currentTermsVersion: '0.1',
  currentEulaVersion: '0.1',
  refundWindowDays: 7,
}

// ─── Globals ─────────────────────────────────────────────────────────────────

export const siteSettings = {
  en: {
    company: {
      legalName: 'Jainav Infotech Private Limited',
      cin: 'U62099MP2026PTC087972',
      gstin: '23AAHCJ6800H1ZS',
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
      businessHours: 'Monday to Saturday, 9:00 am – 6:00 pm IST',
      grievanceOfficer: { name: 'Tanishq Jain', title: 'Director' },
    },
    storeEnabled: false,
    maintenanceMode: false,
    defaultSeo: {
      title: 'Jainav Infotech',
      description: 'Software products and custom software from Indore, India.',
    },
  },
  hi: {
    company: {
      businessHours: 'सोमवार से शनिवार, सुबह 9:00 बजे से शाम 6:00 बजे तक (IST)',
      grievanceOfficer: { name: 'तनिष्क जैन', title: 'निदेशक' },
    },
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
          { label: 'Clokrix', href: '/products/clokrix' },
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
          { label: 'Privacy requests', href: '/legal/privacy-requests' },
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
        links: [{ label: 'MenuMesh' }, { label: 'Clokrix' }, { label: 'Baby' }],
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
          { label: 'गोपनीयता अनुरोध' },
        ],
      },
    ],
  },
}

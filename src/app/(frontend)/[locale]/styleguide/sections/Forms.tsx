'use client'

import { Mail, Phone, Search } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import { z } from 'zod'

import { toast } from '@/components/feedback/Toast'
import { Checkbox } from '@/components/forms/Checkbox'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/forms/Input'
import { MultiStepForm, type FormStep } from '@/components/forms/MultiStepForm'
import { OTPInput } from '@/components/forms/OTPInput'
import { RadioGroup } from '@/components/forms/RadioGroup'
import { Select } from '@/components/forms/Select'
import { Switch } from '@/components/forms/Switch'
import { Textarea } from '@/components/forms/Textarea'
import { TurnstileWidget } from '@/components/forms/TurnstileWidget'
import { Link } from '@/i18n/navigation'

// Sample content (like CMS data), not UI chrome: inline per locale.
const COPY = {
  en: {
    textFields: 'Text fields',
    fullName: 'Full name',
    fullNamePlaceholder: 'e.g. Priya Sharma',
    workEmail: 'Work email',
    workEmailHint: 'We only use it to reply to you.',
    search: 'Search products',
    mobile: 'Mobile number',
    company: 'Company (disabled)',
    licence: 'Licence key (read-only)',
    longText: 'Long text and select',
    other: 'Anything else?',
    notes: 'Internal notes (disabled)',
    notesValue: 'Follow up after the VYRO Pro launch.',
    service: 'Service',
    chooseService: 'Choose a service',
    budget: 'Budget',
    chooseBudget: 'Choose a budget',
    platform: 'Platform (disabled)',
    choices: 'Choices',
    product: 'Which product are you interested in?',
    betaDisabled: 'Beta builds (disabled)',
    budgetDisabled: 'Budget (disabled)',
    notifyPro: 'Tell me when VYRO Pro launches',
    beta: 'Get beta builds of VYRO',
    autoUpdate: 'Automatic updates (managed by your organisation)',
    otp: 'One-time code',
    otpLabel: 'Sign-in code',
    otpHint: 'Enter the 6-digit code we emailed you. Pasting “123 456” works too.',
    otpDisabled: 'Sign-in code (disabled)',
    otpExpired: 'That code has expired. Request a new one.',
    spam: 'Spam check',
    waiting: 'Waiting for the check…',
    verified: 'Check passed.',
    wizard: 'Start a project (multi-step form)',
    steps: {
      service: 'Service',
      project: 'Project',
      budget: 'Budget',
      timeline: 'Timeline',
      contact: 'Contact',
    },
    serviceQuestion: 'What can we help with?',
    services: [
      {
        value: 'custom',
        label: 'Custom software & SaaS',
        description: 'Web apps, SaaS platforms, mobile and desktop apps.',
      },
      {
        value: 'ai',
        label: 'AI & ML solutions',
        description:
          'LLM apps and assistants, search / RAG, automation, forecasting and analytics.',
      },
      {
        value: 'cloud',
        label: 'Cloud & DevOps',
        description: 'CI/CD, containers, cloud setup, monitoring, cost tuning.',
      },
      {
        value: 'commerce',
        label: 'E-commerce & web platforms',
        description: 'Online stores, marketplaces, portals, fast marketing sites.',
      },
    ],
    details: 'What do you want to build?',
    detailsHint:
      'A few lines are enough: the problem, who will use it, and anything already in place.',
    detailsPlaceholder: 'What should it do, and who is it for?',
    website: 'Existing website or app (optional)',
    budgetQuestion: 'What budget do you have in mind?',
    budgets: [
      { value: 'under-5l', label: 'Under ₹5 lakh' },
      { value: '5-15l', label: '₹5–15 lakh' },
      { value: '15-40l', label: '₹15–40 lakh' },
      { value: 'over-40l', label: 'Over ₹40 lakh' },
      { value: 'unsure', label: 'Not sure yet', description: 'We’ll help you size it.' },
    ],
    timelineQuestion: 'When would you like to start?',
    timelines: [
      { value: 'asap', label: 'As soon as possible' },
      { value: '1-3m', label: 'In 1–3 months' },
      { value: '3-6m', label: 'In 3–6 months' },
      { value: 'flexible', label: 'No rush' },
    ],
    name: 'Your name',
    email: 'Email',
    phone: 'Phone or WhatsApp (optional)',
    phoneHint: 'An Indian mobile number, if you’d like a call back.',
    consent: 'I agree that Jainav Infotech may store these details to reply to this enquiry.',
    marketing: 'Also send me occasional product news about MenuMesh, VYRO and Baby.',
    notice:
      'We use your details only to reply to you, and you can ask us to delete them at any time.',
    privacy: 'Privacy policy',
    submit: 'Send project brief',
    sentTitle: 'Thanks! We’ve received your project brief.',
    sentBody: 'This is a styleguide demo, so nothing was actually sent.',
    errors: {
      service: 'Choose the service that fits best.',
      details: 'Tell us a little more (at least 20 characters).',
      website: 'Enter a full link, like https://example.com',
      budget: 'Pick a budget range, or “Not sure yet”.',
      timeline: 'Pick when you’d like to start.',
      name: 'Enter your name.',
      email: 'Enter a valid email address, like name@example.com',
      phone: 'Enter a 10-digit Indian mobile number.',
      consent: 'Please agree so we can reply to you.',
    },
  },
  hi: {
    textFields: 'टेक्स्ट फ़ील्ड',
    fullName: 'पूरा नाम',
    fullNamePlaceholder: 'जैसे, प्रिया शर्मा',
    workEmail: 'काम का ईमेल',
    workEmailHint: 'हम इसका इस्तेमाल सिर्फ़ आपको जवाब देने के लिए करेंगे।',
    search: 'प्रोडक्ट खोजें',
    mobile: 'मोबाइल नंबर',
    company: 'कंपनी (निष्क्रिय)',
    licence: 'लाइसेंस कुंजी (केवल पढ़ने के लिए)',
    longText: 'लंबा टेक्स्ट और चयन',
    other: 'कुछ और बताना चाहेंगे?',
    notes: 'आंतरिक नोट्स (निष्क्रिय)',
    notesValue: 'VYRO Pro लॉन्च होने के बाद संपर्क करें।',
    service: 'सेवा',
    chooseService: 'सेवा चुनें',
    budget: 'बजट',
    chooseBudget: 'बजट चुनें',
    platform: 'प्लेटफ़ॉर्म (निष्क्रिय)',
    choices: 'विकल्प',
    product: 'आपकी रुचि किस प्रोडक्ट में है?',
    betaDisabled: 'बीटा बिल्ड (निष्क्रिय)',
    budgetDisabled: 'बजट (निष्क्रिय)',
    notifyPro: 'VYRO Pro लॉन्च होने पर मुझे बताएँ',
    beta: 'VYRO के बीटा बिल्ड पाएँ',
    autoUpdate: 'अपने-आप होने वाले अपडेट (आपकी संस्था द्वारा नियंत्रित)',
    otp: 'वन-टाइम कोड',
    otpLabel: 'साइन-इन कोड',
    otpHint: 'हमने ईमेल पर जो 6 अंकों का कोड भेजा है, उसे लिखें। “123 456” पेस्ट करना भी चलेगा।',
    otpDisabled: 'साइन-इन कोड (निष्क्रिय)',
    otpExpired: 'इस कोड की समय-सीमा ख़त्म हो चुकी है। नया कोड मँगवाएँ।',
    spam: 'स्पैम जाँच',
    waiting: 'जाँच का इंतज़ार है…',
    verified: 'जाँच पूरी हुई।',
    wizard: 'प्रोजेक्ट शुरू करें (कई चरणों वाला फ़ॉर्म)',
    steps: {
      service: 'सेवा',
      project: 'प्रोजेक्ट',
      budget: 'बजट',
      timeline: 'समय-सीमा',
      contact: 'संपर्क',
    },
    serviceQuestion: 'हम किस काम में आपकी मदद करें?',
    services: [
      {
        value: 'custom',
        label: 'कस्टम सॉफ़्टवेयर और SaaS',
        description: 'वेब ऐप, SaaS प्लेटफ़ॉर्म, मोबाइल और डेस्कटॉप ऐप।',
      },
      {
        value: 'ai',
        label: 'AI और ML समाधान',
        description: 'LLM ऐप और असिस्टेंट, सर्च / RAG, ऑटोमेशन, पूर्वानुमान और एनालिटिक्स।',
      },
      {
        value: 'cloud',
        label: 'क्लाउड और DevOps',
        description: 'CI/CD, कंटेनर, क्लाउड सेटअप, मॉनिटरिंग और ख़र्च में बचत।',
      },
      {
        value: 'commerce',
        label: 'ई-कॉमर्स और वेब प्लेटफ़ॉर्म',
        description: 'ऑनलाइन स्टोर, मार्केटप्लेस, पोर्टल और तेज़ मार्केटिंग वेबसाइटें।',
      },
    ],
    details: 'आप क्या बनाना चाहते हैं?',
    detailsHint:
      'कुछ पंक्तियाँ काफ़ी हैं: समस्या क्या है, इसे कौन इस्तेमाल करेगा और अभी क्या-क्या मौजूद है।',
    detailsPlaceholder: 'यह क्या करेगा, और किसके लिए है?',
    website: 'मौजूदा वेबसाइट या ऐप (वैकल्पिक)',
    budgetQuestion: 'आपके मन में कितना बजट है?',
    budgets: [
      { value: 'under-5l', label: '₹5 लाख से कम' },
      { value: '5-15l', label: '₹5–15 लाख' },
      { value: '15-40l', label: '₹15–40 लाख' },
      { value: 'over-40l', label: '₹40 लाख से ज़्यादा' },
      { value: 'unsure', label: 'अभी तय नहीं', description: 'हम मिलकर सही अंदाज़ा लगा लेंगे।' },
    ],
    timelineQuestion: 'आप कब शुरू करना चाहेंगे?',
    timelines: [
      { value: 'asap', label: 'जितनी जल्दी हो सके' },
      { value: '1-3m', label: '1–3 महीने में' },
      { value: '3-6m', label: '3–6 महीने में' },
      { value: 'flexible', label: 'कोई जल्दी नहीं' },
    ],
    name: 'आपका नाम',
    email: 'ईमेल',
    phone: 'फ़ोन या WhatsApp (वैकल्पिक)',
    phoneHint: 'भारतीय मोबाइल नंबर, अगर आप चाहते हैं कि हम आपको कॉल करें।',
    consent:
      'मैं सहमत हूँ कि Jainav Infotech इस पूछताछ का जवाब देने के लिए मेरी यह जानकारी सहेज सकती है।',
    marketing: 'मुझे MenuMesh, VYRO और Baby से जुड़ी ख़बरें भी कभी-कभार भेजें।',
    notice:
      'आपकी जानकारी का इस्तेमाल सिर्फ़ आपको जवाब देने के लिए होता है, और आप कभी भी इसे हटाने के लिए कह सकते हैं।',
    privacy: 'गोपनीयता नीति',
    submit: 'प्रोजेक्ट की जानकारी भेजें',
    sentTitle: 'धन्यवाद! आपके प्रोजेक्ट की जानकारी हमें मिल गई है।',
    sentBody: 'यह स्टाइलगाइड का डेमो है, इसलिए असल में कुछ भी नहीं भेजा गया।',
    errors: {
      service: 'जो सेवा सबसे सही लगे, उसे चुनें।',
      details: 'थोड़ा और बताइए (कम से कम 20 अक्षर)।',
      website: 'पूरा लिंक लिखें, जैसे https://example.com',
      budget: 'कोई बजट चुनें, या “अभी तय नहीं”।',
      timeline: 'बताइए कि आप कब शुरू करना चाहेंगे।',
      name: 'अपना नाम लिखें।',
      email: 'सही ईमेल पता लिखें, जैसे name@example.com',
      phone: '10 अंकों का भारतीय मोबाइल नंबर लिखें।',
      consent: 'जवाब पाने के लिए कृपया सहमति दें।',
    },
  },
}
type Copy = (typeof COPY)['en']

const PRODUCTS = {
  en: [
    { value: 'menumesh', label: 'MenuMesh', description: 'QR table ordering for restaurants.' },
    { value: 'vyro', label: 'VYRO', description: 'Know your machine.' },
    { value: 'baby', label: 'Baby', description: 'Your private voice assistant for Windows.' },
  ],
  hi: [
    { value: 'menumesh', label: 'MenuMesh', description: 'रेस्तराँ के लिए QR टेबल ऑर्डरिंग।' },
    { value: 'vyro', label: 'VYRO', description: 'अपनी मशीन को जानिए।' },
    { value: 'baby', label: 'Baby', description: 'Windows के लिए आपका निजी वॉइस असिस्टेंट।' },
  ],
}

const projectSchema = (e: Copy['errors']) =>
  z.object({
    service: z.enum(['custom', 'ai', 'cloud', 'commerce'], e.service),
    details: z.string().trim().min(20, e.details),
    website: z.union([z.literal(''), z.url(e.website)]),
    budget: z.enum(['under-5l', '5-15l', '15-40l', 'over-40l', 'unsure'], e.budget),
    timeline: z.enum(['asap', '1-3m', '3-6m', 'flexible'], e.timeline),
    name: z.string().trim().min(2, e.name),
    email: z.email(e.email),
    phone: z.union([z.literal(''), z.string().regex(/^(\+91[ -]?)?[6-9]\d{9}$/, e.phone)]),
    consent: z.boolean().refine(Boolean, e.consent),
    marketing: z.boolean(),
  })
type ProjectInput = z.input<ReturnType<typeof projectSchema>>

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-5">
      <h3 className="font-display text-base font-semibold text-fg">{title}</h3>
      {children}
    </div>
  )
}

function ChoiceStep({
  name,
  label,
  options,
  className,
}: {
  name: 'service' | 'budget' | 'timeline'
  label: string
  options: Copy['services'] | Copy['budgets']
  className?: string
}) {
  const { register, formState } = useFormContext<ProjectInput>()
  return (
    <FormField label={label} error={formState.errors[name]?.message} required group>
      <RadioGroup options={options} className={className} {...register(name)} />
    </FormField>
  )
}

function ProjectStep({ c }: { c: Copy }) {
  const { register, formState } = useFormContext<ProjectInput>()
  return (
    <>
      <FormField
        label={c.details}
        description={c.detailsHint}
        error={formState.errors.details?.message}
        required
      >
        <Textarea placeholder={c.detailsPlaceholder} {...register('details')} />
      </FormField>
      <FormField label={c.website} error={formState.errors.website?.message}>
        <Input type="url" inputMode="url" placeholder="https://" {...register('website')} />
      </FormField>
    </>
  )
}

function ContactStep({ c }: { c: Copy }) {
  const { register, formState } = useFormContext<ProjectInput>()
  const { errors } = formState
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={c.name} error={errors.name?.message} required>
          <Input autoComplete="name" {...register('name')} />
        </FormField>
        <FormField label={c.email} error={errors.email?.message} required>
          <Input type="email" autoComplete="email" leadingIcon={<Mail />} {...register('email')} />
        </FormField>
      </div>
      <FormField label={c.phone} description={c.phoneHint} error={errors.phone?.message}>
        <Input type="tel" autoComplete="tel" leadingIcon={<Phone />} {...register('phone')} />
      </FormField>
      <div>
        <FormField error={errors.consent?.message} required>
          <Checkbox label={c.consent} {...register('consent')} />
        </FormField>
        <Checkbox label={c.marketing} {...register('marketing')} />
      </div>
      <p className="text-sm text-fg-muted">
        {c.notice}{' '}
        <Link href="/legal/privacy" className="text-fg underline underline-offset-4">
          {c.privacy}
        </Link>
      </p>
    </>
  )
}

function StartProjectForm({ c }: { c: Copy }) {
  const schema = useMemo(() => projectSchema(c.errors), [c])
  const steps: FormStep<ProjectInput>[] = [
    {
      id: 'service',
      title: c.steps.service,
      fields: ['service'],
      content: (
        <ChoiceStep
          name="service"
          label={c.serviceQuestion}
          options={c.services}
          className="sm:grid-cols-2"
        />
      ),
    },
    {
      id: 'project',
      title: c.steps.project,
      fields: ['details', 'website'],
      content: <ProjectStep c={c} />,
    },
    {
      id: 'budget',
      title: c.steps.budget,
      fields: ['budget'],
      content: (
        <ChoiceStep
          name="budget"
          label={c.budgetQuestion}
          options={c.budgets}
          className="sm:grid-cols-2"
        />
      ),
    },
    {
      id: 'timeline',
      title: c.steps.timeline,
      fields: ['timeline'],
      content: <ChoiceStep name="timeline" label={c.timelineQuestion} options={c.timelines} />,
    },
    {
      id: 'contact',
      title: c.steps.contact,
      fields: ['name', 'email', 'phone', 'consent', 'marketing'],
      content: <ContactStep c={c} />,
    },
  ]

  return (
    <MultiStepForm
      // A new locale means new error messages: start the demo fresh.
      key={c.submit}
      schema={schema}
      defaultValues={{
        details: '',
        website: '',
        name: '',
        email: '',
        phone: '',
        consent: false,
        marketing: false,
      }}
      steps={steps}
      submitLabel={c.submit}
      onSubmit={async () => {
        await new Promise((resolve) => setTimeout(resolve, 800))
        toast({ tone: 'success', title: c.sentTitle, description: c.sentBody })
      }}
      className="rounded-lg border border-border bg-surface p-4 sm:p-6"
    />
  )
}

function TurnstileDemo({ c }: { c: Copy }) {
  const [token, setToken] = useState<string | null>(null)
  return (
    <div className="grid gap-2">
      <TurnstileWidget onToken={setToken} />
      <p aria-live="polite" className="text-sm text-fg-muted">
        {token ? c.verified : c.waiting}
      </p>
    </div>
  )
}

export default function FormsSection() {
  const locale = useLocale()
  const c = locale === 'hi' ? COPY.hi : COPY.en
  const products = locale === 'hi' ? PRODUCTS.hi : PRODUCTS.en
  // Unique radio names per panel: the styleguide renders this section twice.
  const uid = useId()

  return (
    <div className="grid gap-12">
      <Block title={c.textFields}>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={c.fullName} required>
            <Input autoComplete="name" placeholder={c.fullNamePlaceholder} />
          </FormField>
          <FormField label={c.workEmail} description={c.workEmailHint}>
            <Input type="email" leadingIcon={<Mail />} placeholder="you@company.com" />
          </FormField>
          <FormField label={c.search}>
            <Input
              type="search"
              size="sm"
              leadingIcon={<Search />}
              placeholder="MenuMesh, VYRO, Baby…"
            />
          </FormField>
          <FormField label={c.mobile} error={c.errors.phone}>
            <Input type="tel" defaultValue="98765" leadingIcon={<Phone />} />
          </FormField>
          <FormField label={c.company}>
            <Input defaultValue="Jainav Infotech Private Limited" disabled />
          </FormField>
          <FormField label={c.licence}>
            <Input defaultValue="VYRO-XXXX-XXXX-XXXX" readOnly className="font-mono" />
          </FormField>
        </div>
      </Block>

      <Block title={c.longText}>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label={c.details} description={c.detailsHint} className="sm:col-span-2">
            <Textarea placeholder={c.detailsPlaceholder} />
          </FormField>
          <FormField label={c.other} error={c.errors.details}>
            <Textarea size="sm" defaultValue="MenuMesh" />
          </FormField>
          <FormField label={c.notes}>
            <Textarea size="sm" defaultValue={c.notesValue} disabled />
          </FormField>
          <FormField label={c.service} required>
            <Select defaultValue="">
              <option value="" disabled>
                {c.chooseService}
              </option>
              {c.services.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={c.budget} error={c.errors.budget}>
            <Select size="sm" defaultValue="">
              <option value="" disabled>
                {c.chooseBudget}
              </option>
              {c.budgets.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={c.platform}>
            <Select disabled>
              <option>Windows</option>
            </Select>
          </FormField>
        </div>
      </Block>

      <Block title={c.choices}>
        <div className="grid gap-1">
          <Checkbox label={c.marketing} />
          <Checkbox label={c.consent} defaultChecked />
          <Checkbox label={c.betaDisabled} disabled />
          <FormField error={c.errors.consent} required>
            <Checkbox label={c.consent} />
          </FormField>
        </div>
        <FormField label={c.product} group>
          <RadioGroup
            name={`${uid}-product`}
            options={products}
            defaultValue="vyro"
            className="sm:grid-cols-3"
          />
        </FormField>
        <FormField label={c.timelineQuestion} error={c.errors.timeline} required group>
          <RadioGroup name={`${uid}-timeline`} options={c.timelines} className="sm:grid-cols-2" />
        </FormField>
        <FormField label={c.budgetDisabled} group>
          <RadioGroup
            name={`${uid}-budget`}
            options={c.budgets.slice(0, 2)}
            defaultValue="5-15l"
            disabled
          />
        </FormField>
        <div className="grid gap-1">
          <Switch label={c.notifyPro} name="notify-pro" defaultChecked />
          <Switch label={c.beta} name="beta" />
          <Switch label={c.autoUpdate} defaultChecked disabled />
        </div>
      </Block>

      <Block title={c.otp}>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField label={c.otpLabel} description={c.otpHint} className="sm:col-span-2">
            <OTPInput />
          </FormField>
          <FormField label={c.otpLabel} error={c.otpExpired}>
            <OTPInput defaultValue="482" />
          </FormField>
          <FormField label={c.otpDisabled}>
            <OTPInput defaultValue="123456" disabled />
          </FormField>
        </div>
      </Block>

      <Block title={c.spam}>
        <TurnstileDemo c={c} />
      </Block>

      <Block title={c.wizard}>
        <StartProjectForm c={c} />
      </Block>
    </div>
  )
}

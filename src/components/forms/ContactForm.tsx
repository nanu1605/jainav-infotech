'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod/mini'

import { CONTACT_TOPICS, contactSchema } from '@/lib/forms/schemas'

import { Checkbox } from './Checkbox'
import { FormField } from './FormField'
import { Input } from './Input'
import { FormActions, LeadForm, OptionalLabel, SuccessPanel, useErrorText } from './LeadForm'
import { Select } from './Select'
import { Textarea } from './Textarea'
import { useLeadSubmit } from './useLeadSubmit'

type Topic = (typeof CONTACT_TOPICS)[number]

export type ContactFormProps = {
  products: { slug: string; name: string }[]
  topic?: Topic
  product?: string
}

/**
 * Topic-routed contact form (spec §13). `?topic=` and `?product=` preselect too: they are read
 * on the client, so the page stays static and prerenders the form without them.
 */
export function ContactForm(props: ContactFormProps) {
  return (
    <Suspense fallback={<ContactFields {...props} />}>
      <FromUrl {...props} />
    </Suspense>
  )
}

function FromUrl(props: ContactFormProps) {
  const params = useSearchParams()
  const product = params.get('product')
  return (
    <ContactFields
      {...props}
      topic={CONTACT_TOPICS.find((t) => t === params.get('topic')) ?? props.topic}
      product={props.products.some((p) => p.slug === product) ? product! : props.product}
    />
  )
}

function ContactFields({ products, topic, product = '' }: ContactFormProps) {
  const t = useTranslations('forms')
  const errorText = useErrorText()
  const lead = useLeadSubmit('contact')
  const form = useForm<z.input<typeof contactSchema>, unknown, z.output<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      topic,
      name: '',
      email: '',
      phone: '',
      company: '',
      product,
      message: '',
      marketing: false,
    },
    mode: 'onTouched',
  })
  const { register } = form
  const { errors, isSubmitting } = form.formState

  if (lead.sent) {
    return <SuccessPanel title={t('contact.successTitle')} text={t('contact.successText')} />
  }
  return (
    <LeadForm form={form} onValid={(values) => lead.submit(values)}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={t('fields.topic')} error={errorText(errors.topic)} required>
          {/* defaultValue too, so the server-rendered HTML shows the preset before hydration. */}
          <Select defaultValue={topic ?? ''} {...register('topic')}>
            <option value="">{t('fields.chooseTopic')}</option>
            {CONTACT_TOPICS.map((value) => (
              <option key={value} value={value}>
                {t(`topics.${value}`)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('fields.product')} error={errorText(errors.product)}>
          <Select defaultValue={product} {...register('product')}>
            <option value="">{t('fields.noProduct')}</option>
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('fields.name')} error={errorText(errors.name)} required>
          <Input autoComplete="name" {...register('name')} />
        </FormField>
        <FormField label={t('fields.email')} error={errorText(errors.email)} required>
          <Input type="email" autoComplete="email" {...register('email')} />
        </FormField>
        <FormField
          label={<OptionalLabel>{t('fields.phone')}</OptionalLabel>}
          error={errorText(errors.phone)}
        >
          <Input type="tel" autoComplete="tel" {...register('phone')} />
        </FormField>
        <FormField
          label={<OptionalLabel>{t('fields.company')}</OptionalLabel>}
          error={errorText(errors.company)}
        >
          <Input autoComplete="organization" {...register('company')} />
        </FormField>
      </div>
      <FormField label={t('fields.message')} error={errorText(errors.message)} required>
        <Textarea {...register('message')} />
      </FormField>
      <Checkbox label={t('consent.marketing')} {...register('marketing')} />
      {lead.spamChecks}
      <FormActions problem={lead.problem} pending={isSubmitting} label={t('contact.submit')} />
    </LeadForm>
  )
}

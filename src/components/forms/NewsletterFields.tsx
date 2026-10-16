'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'

import { newsletterSchema } from '@/lib/forms/schemas'

import { FormField } from './FormField'
import { Input } from './Input'
import { FormActions, LeadForm, SuccessPanel, useErrorText } from './LeadForm'
import { useLeadSubmit } from './useLeadSubmit'

/** The newsletter form itself; NewsletterForm loads it lazily. Subscribing is the consent. */
export function NewsletterFields({ level }: { level: 3 | 4 }) {
  const t = useTranslations('forms')
  const errorText = useErrorText()
  const lead = useLeadSubmit('newsletter')
  const form = useForm({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  })
  const { errors, isSubmitting } = form.formState

  if (lead.sent) {
    return (
      <SuccessPanel
        title={t('newsletter.successTitle')}
        text={t('newsletter.successText')}
        level={level}
      />
    )
  }
  return (
    <LeadForm form={form} onValid={(values) => lead.submit(values)}>
      <FormField label={t('fields.email')} error={errorText(errors.email)} required>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </FormField>
      {lead.spamChecks}
      <FormActions
        problem={lead.problem}
        pending={isSubmitting}
        label={t('newsletter.submit')}
        notice="newsletter"
      />
    </LeadForm>
  )
}

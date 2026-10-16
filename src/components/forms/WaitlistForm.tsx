'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'

import { waitlistSchema } from '@/lib/forms/schemas'

import { Checkbox } from './Checkbox'
import { FormField } from './FormField'
import { Input } from './Input'
import { FormActions, LeadForm, SuccessPanel, useErrorText } from './LeadForm'
import { useLeadSubmit } from './useLeadSubmit'

/** Waitlist for a product that isn't out yet (spec §13). */
export function WaitlistForm({ product }: { product: { slug: string; name: string } }) {
  const t = useTranslations('forms')
  const errorText = useErrorText()
  const lead = useLeadSubmit('waitlist')
  const form = useForm({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { product: product.slug, email: '', marketing: false },
    mode: 'onTouched',
  })
  const { errors, isSubmitting } = form.formState

  if (lead.sent) {
    // Only a ticked box is consent to the launch email (spec §13), so only then is it promised.
    return (
      <SuccessPanel
        title={t('waitlist.successTitle')}
        text={t(
          form.getValues('marketing') ? 'waitlist.successText' : 'waitlist.successTextNoEmail',
          {
            name: product.name,
          },
        )}
      />
    )
  }
  return (
    <LeadForm form={form} onValid={(values) => lead.submit(values)}>
      <FormField label={t('fields.email')} error={errorText(errors.email)} required>
        <Input type="email" autoComplete="email" {...form.register('email')} />
      </FormField>
      <Checkbox
        label={t('waitlist.marketing', { name: product.name })}
        {...form.register('marketing')}
      />
      {lead.spamChecks}
      <FormActions problem={lead.problem} pending={isSubmitting} label={t('waitlist.submit')} />
    </LeadForm>
  )
}

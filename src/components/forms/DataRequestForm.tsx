'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'

import { DATA_REQUEST_TYPES, dataRequestSchema } from '@/lib/forms/schemas'

import { FormField } from './FormField'
import { Input } from './Input'
import { FormActions, LeadForm, SuccessPanel, useErrorText } from './LeadForm'
import { RadioGroup } from './RadioGroup'
import { Textarea } from './Textarea'
import { useLeadSubmit } from './useLeadSubmit'

/** DPDP rights request or grievance (spec §16). */
export function DataRequestForm() {
  const t = useTranslations('forms')
  const errorText = useErrorText()
  const lead = useLeadSubmit('data-request')
  const form = useForm({
    resolver: zodResolver(dataRequestSchema),
    defaultValues: { email: '', details: '' },
    mode: 'onTouched',
  })
  const { register } = form
  const { errors, isSubmitting } = form.formState

  if (lead.sent) {
    return (
      <SuccessPanel title={t('dataRequest.successTitle')} text={t('dataRequest.successText')} />
    )
  }
  return (
    <LeadForm form={form} onValid={(values) => lead.submit(values)}>
      <FormField label={t('dataRequest.type')} error={errorText(errors.type)} required group>
        <RadioGroup
          options={DATA_REQUEST_TYPES.map((value) => ({
            value,
            label: t(`dataRequest.types.${value}`),
          }))}
          {...register('type')}
        />
      </FormField>
      <FormField label={t('dataRequest.email')} error={errorText(errors.email)} required>
        <Input type="email" autoComplete="email" {...register('email')} />
      </FormField>
      <FormField
        label={t('dataRequest.details')}
        description={t('dataRequest.detailsHint')}
        error={errorText(errors.details)}
        required
      >
        <Textarea {...register('details')} />
      </FormField>
      {lead.spamChecks}
      <FormActions problem={lead.problem} pending={isSubmitting} label={t('dataRequest.submit')} />
    </LeadForm>
  )
}

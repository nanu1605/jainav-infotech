'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import * as z from 'zod/mini'

import { careersSchema, CV_MAX_BYTES } from '@/lib/forms/schemas'

import { FormField } from './FormField'
import { Input } from './Input'
import { FormActions, LeadForm, OptionalLabel, SuccessPanel, useErrorText } from './LeadForm'
import { Textarea } from './Textarea'
import { useLeadSubmit } from './useLeadSubmit'

// The CV is checked here for quick feedback; the server checks its size and PDF bytes again.
const schema = z.extend(careersSchema, {
  cv: z.pipe(
    z.pipe(
      z.custom<FileList | undefined>(),
      z.transform((files) => files?.[0]),
    ),
    z
      .file('cvRequired')
      .check(z.mime(['application/pdf'], 'pdf'), z.maxSize(CV_MAX_BYTES, 'fileSize')),
  ),
})

/** Job application, or an open introduction without `job` (spec §13). */
export function CareersForm({ job }: { job?: { slug: string } }) {
  const t = useTranslations('forms')
  const errorText = useErrorText()
  const lead = useLeadSubmit('careers')
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { job: job?.slug ?? '', name: '', email: '', phone: '', links: '', message: '' },
    mode: 'onTouched',
  })
  const { register } = form
  const { errors, isSubmitting } = form.formState

  if (lead.sent) {
    return <SuccessPanel title={t('careers.successTitle')} text={t('careers.successText')} />
  }
  return (
    <LeadForm
      form={form}
      onValid={async ({ cv, ...values }) => {
        const result = await lead.submit(values, cv)
        // The browser judged the file by its name; the server read it and found no PDF.
        if (result?.ok === false && result.field === 'cv') {
          form.setError('cv', { type: 'server', message: 'pdf' }, { shouldFocus: true })
        }
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
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
          label={<OptionalLabel>{t('careers.links')}</OptionalLabel>}
          error={errorText(errors.links)}
        >
          <Input autoComplete="url" {...register('links')} />
        </FormField>
      </div>
      <FormField
        label={
          <OptionalLabel>{t(job ? 'careers.message' : 'careers.messageIntroduce')}</OptionalLabel>
        }
        error={errorText(errors.message)}
      >
        <Textarea {...register('message')} />
      </FormField>
      <FormField
        label={t('careers.cv')}
        description={t('careers.cvHint')}
        error={errorText(errors.cv)}
        required
      >
        <Input
          type="file"
          accept="application/pdf,.pdf"
          className="py-1.5 file:me-3 file:cursor-pointer file:rounded-sm file:border-0 file:bg-bg-subtle file:px-3 file:py-1 file:text-sm file:font-medium file:text-fg"
          {...register('cv')}
        />
      </FormField>
      {lead.spamChecks}
      <FormActions problem={lead.problem} pending={isSubmitting} label={t('careers.submit')} />
    </LeadForm>
  )
}

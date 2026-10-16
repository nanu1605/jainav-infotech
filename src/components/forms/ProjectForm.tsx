'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'
import type { z } from 'zod/mini'

import { PROJECT_BUDGETS, PROJECT_TIMELINES, projectSchema } from '@/lib/forms/schemas'

import { Checkbox } from './Checkbox'
import { FormField } from './FormField'
import { Input } from './Input'
import {
  ConsentNotice,
  OptionalLabel,
  ProblemMessage,
  SuccessPanel,
  useErrorText,
  type FormProblem,
} from './LeadForm'
import { MultiStepForm, type FormStep } from './MultiStepForm'
import { RadioGroup, type RadioOption } from './RadioGroup'
import { Textarea } from './Textarea'
import { useLeadSubmit } from './useLeadSubmit'

type ProjectInput = z.input<typeof projectSchema>

export type ProjectFormProps = {
  services: { slug: string; title: string; summary?: string | null }[]
  service?: string
}

/**
 * Start a project (spec §13): service → project → budget → timeline → contact. `?service=`
 * preselects the service (read on the client, like ContactForm's parameters).
 */
export function ProjectForm(props: ProjectFormProps) {
  return (
    <Suspense fallback={<ProjectWizard {...props} />}>
      <FromUrl {...props} />
    </Suspense>
  )
}

function FromUrl(props: ProjectFormProps) {
  const service = useSearchParams().get('service')
  return (
    <ProjectWizard
      {...props}
      service={props.services.some((s) => s.slug === service) ? service! : props.service}
    />
  )
}

function ProjectWizard({ services, service = '' }: ProjectFormProps) {
  const t = useTranslations('forms.project')
  const lead = useLeadSubmit('project')
  if (lead.sent) return <SuccessPanel title={t('successTitle')} text={t('successText')} />

  const steps: FormStep<ProjectInput>[] = [
    {
      id: 'service',
      title: t('steps.service'),
      fields: ['service'],
      content: (
        <Choice
          name="service"
          label={t('serviceQuestion')}
          options={[
            ...services.map((s) => ({ value: s.slug, label: s.title, description: s.summary })),
            { value: 'unsure', label: t('unsure'), description: t('unsureText') },
          ]}
          className="sm:grid-cols-2"
        />
      ),
    },
    {
      id: 'project',
      title: t('steps.project'),
      fields: ['description'],
      content: <Description />,
    },
    {
      id: 'budget',
      title: t('steps.budget'),
      fields: ['budget'],
      content: (
        <Choice
          name="budget"
          label={t('budgetQuestion')}
          options={PROJECT_BUDGETS.map((value) => ({ value, label: t(`budgets.${value}`) }))}
          className="sm:grid-cols-2"
        />
      ),
    },
    {
      id: 'timeline',
      title: t('steps.timeline'),
      fields: ['timeline'],
      content: (
        <Choice
          name="timeline"
          label={t('timelineQuestion')}
          options={PROJECT_TIMELINES.map((value) => ({ value, label: t(`timelines.${value}`) }))}
        />
      ),
    },
    {
      id: 'contact',
      title: t('steps.contact'),
      fields: ['name', 'email', 'phone', 'company', 'marketing'],
      content: <Contact problem={lead.problem} spamChecks={lead.spamChecks} />,
    },
  ]

  return (
    <MultiStepForm
      schema={projectSchema}
      defaultValues={{
        service,
        description: '',
        name: '',
        email: '',
        phone: '',
        company: '',
        marketing: false,
      }}
      steps={steps}
      onSubmit={(values) => lead.submit(values)}
      submitLabel={t('submit')}
    />
  )
}

function Choice({
  name,
  label,
  options,
  className,
}: {
  name: 'service' | 'budget' | 'timeline'
  label: string
  options: RadioOption[]
  className?: string
}) {
  const errorText = useErrorText()
  const { register, formState } = useFormContext<ProjectInput>()
  return (
    <FormField label={label} error={errorText(formState.errors[name])} required group>
      <RadioGroup options={options} className={className} {...register(name)} />
    </FormField>
  )
}

function Description() {
  const t = useTranslations('forms.project')
  const errorText = useErrorText()
  const { register, formState } = useFormContext<ProjectInput>()
  return (
    <FormField
      label={t('description')}
      description={t('descriptionHint')}
      error={errorText(formState.errors.description)}
      required
    >
      <Textarea {...register('description')} />
    </FormField>
  )
}

function Contact({ problem, spamChecks }: { problem: FormProblem | null; spamChecks: ReactNode }) {
  const t = useTranslations('forms')
  const errorText = useErrorText()
  const { register, formState } = useFormContext<ProjectInput>()
  const { errors } = formState
  return (
    <div className="relative grid gap-5">
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
          label={<OptionalLabel>{t('fields.company')}</OptionalLabel>}
          error={errorText(errors.company)}
        >
          <Input autoComplete="organization" {...register('company')} />
        </FormField>
      </div>
      <Checkbox label={t('consent.marketing')} {...register('marketing')} />
      {spamChecks}
      <ConsentNotice />
      <ProblemMessage problem={problem} />
    </div>
  )
}

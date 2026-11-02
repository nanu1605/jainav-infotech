'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { z } from 'zod/mini'

import { Checkbox } from '@/components/forms/Checkbox'
import { FormField } from '@/components/forms/FormField'
import { Input } from '@/components/forms/Input'
import { LeadForm, SubmitButton } from '@/components/forms/LeadForm'
import { RadioGroup } from '@/components/forms/RadioGroup'
import { Select } from '@/components/forms/Select'
import { Callout } from '@/components/ui/Callout'
import { Link, useRouter } from '@/i18n/navigation'
import { profileSchema } from '@/lib/commerce/schemas'
import { gstinState } from '@/lib/tax/gstin'
import { GST_STATES, STATE_OPTIONS } from '@/lib/tax/states'

import { accountPost, useErrorText, useProblemText, type AccountReply } from './client'

export type ProfileValues = z.input<typeof profileSchema>
type Output = z.output<typeof profileSchema>

/**
 * Profile and billing details (spec §11.2). A valid GSTIN sets the state and locks it (spec §11.4);
 * the server derives it again. Name and business name are printed on invoices in a Latin font.
 */
export function SettingsForm({
  defaults,
  gstCharged,
}: {
  defaults: ProfileValues
  /** Whether the store charges GST: while it doesn't, a GSTIN gives no input tax credit. */
  gstCharged: boolean
}) {
  const t = useTranslations('account.settings')
  const router = useRouter()
  const errorText = useErrorText()
  const problemText = useProblemText()
  const [saved, setSaved] = useState(false)
  const [problem, setProblem] = useState<AccountReply | null>(null)
  const form = useForm<ProfileValues, unknown, Output>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaults,
    mode: 'onTouched',
  })
  const { register, setValue } = form
  const { errors, isSubmitting, isDirty } = form.formState
  const locked = gstinState(useWatch({ control: form.control, name: 'gstin' }) ?? '')
  // "Other Territory" is only for GSTINs, so it is listed only when one names it.
  const states =
    locked === '97' || defaults.state === '97'
      ? [...STATE_OPTIONS, { code: '97', name: GST_STATES['97'] }]
      : STATE_OPTIONS

  const save = async (values: Output) => {
    setSaved(false)
    setProblem(null)
    const data = { ...values, state: gstinState(values.gstin) ?? values.state }
    const reply = await accountPost('profile', data)
    if (reply.ok) {
      form.reset(data)
      setSaved(true)
      router.refresh()
      return
    }
    const field = reply.field as keyof ProfileValues | undefined
    if (reply.error === 'invalid' && field && field in data) {
      return form.setError(
        field,
        { message: field === 'gstin' ? 'gstin' : 'invalid' },
        { shouldFocus: true },
      )
    }
    setProblem(reply)
  }

  return (
    <LeadForm form={form} onValid={save}>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label={t('name')} description={t('latinHint')} error={errorText(errors.name)}>
          <Input autoComplete="name" defaultValue={defaults.name} {...register('name')} />
        </FormField>
        <FormField label={t('phone')} error={errorText(errors.phone)}>
          <Input
            type="tel"
            autoComplete="tel"
            defaultValue={defaults.phone}
            {...register('phone')}
          />
        </FormField>
      </div>
      <FormField
        label={t('language')}
        description={t('languageHint')}
        error={errorText(errors.preferredLocale)}
        group
      >
        <RadioGroup
          className="sm:grid-cols-2"
          defaultValue={defaults.preferredLocale}
          options={[
            { value: 'en', label: <span lang="en">{t('locales.en')}</span> },
            { value: 'hi', label: <span lang="hi">{t('locales.hi')}</span> },
          ]}
          {...register('preferredLocale')}
        />
      </FormField>

      <fieldset aria-describedby="billing-hint" className="border-t border-border pt-6">
        <legend className="float-left w-full font-display text-lg font-semibold text-fg">
          {t('billing')}
        </legend>
        <p id="billing-hint" className="clear-left pt-1 text-sm text-fg-muted">
          {t('billingHint')}
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <FormField
            label={t('businessName')}
            description={t('latinHint')}
            error={errorText(errors.businessName)}
          >
            <Input
              autoComplete="organization"
              defaultValue={defaults.businessName}
              {...register('businessName')}
            />
          </FormField>
          <FormField
            label={t('gstin')}
            description={gstCharged ? t('gstinHint') : t('gstinHintOff')}
            error={errorText(errors.gstin)}
          >
            <Input
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              className="uppercase"
              defaultValue={defaults.gstin}
              {...register('gstin', {
                onChange: (e: { target: { value: string } }) => {
                  const state = gstinState(e.target.value)
                  if (state) setValue('state', state, { shouldDirty: true, shouldValidate: true })
                },
              })}
            />
          </FormField>
          <FormField
            label={t('state')}
            description={locked ? t('stateLocked') : t('stateHint')}
            error={errorText(errors.state)}
          >
            <Select defaultValue={defaults.state} disabled={!!locked} {...register('state')}>
              <option value="">{t('chooseState')}</option>
              {states.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </fieldset>

      <div className="border-t border-border pt-6">
        <Checkbox
          label={t('marketing')}
          defaultChecked={defaults.marketing}
          {...register('marketing')}
        />
      </div>

      {problem && (
        <Callout role="alert" tone="danger">
          {problemText(problem)}{' '}
          {problem.error === 'signedOut' && (
            <Link
              href={{ pathname: '/account/sign-in', query: { next: '/account/settings' } }}
              className="font-medium text-fg underline underline-offset-4"
            >
              {t('signInAgain')}
            </Link>
          )}
        </Callout>
      )}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <SubmitButton pending={isSubmitting}>{t('save')}</SubmitButton>
        <p role="status" className="text-sm font-medium text-fg">
          {saved && !isDirty ? t('saved') : null}
        </p>
      </div>
    </LeadForm>
  )
}

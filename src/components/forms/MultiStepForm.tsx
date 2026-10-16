'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
import * as m from 'motion/react-m'
import { useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  FormProvider,
  get,
  useForm,
  type DefaultValues,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import type { $ZodType } from 'zod/v4/core'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useHydrated } from '@/lib/useHydrated'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { DURATION, EASE_OUT } from '@/lib/motion'

export type FormStep<T extends FieldValues> = {
  id: string
  title: string
  /** Validated when leaving the step with Next. */
  fields: FieldPath<T>[]
  /** The step's fields; they read the form with useFormContext(). */
  content: ReactNode
}

export type MultiStepFormProps<TIn extends FieldValues, TOut> = {
  /** Classic Zod or zod/mini. */
  schema: $ZodType<TOut, TIn>
  defaultValues: DefaultValues<TIn>
  steps: FormStep<TIn>[]
  onSubmit: (values: TOut) => void | Promise<void>
  submitLabel?: string
  className?: string
}

/**
 * Wizard over one react-hook-form + zod form: values persist across steps, Next validates only
 * the current step's fields and focuses the first invalid one, and each step change moves focus
 * to the new step so screen readers announce "Step 2 of 5, Project".
 */
export function MultiStepForm<TIn extends FieldValues, TOut>({
  schema,
  defaultValues,
  steps,
  onSubmit,
  submitLabel,
  className,
}: MultiStepFormProps<TIn, TOut>) {
  const t = useTranslations('ui.multiStep')
  const form = useForm<TIn, unknown, TOut>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  })
  const [index, setIndex] = useState(0)
  // 0 until the visitor moves, so the first step neither animates nor steals focus.
  const [direction, setDirection] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const step = steps[index]
  const last = index === steps.length - 1
  const { isSubmitting } = form.formState
  // Disabled until hydrated: earlier input would be reset, and a native submit puts the fields
  // in the URL.
  const hydrated = useHydrated()

  useEffect(() => {
    if (direction) panelRef.current?.focus()
  }, [index, direction])

  const go = (to: number) => {
    setDirection(to > index ? 1 : -1)
    setIndex(to)
  }

  const submit = form.handleSubmit(onSubmit, (errors) => {
    // A schema-level rule can fail on an earlier step: send the visitor back to it.
    const errorStep = steps.findIndex((s) => s.fields.some((field) => get(errors, field)))
    if (errorStep !== -1 && errorStep !== index) go(errorStep)
  })

  // Motion loads only with this form (step transitions), not on every page (spec §15).
  return (
    <MotionProvider>
      <FormProvider {...form}>
        <form
          noValidate
          className={cn('grid gap-6', className)}
          onSubmit={
            last
              ? (e) => {
                  // The button stays enabled (aria-disabled) so it keeps focus: block double submits.
                  if (isSubmitting) e.preventDefault()
                  else void submit(e)
                }
              : async (e) => {
                  e.preventDefault()
                  // Touching the fields makes onTouched re-validate as the visitor types, so the
                  // error clears before they click Next again (no layout jump under the pointer).
                  const valid = await form.trigger(step.fields, {
                    shouldFocus: true,
                    shouldTouch: true,
                  })
                  if (valid) go(index + 1)
                }
          }
        >
          <fieldset disabled={!hydrated} className="contents">
            <ol className="flex gap-2">
              {steps.map((s, i) => (
                <li
                  key={s.id}
                  aria-current={i === index ? 'step' : undefined}
                  className="grid min-w-0 flex-1 content-start gap-2"
                >
                  <span aria-hidden className="h-1 overflow-hidden rounded-full bg-border">
                    <span
                      className={cn(
                        'block h-full origin-left bg-primary transition-transform duration-[var(--duration-slow)] ease-out',
                        i <= index ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      'text-sm max-sm:sr-only',
                      i === index ? 'font-medium text-fg' : 'text-fg-muted',
                    )}
                  >
                    {s.title}
                    {i < index && <span className="sr-only"> ({t('completed')})</span>}
                  </span>
                </li>
              ))}
            </ol>

            <div
              ref={panelRef}
              role="group"
              tabIndex={-1}
              aria-labelledby={`${id}-count ${id}-title`}
              className="grid gap-5 outline-none"
            >
              <div>
                <p id={`${id}-count`} className="text-sm text-fg-muted">
                  {t('progress', { current: index + 1, total: steps.length })}
                </p>
                <p id={`${id}-title`} className="mt-1 font-display text-xl font-semibold text-fg">
                  {step.title}
                </p>
              </div>
              <m.div
                key={step.id}
                initial={direction ? { opacity: 0, x: direction * 16 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: DURATION.base, ease: EASE_OUT }}
                className="grid gap-5"
              >
                {step.content}
              </m.div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {index > 0 && (
                <Button variant="ghost" onClick={() => go(index - 1)}>
                  <ArrowLeft aria-hidden />
                  {t('back')}
                </Button>
              )}
              <span role="status" className="sr-only">
                {isSubmitting ? t('sending') : null}
              </span>
              <Button type="submit" aria-disabled={isSubmitting || undefined} className="ms-auto">
                {last ? (
                  <>
                    {isSubmitting && <LoaderCircle aria-hidden className="animate-spin" />}
                    {submitLabel ?? t('submit')}
                  </>
                ) : (
                  <>
                    {t('next')}
                    <ArrowRight aria-hidden />
                  </>
                )}
              </Button>
            </div>
          </fieldset>
        </form>
      </FormProvider>
    </MotionProvider>
  )
}

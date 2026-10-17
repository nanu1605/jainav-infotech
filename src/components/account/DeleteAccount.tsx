'use client'

import { LoaderCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/feedback/Dialog'
import { toast } from '@/components/feedback/Toast'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { useRouter } from '@/i18n/navigation'

import { accountPost, useProblemText } from './client'

const DANGER = 'bg-danger text-danger-fg hover:bg-danger/90'

/** Delete account (spec §11.2): anonymizes the profile and ends every session; orders stay. */
export function DeleteAccount() {
  const t = useTranslations('account.delete')
  const problemText = useProblemText()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const confirm = async () => {
    if (pending) return
    setPending(true)
    setProblem(null)
    const reply = await accountPost('delete')
    if (reply.ok) {
      toast({ title: t('done'), tone: 'success' })
      router.replace('/')
      router.refresh()
      return
    }
    setPending(false)
    setProblem(problemText(reply))
  }

  return (
    <section aria-labelledby="delete-account" className="rounded-lg border border-danger/40 p-6">
      <h2 id="delete-account" className="font-display text-xl font-semibold text-fg">
        {t('title')}
      </h2>
      <p className="mt-2 max-w-2xl text-fg-muted">{t('text')}</p>
      <Dialog onOpenChange={() => setProblem(null)}>
        <DialogTrigger asChild>
          <Button className={`mt-6 ${DANGER}`}>{t('button')}</Button>
        </DialogTrigger>
        <DialogContent title={t('confirmTitle')} description={t('confirmText')}>
          <span role="status" className="sr-only">
            {pending ? t('pending') : null}
          </span>
          {problem && (
            <Callout role="alert" tone="danger" className="mb-4">
              {problem}
            </Callout>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <Button variant="secondary">{t('cancel')}</Button>
            </DialogClose>
            <Button className={DANGER} aria-disabled={pending || undefined} onClick={confirm}>
              {pending && (
                <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
              )}
              {pending ? t('pending') : t('confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

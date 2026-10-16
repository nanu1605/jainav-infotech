'use client'

import { LoaderCircle, LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { toast } from '@/components/feedback/Toast'
import { Button } from '@/components/ui/Button'
import { useRouter } from '@/i18n/navigation'

import { accountPost } from './client'

export function SignOutButton() {
  const t = useTranslations('account.signOut')
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const signOut = async () => {
    if (pending) return
    setPending(true)
    const reply = await accountPost('sign-out')
    if (reply.ok) {
      router.replace('/')
      router.refresh()
      return
    }
    setPending(false)
    toast({ title: t('failed'), tone: 'danger' })
  }

  return (
    <Button variant="secondary" size="sm" aria-disabled={pending || undefined} onClick={signOut}>
      {pending ? (
        <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />
      ) : (
        <LogOut aria-hidden />
      )}
      {pending ? t('pending') : t('label')}
    </Button>
  )
}

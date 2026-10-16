import { Eye } from 'lucide-react'
import { useTranslations } from 'next-intl'

/** Tells an admin they are seeing drafts, with a way out (POST, so it can't be triggered by a link). */
export function PreviewBar() {
  const t = useTranslations('ui.preview')
  return (
    <div
      role="region"
      aria-label={t('label')}
      className="flex min-h-10 flex-wrap items-center justify-center gap-x-3 bg-warning px-4 py-1.5 text-sm text-warning-fg [--ring:var(--warning-fg)]"
    >
      <p className="inline-flex items-center gap-2 font-medium">
        <Eye aria-hidden className="size-4" />
        {t('label')}
      </p>
      <form action="/api/v1/preview/exit" method="post">
        <button
          type="submit"
          className="rounded-sm font-semibold underline underline-offset-4 hover:no-underline"
        >
          {t('exit')}
        </button>
      </form>
    </div>
  )
}

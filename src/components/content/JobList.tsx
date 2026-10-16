'use client'

import { ArrowRight } from 'lucide-react'
import { useState } from 'react'

import { Tag } from '@/components/ui/Tag'
import { Link } from '@/i18n/navigation'

export type JobItem = {
  slug: string
  title: string
  type: string
  workMode: string
  meta: string
}

type Filter = { key: 'type' | 'workMode'; value: string; label: string }

/** Openings with type / work-mode filter chips (spec §8.10). Chips are toggle buttons. */
export function JobList({
  jobs,
  filters,
  allLabel,
  label,
}: {
  jobs: JobItem[]
  filters: Filter[]
  allLabel: string
  label: string
}) {
  const [active, setActive] = useState<Filter | null>(null)
  const shown = active ? jobs.filter((j) => j[active.key] === active.value) : jobs
  // Only offer filters that would narrow the list.
  const useful = filters.filter((f) => {
    const n = jobs.filter((j) => j[f.key] === f.value).length
    return n > 0 && n < jobs.length
  })

  return (
    <div>
      {useful.length > 0 && (
        <div role="group" aria-label={label} className="mb-8 flex flex-wrap gap-2">
          <Tag asChild>
            <button type="button" aria-pressed={!active} onClick={() => setActive(null)}>
              {allLabel}
            </button>
          </Tag>
          {useful.map((f) => (
            <Tag asChild key={`${f.key}-${f.value}`}>
              <button
                type="button"
                aria-pressed={active?.key === f.key && active.value === f.value}
                onClick={() => setActive(f)}
              >
                {f.label}
              </button>
            </Tag>
          ))}
        </div>
      )}
      <ul className="divide-y divide-border border-y border-border">
        {shown.map((job) => (
          <li key={job.slug}>
            <Link
              href={`/careers/${job.slug}`}
              className="group flex items-center justify-between gap-6 py-5"
            >
              <span className="min-w-0">
                <span className="block font-display text-lg font-semibold text-fg group-hover:underline group-hover:underline-offset-4">
                  {job.title}
                </span>
                <span className="mt-1 block text-sm text-fg-muted">{job.meta}</span>
              </span>
              <ArrowRight aria-hidden className="size-5 shrink-0 text-fg-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

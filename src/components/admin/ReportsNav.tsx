import { Link, NavGroup } from '@payloadcms/ui'
import type { ServerProps } from 'payload'

import { hasRole } from '@/access/roles'

const LINKS = [
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/collections/daily-stats', label: 'Daily stats' },
]

/** Sidebar group for the monthly reports and insights (spec §10), for Owner and Support. */
export function ReportsNav({ user }: ServerProps) {
  if (!hasRole(user ?? null, 'owner', 'support')) return null
  return (
    <NavGroup label="Reports">
      {LINKS.map(({ href, label }) => (
        <Link key={href} className="nav__link" href={href} prefetch={false}>
          <span className="nav__link-label">{label}</span>
        </Link>
      ))}
    </NavGroup>
  )
}

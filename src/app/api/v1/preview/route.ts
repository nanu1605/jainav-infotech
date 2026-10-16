import { draftMode } from 'next/headers'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { isStaff } from '@/access/roles'
import { getClient } from '@/lib/cms'

// A site path only: no scheme, no protocol-relative "//host", no backslash tricks.
const pathParam = z
  .string()
  .regex(/^\/(?![/\\])[^\s\\]*$/)
  .max(512)

/**
 * Live preview entry (spec §20 Phase 3): the admin's preview iframe opens
 * /api/v1/preview?path=/hi/products/vyro. A signed-in admin gets Next.js draft mode (pages then
 * read drafts with that admin's access) and is sent to the page; anyone else gets 401.
 */
export async function GET(req: NextRequest) {
  const path = pathParam.safeParse(req.nextUrl.searchParams.get('path'))
  if (!path.success) return new Response('Bad request', { status: 400 })

  const payload = await getClient()
  const { user } = await payload.auth({ headers: req.headers })
  if (user?.collection !== 'users' || !isStaff(user)) {
    return new Response('Sign in to the admin to preview drafts.', { status: 401 })
  }
  ;(await draftMode()).enable()
  return new Response(null, {
    status: 307,
    headers: { Location: path.data, 'Cache-Control': 'no-store' },
  })
}

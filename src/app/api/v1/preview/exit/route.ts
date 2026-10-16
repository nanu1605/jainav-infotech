import { draftMode } from 'next/headers'
import type { NextRequest } from 'next/server'

/** Leaves draft mode (POST from the preview bar) and returns to the page the admin was on. */
export async function POST(req: NextRequest) {
  ;(await draftMode()).disable()
  const referer = req.headers.get('referer')
  const back =
    referer && new URL(referer).origin === req.nextUrl.origin ? new URL(referer).pathname : '/'
  return new Response(null, {
    status: 303,
    headers: { Location: back, 'Cache-Control': 'no-store' },
  })
}

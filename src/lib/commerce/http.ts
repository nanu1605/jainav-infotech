import 'server-only'

import { NextResponse } from 'next/server'

import { customerForToken, SESSION_COOKIE } from '@/lib/account/session'
import { SITE_URL } from '@/lib/seo'

import type { StoreError } from './schemas'

/** A JSON answer that no cache keeps (store and account endpoints are per customer). */
export const json = (
  status: number,
  body: ({ ok: true } | { error: StoreError }) & Record<string, unknown>,
  headers: Record<string, string> = {},
) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } })

/** 429 with Retry-After (seconds), for rate limits and the sign-in code cooldown. */
export const tooMany = (retryAfter: number, error: StoreError = 'rateLimited') =>
  json(429, { error, retryAfter }, { 'Retry-After': String(retryAfter) })

/**
 * The body as JSON, or undefined when it isn't JSON or is larger than `max` bytes. Read in chunks
 * and abandoned past the limit, so a body without Content-Length is never buffered whole.
 */
export async function readJson(req: Request, max = 16 * 1024): Promise<unknown> {
  if (Number(req.headers.get('content-length')) > max) return undefined
  const reader = req.body?.getReader()
  if (!reader) return undefined
  try {
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > max) {
        await reader.cancel().catch(() => undefined)
        return undefined
      }
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return undefined
  }
}

/**
 * Cross-site requests can't use the session (SameSite=Lax), and a JSON body needs a CORS
 * preflight we never grant; this also refuses a browser POST that names another origin.
 */
export const sameOrigin = (req: Request) => {
  const origin = req.headers.get('origin')
  return !origin || origin === new URL(SITE_URL).origin
}

/** The session cookie's value from a request. */
export function sessionToken(req: Request): string | undefined {
  const match = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
  return match?.[1]
}

export const requestCustomer = (req: Request) => customerForToken(sessionToken(req))

/** What may be logged about a failure: a database error's message lists every bound value. */
export const errorCode = (error: unknown) => {
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code
  return typeof code === 'string' ? code : error instanceof Error ? error.name : 'unknown'
}

import 'server-only'

import { addDataAndFileToRequest, APIError, type PayloadRequest } from 'payload'
import type { z } from 'zod'

import { hasRole, type Role } from '@/access/roles'

/**
 * Admin actions are collection endpoints (spec §9.3), and Payload checks no access on custom
 * endpoints: each one names its roles here.
 */
export function requireRole(req: PayloadRequest, message: string, ...roles: Role[]) {
  if (!hasRole(req.user, ...roles)) throw new APIError(message, 403)
}

/** The `:id` of `/api/<collection>/:id/<action>`. */
export function routeId(req: PayloadRequest): number {
  const id = String(req.routeParams?.id ?? '')
  if (!/^\d{1,10}$/.test(id)) throw new APIError('Not found.', 404)
  return Number(id)
}

/** The JSON body, validated (Payload doesn't parse custom endpoints' bodies). */
export async function readBody<T>(req: PayloadRequest, schema: z.ZodType<T>): Promise<T> {
  await addDataAndFileToRequest(req)
  const parsed = schema.safeParse(req.data ?? {})
  if (!parsed.success)
    throw new APIError(parsed.error.issues[0]?.message ?? 'Invalid request.', 400)
  return parsed.data
}

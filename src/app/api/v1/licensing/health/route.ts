import { health } from '@/lib/licensing/api'

export const dynamic = 'force-dynamic'

/** GET /api/v1/licensing/health: 200 when the API and its database answer. */
export const GET = health

import { deactivateLicense } from '@/lib/licensing/api'

/** POST /api/v1/licensing/deactivate (docs/licensing-api.md). */
export const POST = deactivateLicense

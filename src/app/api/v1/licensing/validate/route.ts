import { validateLicense } from '@/lib/licensing/api'

/** POST /api/v1/licensing/validate (docs/licensing-api.md). */
export const POST = validateLicense

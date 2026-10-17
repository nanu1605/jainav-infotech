import { publicKeys } from '@/lib/licensing/api'

export const dynamic = 'force-dynamic'

/** GET /api/v1/licensing/keys: the public keys as a JWKS. */
export const GET = publicKeys

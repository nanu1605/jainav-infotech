import { requestCode } from '@/lib/account/api'

/** POST /api/v1/account/otp/request: email a sign-in code (spec §11.2). */
export const POST = requestCode

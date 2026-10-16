import { verifyCode } from '@/lib/account/api'

/** POST /api/v1/account/otp/verify: check the code, start a session (spec §11.2). */
export const POST = verifyCode

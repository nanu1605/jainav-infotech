import { deleteAccount } from '@/lib/account/api'

/** POST /api/v1/account/delete: anonymize the account (orders and invoices are kept). */
export const POST = deleteAccount

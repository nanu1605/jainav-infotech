import { invoicePdf } from '@/lib/account/api'

/** GET /api/v1/account/invoices/{id}: the signed-in customer's own invoice PDF. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return invoicePdf(req, (await params).id)
}

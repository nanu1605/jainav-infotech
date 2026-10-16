import { handleForm } from '@/lib/forms/handle'
import { isFormName } from '@/lib/forms/schemas'

/** POST /api/v1/forms/{form}: every public form (spec §13). Leads are created only here. */
export async function POST(req: Request, { params }: { params: Promise<{ form: string }> }) {
  const { form } = await params
  if (!isFormName(form)) return new Response('Not found', { status: 404 })
  return handleForm(form, req)
}

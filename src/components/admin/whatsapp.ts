/** wa.me link for a lead's phone; a 10-digit Indian number gets the 91 country code. */
export function whatsappHref(phone: unknown): string | null {
  if (typeof phone !== 'string') return null
  const digits = phone.replace(/\D/g, '').replace(/^0+/, '')
  if (digits.length < 10) return null
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`
}

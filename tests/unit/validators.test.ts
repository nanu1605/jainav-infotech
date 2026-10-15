import type { TextFieldSingleValidation } from 'payload'
import { describe, expect, it } from 'vitest'

import { whatsappNumber } from '@/fields/validators'

// Just enough of Payload's validate options for the chained built-in text validator.
const options = {
  req: { payload: { config: {} }, t: (key: string) => key },
  required: false,
} as unknown as Parameters<TextFieldSingleValidation>[1]

describe('whatsappNumber', () => {
  it.each(['919244117127', '14155550123'])('accepts %s', (value) => {
    expect(whatsappNumber(value, options)).toBe(true)
  })

  it.each(['9244117127x', '+919244117127', '91 92441 17127', '0919244117127', '12345'])(
    'rejects %s',
    (value) => {
      expect(whatsappNumber(value, options)).not.toBe(true)
    },
  )
})

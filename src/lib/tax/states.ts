/**
 * GST state and union territory codes (the first two digits of a GSTIN). Names stay in English:
 * they are printed on invoices, which use a Latin font (spec §11.3, §11.4).
 */
export const GST_STATES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
} as const

export type StateCode = keyof typeof GST_STATES

export const isStateCode = (code: string): code is StateCode => Object.hasOwn(GST_STATES, code)

/** The billing-state choices, sorted by name ("Other Territory" is for GSTINs only). */
export const STATE_OPTIONS = (Object.entries(GST_STATES) as [StateCode, string][])
  .filter(([code]) => code !== '97')
  .sort(([, a], [, b]) => a.localeCompare(b, 'en'))
  .map(([code, name]) => ({ code, name }))

import type { Block } from 'payload'

export const CompanyFacts: Block = {
  slug: 'companyFacts',
  interfaceName: 'PageCompanyFactsBlock',
  labels: { singular: 'Company facts', plural: 'Company facts' },
  fields: [
    {
      name: 'heading',
      type: 'text',
      localized: true,
      admin: {
        description: 'Legal name, CIN, incorporation date and office come from Site settings.',
      },
    },
  ],
}

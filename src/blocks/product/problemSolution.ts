import type { Block } from 'payload'

export const ProblemSolution: Block = {
  slug: 'problemSolution',
  interfaceName: 'ProductProblemSolutionBlock',
  labels: { singular: 'Problem & solution', plural: 'Problem & solution' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      type: 'row',
      fields: [
        { name: 'problem', type: 'textarea', localized: true, admin: { width: '50%' } },
        { name: 'solution', type: 'textarea', localized: true, admin: { width: '50%' } },
      ],
    },
    {
      name: 'points',
      type: 'array',
      fields: [{ name: 'text', type: 'text', localized: true, required: true }],
    },
  ],
}

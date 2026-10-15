import type { Block } from 'payload'

export const Video: Block = {
  slug: 'video',
  interfaceName: 'ProductVideoBlock',
  labels: { singular: 'Video', plural: 'Videos' },
  fields: [
    { name: 'heading', type: 'text', localized: true },
    {
      name: 'video',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: { mimeType: { contains: 'video/' } },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      filterOptions: { mimeType: { contains: 'image/' } },
    },
    {
      name: 'captions',
      type: 'upload',
      relationTo: 'media',
      filterOptions: { mimeType: { equals: 'text/vtt' } },
      admin: { description: 'WebVTT (.vtt) subtitles.' },
    },
  ],
}

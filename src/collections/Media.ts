import type { CollectionConfig } from 'payload'

import { anyone, contentEditors } from '@/access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'mimeType', 'filesize', 'updatedAt'],
    listSearchableFields: ['filename', 'alt'],
  },
  access: {
    read: anyone,
    create: contentEditors,
    update: contentEditors,
    delete: contentEditors,
  },
  fields: [
    { name: 'alt', type: 'text', localized: true, required: true },
    { name: 'caption', type: 'text', localized: true },
  ],
  upload: {
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    // text/plain: Payload can't sniff .vtt and falls back to text/plain for the content check;
    // the stored type is still the browser's text/vtt.
    mimeTypes: ['image/*', 'video/mp4', 'video/webm', 'text/vtt', 'text/plain'],
    // Width-only sizes keep the aspect ratio; square and og crop around the focal point.
    imageSizes: [
      { name: 'thumbnail', width: 300 },
      { name: 'square', width: 500, height: 500 },
      { name: 'small', width: 600 },
      { name: 'medium', width: 900 },
      { name: 'large', width: 1400 },
      { name: 'xlarge', width: 1920 },
      { name: 'og', width: 1200, height: 630 },
    ],
  },
}

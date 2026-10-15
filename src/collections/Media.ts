import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
} from 'payload'

import { anyone, contentEditors } from '@/access/roles'
import { revalidateCollection } from '@/hooks/revalidate'

// Listing mimeTypes disables Payload's built-in block-list, and unsniffable files fall back to
// text/plain (needed for .vtt captions), so the extension is checked explicitly. No SVG: it can
// carry scripts, and media is served from the site origin in development.
const ALLOWED_EXT = /\.(avif|gif|jpe?g|png|webp|mp4|webm|vtt)$/i

const UNSUPPORTED = 'Upload an image, an MP4/WebM video or a .vtt caption file.'

// Runs before Payload writes anything: on update it stores the new file before beforeChange.
const checkFileName: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  const writes = operation === 'create' || operation === 'update'
  if (writes && req.file && !ALLOWED_EXT.test(req.file.name)) throw new APIError(UNSUPPORTED, 400)
  return args
}

// After type detection: catches renamed SVGs and files fetched from a URL.
const checkDetectedType: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!req.file) return data
  if (!ALLOWED_EXT.test(req.file.name) || /svg|xml/i.test(String(data.mimeType))) {
    throw new APIError(UNSUPPORTED, 400)
  }
  if (/\.vtt$/i.test(req.file.name)) data.mimeType = 'text/vtt'
  return data
}

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
  hooks: {
    beforeOperation: [checkFileName],
    beforeChange: [checkDetectedType],
    // Pages that render media (alt text, replaced files) tag their fetches with 'media'.
    ...revalidateCollection({ tag: 'media' }),
  },
  fields: [
    { name: 'alt', type: 'text', localized: true, required: true },
    { name: 'caption', type: 'text', localized: true },
  ],
  upload: {
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    // text/plain: Payload can't sniff .vtt and falls back to text/plain for the content check.
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

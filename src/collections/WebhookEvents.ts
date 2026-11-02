import type { CollectionConfig } from 'payload'

import { nobody, ownerOnly } from '@/access/roles'

/**
 * Incoming payment webhooks (spec §11.3), stored once per `x-razorpay-event-id` so a redelivered
 * event is ignored. Payloads hold only the fields processing reads (src/lib/commerce/webhooks.ts),
 * no payer details; owner-only all the same.
 */
export const WebhookEvents: CollectionConfig = {
  slug: 'webhook-events',
  admin: {
    group: 'System',
    useAsTitle: 'eventId',
    defaultColumns: ['event', 'status', 'receivedAt', 'processedAt'],
  },
  defaultSort: '-receivedAt',
  access: { read: ownerOnly, create: nobody, update: nobody, delete: ownerOnly },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          type: 'select',
          options: ['razorpay'],
          defaultValue: 'razorpay',
          required: true,
        },
        { name: 'eventId', type: 'text', required: true, unique: true },
        { name: 'event', type: 'text', required: true, index: true },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          options: ['received', 'processed', 'ignored', 'failed'],
          defaultValue: 'received',
          required: true,
          index: true,
        },
        { name: 'receivedAt', type: 'date', required: true },
        { name: 'processedAt', type: 'date' },
      ],
    },
    { name: 'error', type: 'text' },
    { name: 'payload', type: 'json', required: true },
  ],
}

import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import type { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig, type RootLivePreviewConfig } from 'payload'
import sharp from 'sharp'

import { contentEditors, staff } from './access/roles'
import { AuditLog } from './collections/AuditLog'
import { Changelog } from './collections/Changelog'
import { DailyStats } from './collections/DailyStats'
import { DataRequests } from './collections/DataRequests'
import { Docs } from './collections/Docs'
import { Faqs } from './collections/Faqs'
import { Installers } from './collections/Installers'
import { Jobs } from './collections/Jobs'
import { Leads } from './collections/Leads'
import { LegalPages } from './collections/LegalPages'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Plans } from './collections/Plans'
import { Posts } from './collections/Posts'
import { PrivateFiles } from './collections/PrivateFiles'
import { Products } from './collections/Products'
import { Releases } from './collections/Releases'
import { Services } from './collections/Services'
import { ShortLinks } from './collections/ShortLinks'
import { Team } from './collections/Team'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { Navigation } from './globals/Navigation'
import { SiteSettings } from './globals/SiteSettings'
import { revalidateCollection } from './hooks/revalidate'
import { outboxAdapter } from './lib/outbox'
import { docPaths, publicPath, type RoutedCollection } from './lib/routes'
import { migrations } from './migrations'
import { auditPlugin } from './plugins/audit'
import { defaultLocaleRequiredPlugin } from './plugins/defaultLocaleRequired'
import { liveDocPlugin } from './plugins/liveDoc'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

const SEO_COLLECTIONS = [
  'pages',
  'products',
  'services',
  'posts',
] as const satisfies RoutedCollection[]

const generateTitle: GenerateTitle = ({ doc }) => {
  const name = doc?.title ?? doc?.name
  return name ? `${name} | Jainav Infotech` : 'Jainav Infotech'
}

/**
 * Live preview (spec §20 Phase 3) in the admin's current language: the iframe enters draft mode
 * through /api/v1/preview, which checks the admin session, then shows the page.
 */
const livePreviewURL: NonNullable<RootLivePreviewConfig['url']> = async ({
  collectionConfig,
  data,
  locale,
  req,
}) => {
  const slug = collectionConfig?.slug
  let pagePath: string | null = null
  if (slug === 'docs' && data.product && data.slug) {
    const productId = typeof data.product === 'object' ? data.product.id : data.product
    const [product, docs] = await Promise.all([
      req.payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        req,
        overrideAccess: true,
      }),
      req.payload.find({
        collection: 'docs',
        where: { product: { equals: productId } },
        draft: true,
        pagination: false,
        depth: 0,
        req,
        overrideAccess: true,
      }),
    ])
    const path = docPaths(docs.docs).get(data.id)
    pagePath = path ? `/products/${product.slug}/docs/${path.join('/')}` : null
  } else if (slug && slug in publicPath && data.slug) {
    pagePath = publicPath[slug as RoutedCollection](String(data.slug))
  }
  if (!pagePath) return null
  const localized =
    locale.code === 'en' ? pagePath : `/${locale.code}${pagePath === '/' ? '' : pagePath}`
  return `${SITE_URL}/api/v1/preview?path=${encodeURIComponent(localized)}`
}

const generateURL: GenerateURL = ({ doc, collectionConfig, locale }) => {
  const toPath = collectionConfig?.slug && publicPath[collectionConfig.slug as RoutedCollection]
  if (!toPath || !doc?.slug) return SITE_URL
  const pagePath = toPath(String(doc.slug))
  if (!locale || locale === 'en') return `${SITE_URL}${pagePath}`
  return `${SITE_URL}/${locale}${pagePath === '/' ? '' : pagePath}`
}

// Cloudflare R2 when configured; Payload's local disk otherwise (spec §2). `alwaysInsertFields`
// keeps the schema identical either way, so dev and prod migrations don't drift.
const storageEnabled = Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET)
const privateStorageEnabled = Boolean(process.env.S3_ENDPOINT && process.env.S3_PRIVATE_BUCKET)
const s3Config = {
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
}
const publicFileURL =
  (base: string | undefined) =>
  ({ filename, prefix }: { filename: string; prefix?: string }) =>
    `${base ?? ''}/${[prefix, encodeURIComponent(filename)].filter(Boolean).join('/')}`

const INSTALLER_MAX_BYTES = 512 * 1024 * 1024

export default buildConfig({
  serverURL: SITE_URL,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Jainav Admin',
      defaultOGImageType: 'off',
    },
    livePreview: {
      url: livePreviewURL,
      collections: ['pages', 'products', 'services', 'posts', 'jobs', 'legal-pages', 'docs'],
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 812 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
    components: {
      graphics: {
        Logo: '@/components/admin/AdminLogo#AdminLogo',
        Icon: '@/components/admin/AdminIcon#AdminIcon',
      },
    },
  },
  // Order sets the admin sidebar: Content · Products · (Store, Phase 7) · Leads · Settings · System.
  collections: [
    Pages,
    Posts,
    Services,
    Faqs,
    Testimonials,
    Team,
    Jobs,
    LegalPages,
    Media,
    Products,
    Plans,
    Releases,
    Installers,
    Docs,
    Changelog,
    Leads,
    DataRequests,
    PrivateFiles,
    ShortLinks,
    Users,
    AuditLog,
    DailyStats,
  ],
  globals: [SiteSettings, Navigation],
  // Spec §6: field-level localization, English default, fallback on.
  localization: {
    locales: [
      { code: 'en', label: 'English' },
      { code: 'hi', label: 'हिंदी', fallbackLocale: 'en' },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  editor: lexicalEditor(),
  // Resend when configured (spec §2); otherwise development writes emails to .outbox/.
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.EMAIL_FROM || '',
        defaultFromName: 'Jainav Infotech',
      })
    : outboxAdapter,
  graphQL: { disable: true },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    prodMigrations: migrations,
  }),
  // Installers are tens of MB: stream uploads to disk instead of buffering them in memory.
  upload: {
    limits: { fileSize: INSTALLER_MAX_BYTES },
    requestSizeLimit: INSTALLER_MAX_BYTES + 10 * 1024 * 1024,
    useTempFiles: true,
    tempFileDir: os.tmpdir(),
  },
  sharp,
  plugins: [
    // First: rewrites `required` on the localized fields defined above (spec §6).
    defaultLocaleRequiredPlugin,
    seoPlugin({
      collections: [...SEO_COLLECTIONS],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle,
      generateURL,
    }),
    redirectsPlugin({
      collections: ['pages', 'products', 'services', 'posts'],
      redirectTypes: ['301', '302', '307', '308'],
      redirectTypeFieldOverride: { defaultValue: '308' },
      overrides: {
        admin: { group: 'Settings' },
        access: {
          read: staff,
          create: contentEditors,
          update: contentEditors,
          delete: contentEditors,
        },
        hooks: { ...revalidateCollection({ tag: 'redirects' }) },
      },
    }),
    s3Storage({
      enabled: storageEnabled,
      alwaysInsertFields: true,
      bucket: process.env.S3_BUCKET ?? '',
      config: s3Config,
      collections: {
        media: {
          disablePayloadAccessControl: true,
          generateFileURL: publicFileURL(process.env.NEXT_PUBLIC_CDN_URL),
        },
        installers: {
          prefix: 'downloads',
          disablePayloadAccessControl: true,
          generateFileURL: publicFileURL(process.env.DOWNLOADS_BASE_URL),
        },
      },
    }),
    // Private bucket (CVs, Phase 7 invoices). Payload checks read access on
    // /api/private-files/file/:filename, then the plugin redirects to a 5-minute signed URL.
    s3Storage({
      enabled: privateStorageEnabled,
      alwaysInsertFields: true,
      bucket: process.env.S3_PRIVATE_BUCKET ?? '',
      config: s3Config,
      collections: { 'private-files': { signedDownloads: { expiresIn: 300 } } },
    }),
    // Last, so collections added by the plugins above are covered too.
    liveDocPlugin,
    auditPlugin,
  ],
})

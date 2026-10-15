import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_pages_blocks_product_showcase_mode" AS ENUM('featured', 'selected');
  CREATE TYPE "public"."enum_pages_blocks_proof_stats_source" AS ENUM('manual', 'downloads');
  CREATE TYPE "public"."enum_pages_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_product_showcase_mode" AS ENUM('featured', 'selected');
  CREATE TYPE "public"."enum__pages_v_blocks_proof_stats_source" AS ENUM('manual', 'downloads');
  CREATE TYPE "public"."enum__pages_v_version_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_posts_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_published_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_services_blocks_product_showcase_mode" AS ENUM('featured', 'selected');
  CREATE TYPE "public"."enum_services_blocks_proof_stats_source" AS ENUM('manual', 'downloads');
  CREATE TYPE "public"."enum_services_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum_services_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_blocks_product_showcase_mode" AS ENUM('featured', 'selected');
  CREATE TYPE "public"."enum__services_v_blocks_proof_stats_source" AS ENUM('manual', 'downloads');
  CREATE TYPE "public"."enum__services_v_version_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum__services_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__services_v_published_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_faqs_category" AS ENUM('general', 'pricing', 'licensing', 'devices', 'refunds', 'updates', 'services', 'careers', 'privacy');
  CREATE TYPE "public"."enum_testimonials_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__testimonials_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__testimonials_v_published_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_jobs_type" AS ENUM('full-time', 'part-time', 'internship', 'contract');
  CREATE TYPE "public"."enum_jobs_work_mode" AS ENUM('onsite', 'remote', 'hybrid');
  CREATE TYPE "public"."enum_jobs_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum_jobs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__jobs_v_version_type" AS ENUM('full-time', 'part-time', 'internship', 'contract');
  CREATE TYPE "public"."enum__jobs_v_version_work_mode" AS ENUM('onsite', 'remote', 'hybrid');
  CREATE TYPE "public"."enum__jobs_v_version_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum__jobs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__jobs_v_published_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_legal_pages_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum_legal_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__legal_pages_v_version_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum__legal_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__legal_pages_v_published_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_products_platforms" AS ENUM('windows', 'macos', 'linux', 'web', 'android', 'ios');
  CREATE TYPE "public"."enum_products_blocks_product_hero_animation" AS ENUM('none', 'menumesh', 'vyro', 'baby');
  CREATE TYPE "public"."enum_products_blocks_pricing_source" AS ENUM('plans', 'manual');
  CREATE TYPE "public"."enum_products_blocks_download_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum_products_blocks_stat_strip_stats_source" AS ENUM('manual', 'downloads');
  CREATE TYPE "public"."enum_products_blocks_embed_aspect_ratio" AS ENUM('16:9', '4:3', '1:1');
  CREATE TYPE "public"."enum_products_secondary_links_kind" AS ENUM('docs', 'microsoft-store', 'play-store', 'app-store', 'github', 'status', 'other');
  CREATE TYPE "public"."enum_products_type" AS ENUM('saas', 'desktop', 'mobile', 'web', 'api');
  CREATE TYPE "public"."enum_products_category" AS ENUM('restaurants', 'pc-tools', 'assistants', 'other');
  CREATE TYPE "public"."enum_products_lifecycle" AS ENUM('live', 'beta', 'coming-soon', 'retired');
  CREATE TYPE "public"."enum_products_hosting_mode" AS ENUM('external', 'hosted');
  CREATE TYPE "public"."enum_products_primary_button_type" AS ENUM('visit', 'download', 'buy', 'demo', 'contact');
  CREATE TYPE "public"."enum_products_primary_button_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum_products_secondary_button_type" AS ENUM('visit', 'download', 'buy', 'demo', 'contact');
  CREATE TYPE "public"."enum_products_secondary_button_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum_products_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_platforms" AS ENUM('windows', 'macos', 'linux', 'web', 'android', 'ios');
  CREATE TYPE "public"."enum__products_v_blocks_product_hero_animation" AS ENUM('none', 'menumesh', 'vyro', 'baby');
  CREATE TYPE "public"."enum__products_v_blocks_pricing_source" AS ENUM('plans', 'manual');
  CREATE TYPE "public"."enum__products_v_blocks_download_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum__products_v_blocks_stat_strip_stats_source" AS ENUM('manual', 'downloads');
  CREATE TYPE "public"."enum__products_v_blocks_embed_aspect_ratio" AS ENUM('16:9', '4:3', '1:1');
  CREATE TYPE "public"."enum__products_v_version_secondary_links_kind" AS ENUM('docs', 'microsoft-store', 'play-store', 'app-store', 'github', 'status', 'other');
  CREATE TYPE "public"."enum__products_v_version_type" AS ENUM('saas', 'desktop', 'mobile', 'web', 'api');
  CREATE TYPE "public"."enum__products_v_version_category" AS ENUM('restaurants', 'pc-tools', 'assistants', 'other');
  CREATE TYPE "public"."enum__products_v_version_lifecycle" AS ENUM('live', 'beta', 'coming-soon', 'retired');
  CREATE TYPE "public"."enum__products_v_version_hosting_mode" AS ENUM('external', 'hosted');
  CREATE TYPE "public"."enum__products_v_version_primary_button_type" AS ENUM('visit', 'download', 'buy', 'demo', 'contact');
  CREATE TYPE "public"."enum__products_v_version_primary_button_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum__products_v_version_secondary_button_type" AS ENUM('visit', 'download', 'buy', 'demo', 'contact');
  CREATE TYPE "public"."enum__products_v_version_secondary_button_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum__products_v_version_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_published_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_plans_billing" AS ENUM('one_time', 'yearly', 'monthly');
  CREATE TYPE "public"."enum_releases_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum_releases_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__releases_v_version_channel" AS ENUM('stable', 'beta');
  CREATE TYPE "public"."enum__releases_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__releases_v_published_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_docs_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum_docs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__docs_v_version_hi_status" AS ENUM('missing', 'draft', 'ready');
  CREATE TYPE "public"."enum__docs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__docs_v_published_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_changelog_type" AS ENUM('new', 'improved', 'fixed');
  CREATE TYPE "public"."enum_leads_status" AS ENUM('new', 'contacted', 'qualified', 'won', 'lost', 'spam');
  CREATE TYPE "public"."enum_leads_type" AS ENUM('contact', 'project', 'waitlist', 'newsletter', 'demo', 'careers', 'partnership');
  CREATE TYPE "public"."enum_leads_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_data_requests_type" AS ENUM('access', 'correction', 'erasure', 'withdraw-consent', 'grievance');
  CREATE TYPE "public"."enum_data_requests_status" AS ENUM('new', 'in-progress', 'completed', 'rejected');
  CREATE TYPE "public"."enum_users_roles" AS ENUM('owner', 'editor', 'support');
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('create', 'update', 'delete');
  CREATE TYPE "public"."enum_daily_stats_kind" AS ENUM('go-click', 'download');
  CREATE TYPE "public"."enum_redirects_to_type" AS ENUM('reference', 'custom');
  CREATE TYPE "public"."enum_redirects_type" AS ENUM('301', '302', '307', '308');
  CREATE TYPE "public"."enum_site_settings_socials_platform" AS ENUM('linkedin', 'x', 'instagram', 'youtube', 'github', 'facebook');
  CREATE TYPE "public"."enum_navigation_header_mega_menu" AS ENUM('none', 'products');
  CREATE TABLE "pages_blocks_hero_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_locales" (
  	"headline" varchar,
  	"subheadline" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_product_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mode" "enum_pages_blocks_product_showcase_mode" DEFAULT 'featured',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_product_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_services_overview" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_services_overview_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_principles_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar
  );
  
  CREATE TABLE "pages_blocks_principles_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_principles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_principles_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_proof_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "enum_pages_blocks_proof_stats_source" DEFAULT 'manual',
  	"value" varchar
  );
  
  CREATE TABLE "pages_blocks_proof_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_proof" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_proof_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_process_steps_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_process" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_process_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_latest" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"posts_count" numeric DEFAULT 2,
  	"changelog_count" numeric DEFAULT 3,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_latest_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"show_newsletter" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_cta_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_timeline_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar
  );
  
  CREATE TABLE "pages_blocks_timeline_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_timeline_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_team_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_company_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_company_facts_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"hi_status" "enum_pages_hi_status" DEFAULT 'missing',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"services_id" integer,
  	"testimonials_id" integer,
  	"team_id" integer,
  	"faqs_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_hero_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_locales" (
  	"headline" varchar,
  	"subheadline" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_product_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"mode" "enum__pages_v_blocks_product_showcase_mode" DEFAULT 'featured',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_product_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_services_overview" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_services_overview_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_principles_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_principles_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_principles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_principles_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_proof_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" "enum__pages_v_blocks_proof_stats_source" DEFAULT 'manual',
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_proof_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_proof" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_proof_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_process_steps_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_process" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_process_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_latest" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"posts_count" numeric DEFAULT 2,
  	"changelog_count" numeric DEFAULT 3,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_latest_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"show_newsletter" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_cta_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_timeline_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_timeline_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_timeline_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_team_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_company_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_company_facts_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_hi_status" "enum__pages_v_version_hi_status" DEFAULT 'missing',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"services_id" integer,
  	"testimonials_id" integer,
  	"team_id" integer,
  	"faqs_id" integer
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"cover_id" integer,
  	"author_id" integer,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"hi_status" "enum_posts_hi_status" DEFAULT 'missing',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_locales" (
  	"title" varchar,
  	"excerpt" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "posts_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_cover_id" integer,
  	"version_author_id" integer,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_hi_status" "enum__posts_v_version_hi_status" DEFAULT 'missing',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__posts_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_posts_v_locales" (
  	"version_title" varchar,
  	"version_excerpt" varchar,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "services_capabilities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "services_capabilities_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_deliverables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "services_deliverables_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_hero_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "services_blocks_hero_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_hero_locales" (
  	"headline" varchar,
  	"subheadline" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_product_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mode" "enum_services_blocks_product_showcase_mode" DEFAULT 'featured',
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_product_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_services_overview" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_services_overview_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_principles_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar
  );
  
  CREATE TABLE "services_blocks_principles_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_principles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_principles_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_proof_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "enum_services_blocks_proof_stats_source" DEFAULT 'manual',
  	"value" varchar
  );
  
  CREATE TABLE "services_blocks_proof_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_proof" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_proof_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "services_blocks_process_steps_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_process" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_process_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_latest" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"posts_count" numeric DEFAULT 2,
  	"changelog_count" numeric DEFAULT 3,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_latest_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"show_newsletter" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_cta_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_timeline_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar
  );
  
  CREATE TABLE "services_blocks_timeline_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_timeline_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_team_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_company_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_company_facts_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "services_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "services" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"sort_order" numeric,
  	"hi_status" "enum_services_hi_status" DEFAULT 'missing',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_services_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "services_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "services_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"services_id" integer,
  	"testimonials_id" integer,
  	"team_id" integer,
  	"faqs_id" integer
  );
  
  CREATE TABLE "_services_v_version_capabilities" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_services_v_version_capabilities_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_version_deliverables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_services_v_version_deliverables_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_hero_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"href" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_services_v_blocks_hero_chips_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_hero_locales" (
  	"headline" varchar,
  	"subheadline" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_product_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"mode" "enum__services_v_blocks_product_showcase_mode" DEFAULT 'featured',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_product_showcase_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_services_overview" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_services_overview_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_principles_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_services_v_blocks_principles_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_principles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_principles_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_proof_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" "enum__services_v_blocks_proof_stats_source" DEFAULT 'manual',
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_services_v_blocks_proof_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_proof" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_proof_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_process_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_services_v_blocks_process_steps_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_process" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_process_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_latest" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"posts_count" numeric DEFAULT 2,
  	"changelog_count" numeric DEFAULT 3,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_latest_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"show_newsletter" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_cta_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_timeline_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_services_v_blocks_timeline_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_timeline" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_timeline_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_team" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_team_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_company_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_company_facts_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_services_v_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_icon" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_sort_order" numeric,
  	"version_hi_status" "enum__services_v_version_hi_status" DEFAULT 'missing',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__services_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__services_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_services_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_services_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"services_id" integer,
  	"testimonials_id" integer,
  	"team_id" integer,
  	"faqs_id" integer
  );
  
  CREATE TABLE "faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"category" "enum_faqs_category" DEFAULT 'general' NOT NULL,
  	"sort_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faqs_locales" (
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "testimonials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"company" varchar,
  	"product_id" integer,
  	"avatar_id" integer,
  	"consent_received" boolean,
  	"consent_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_testimonials_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "testimonials_locales" (
  	"quote" varchar,
  	"role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_testimonials_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_company" varchar,
  	"version_product_id" integer,
  	"version_avatar_id" integer,
  	"version_consent_received" boolean,
  	"version_consent_note" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__testimonials_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__testimonials_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_testimonials_v_locales" (
  	"version_quote" varchar,
  	"version_role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "team_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "team_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "team" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"photo_id" integer,
  	"founder" boolean,
  	"sort_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "team_locales" (
  	"role" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_jobs_type",
  	"work_mode" "enum_jobs_work_mode",
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"posted_at" timestamp(3) with time zone,
  	"hi_status" "enum_jobs_hi_status" DEFAULT 'missing',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_jobs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "jobs_locales" (
  	"title" varchar,
  	"location" varchar,
  	"description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_jobs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_type" "enum__jobs_v_version_type",
  	"version_work_mode" "enum__jobs_v_version_work_mode",
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_posted_at" timestamp(3) with time zone,
  	"version_hi_status" "enum__jobs_v_version_hi_status" DEFAULT 'missing',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__jobs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__jobs_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_jobs_v_locales" (
  	"version_title" varchar,
  	"version_location" varchar,
  	"version_description" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "legal_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"version" varchar,
  	"effective_date" timestamp(3) with time zone,
  	"hi_status" "enum_legal_pages_hi_status" DEFAULT 'missing',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_legal_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "legal_pages_locales" (
  	"title" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_legal_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_version" varchar,
  	"version_effective_date" timestamp(3) with time zone,
  	"version_hi_status" "enum__legal_pages_v_version_hi_status" DEFAULT 'missing',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__legal_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__legal_pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_legal_pages_v_locales" (
  	"version_title" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"prefix" varchar DEFAULT '',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_square_url" varchar,
  	"sizes_square_width" numeric,
  	"sizes_square_height" numeric,
  	"sizes_square_mime_type" varchar,
  	"sizes_square_filesize" numeric,
  	"sizes_square_filename" varchar,
  	"sizes_small_url" varchar,
  	"sizes_small_width" numeric,
  	"sizes_small_height" numeric,
  	"sizes_small_mime_type" varchar,
  	"sizes_small_filesize" numeric,
  	"sizes_small_filename" varchar,
  	"sizes_medium_url" varchar,
  	"sizes_medium_width" numeric,
  	"sizes_medium_height" numeric,
  	"sizes_medium_mime_type" varchar,
  	"sizes_medium_filesize" numeric,
  	"sizes_medium_filename" varchar,
  	"sizes_large_url" varchar,
  	"sizes_large_width" numeric,
  	"sizes_large_height" numeric,
  	"sizes_large_mime_type" varchar,
  	"sizes_large_filesize" numeric,
  	"sizes_large_filename" varchar,
  	"sizes_xlarge_url" varchar,
  	"sizes_xlarge_width" numeric,
  	"sizes_xlarge_height" numeric,
  	"sizes_xlarge_mime_type" varchar,
  	"sizes_xlarge_filesize" numeric,
  	"sizes_xlarge_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "products_platforms" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_platforms",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_blocks_product_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"animation" "enum_products_blocks_product_hero_animation" DEFAULT 'none',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_product_hero_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_problem_solution_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_blocks_problem_solution_points_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_problem_solution" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_problem_solution_locales" (
  	"heading" varchar,
  	"problem" varchar,
  	"solution" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_feature_scroller_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "products_blocks_feature_scroller_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_feature_scroller" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_feature_scroller_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_feature_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar
  );
  
  CREATE TABLE "products_blocks_feature_grid_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_feature_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_feature_grid_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_screenshots_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "products_blocks_screenshots_images_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_screenshots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_screenshots_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"video_id" integer,
  	"poster_id" integer,
  	"captions_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_video_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "products_blocks_how_it_works_steps_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_how_it_works_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_use_cases_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" varchar
  );
  
  CREATE TABLE "products_blocks_use_cases_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_use_cases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_use_cases_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_pricing_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_blocks_pricing_tiers_features_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_pricing_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"highlight" boolean
  );
  
  CREATE TABLE "products_blocks_pricing_tiers_locales" (
  	"name" varchar,
  	"price" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_pricing" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "enum_products_blocks_pricing_source" DEFAULT 'plans',
  	"full_pricing_url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_pricing_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_privacy_local" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_blocks_privacy_local_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_privacy_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_blocks_privacy_cloud_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_privacy" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_privacy_locales" (
  	"heading" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_requirements_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_blocks_requirements_rows_locales" (
  	"label" varchar,
  	"minimum" varchar,
  	"recommended" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_requirements_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"channel" "enum_products_blocks_download_channel" DEFAULT 'stable',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_download_locales" (
  	"heading" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_changelog_preview" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"limit" numeric DEFAULT 3,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_changelog_preview_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_comparison_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"highlight" boolean
  );
  
  CREATE TABLE "products_blocks_comparison_columns_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_comparison_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_blocks_comparison_rows_cells_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_blocks_comparison_rows_locales" (
  	"feature" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_comparison_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"use_product_buttons" boolean DEFAULT true,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_cta_band_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_stat_strip_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "enum_products_blocks_stat_strip_stats_source" DEFAULT 'manual',
  	"value" varchar
  );
  
  CREATE TABLE "products_blocks_stat_strip_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_blocks_stat_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"aspect_ratio" "enum_products_blocks_embed_aspect_ratio" DEFAULT '16:9',
  	"block_name" varchar
  );
  
  CREATE TABLE "products_blocks_embed_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_secondary_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_products_secondary_links_kind",
  	"url" varchar
  );
  
  CREATE TABLE "products_secondary_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"type" "enum_products_type",
  	"category" "enum_products_category" DEFAULT 'other',
  	"status" "enum_products_lifecycle" DEFAULT 'coming-soon',
  	"hosting_mode" "enum_products_hosting_mode" DEFAULT 'external',
  	"external_url" varchar,
  	"launch_date" timestamp(3) with time zone,
  	"accent_color" varchar,
  	"logo_id" integer,
  	"icon_id" integer,
  	"hero_media_id" integer,
  	"card_preview_id" integer,
  	"primary_button_type" "enum_products_primary_button_type",
  	"primary_button_plan_id" integer,
  	"primary_button_channel" "enum_products_primary_button_channel" DEFAULT 'stable',
  	"primary_button_url" varchar,
  	"secondary_button_type" "enum_products_secondary_button_type",
  	"secondary_button_plan_id" integer,
  	"secondary_button_channel" "enum_products_secondary_button_channel" DEFAULT 'stable',
  	"secondary_button_url" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"hi_status" "enum_products_hi_status" DEFAULT 'missing',
  	"featured" boolean DEFAULT false,
  	"sort_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "products_locales" (
  	"tagline" varchar,
  	"summary" varchar,
  	"primary_button_label_override" varchar,
  	"secondary_button_label_override" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"faqs_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "_products_v_version_platforms" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__products_v_version_platforms",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_product_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"animation" "enum__products_v_blocks_product_hero_animation" DEFAULT 'none',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_product_hero_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_problem_solution_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_problem_solution_points_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_problem_solution" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_problem_solution_locales" (
  	"heading" varchar,
  	"problem" varchar,
  	"solution" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_feature_scroller_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_feature_scroller_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_feature_scroller" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_feature_scroller_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_feature_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_feature_grid_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_feature_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_feature_grid_locales" (
  	"heading" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_screenshots_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_screenshots_images_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_screenshots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_screenshots_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"video_id" integer,
  	"poster_id" integer,
  	"captions_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_video_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_how_it_works_steps_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_how_it_works_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_use_cases_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_use_cases_items_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_use_cases" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_use_cases_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_pricing_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_pricing_tiers_features_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_pricing_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"highlight" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_pricing_tiers_locales" (
  	"name" varchar,
  	"price" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_pricing" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" "enum__products_v_blocks_pricing_source" DEFAULT 'plans',
  	"full_pricing_url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_pricing_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_privacy_local" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_privacy_local_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_privacy_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_privacy_cloud_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_privacy" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_privacy_locales" (
  	"heading" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_requirements_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_requirements_rows_locales" (
  	"label" varchar,
  	"minimum" varchar,
  	"recommended" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_requirements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_requirements_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_download" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"channel" "enum__products_v_blocks_download_channel" DEFAULT 'stable',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_download_locales" (
  	"heading" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_changelog_preview" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"limit" numeric DEFAULT 3,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_changelog_preview_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_testimonials_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_comparison_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"highlight" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_comparison_columns_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_comparison_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_comparison_rows_cells_locales" (
  	"value" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_comparison_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_comparison_rows_locales" (
  	"feature" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_comparison" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_comparison_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"use_product_buttons" boolean DEFAULT true,
  	"primary_href" varchar,
  	"secondary_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_cta_band_locales" (
  	"heading" varchar,
  	"text" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_stat_strip_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" "enum__products_v_blocks_stat_strip_stats_source" DEFAULT 'manual',
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_stat_strip_stats_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_stat_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"aspect_ratio" "enum__products_v_blocks_embed_aspect_ratio" DEFAULT '16:9',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_products_v_blocks_embed_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_version_secondary_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__products_v_version_secondary_links_kind",
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_secondary_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_type" "enum__products_v_version_type",
  	"version_category" "enum__products_v_version_category" DEFAULT 'other',
  	"version_status" "enum__products_v_version_lifecycle" DEFAULT 'coming-soon',
  	"version_hosting_mode" "enum__products_v_version_hosting_mode" DEFAULT 'external',
  	"version_external_url" varchar,
  	"version_launch_date" timestamp(3) with time zone,
  	"version_accent_color" varchar,
  	"version_logo_id" integer,
  	"version_icon_id" integer,
  	"version_hero_media_id" integer,
  	"version_card_preview_id" integer,
  	"version_primary_button_type" "enum__products_v_version_primary_button_type",
  	"version_primary_button_plan_id" integer,
  	"version_primary_button_channel" "enum__products_v_version_primary_button_channel" DEFAULT 'stable',
  	"version_primary_button_url" varchar,
  	"version_secondary_button_type" "enum__products_v_version_secondary_button_type",
  	"version_secondary_button_plan_id" integer,
  	"version_secondary_button_channel" "enum__products_v_version_secondary_button_channel" DEFAULT 'stable',
  	"version_secondary_button_url" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_hi_status" "enum__products_v_version_hi_status" DEFAULT 'missing',
  	"version_featured" boolean DEFAULT false,
  	"version_sort_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__products_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_products_v_locales" (
  	"version_tagline" varchar,
  	"version_summary" varchar,
  	"version_primary_button_label_override" varchar,
  	"version_secondary_button_label_override" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"faqs_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "plans_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "plans_features_locales" (
  	"text" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "plans" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"code" varchar NOT NULL,
  	"billing" "enum_plans_billing" DEFAULT 'one_time' NOT NULL,
  	"price_i_n_r" numeric,
  	"price_u_s_d" numeric,
  	"max_activations" numeric DEFAULT 2,
  	"updates_for_months" numeric,
  	"highlight" boolean DEFAULT false,
  	"active" boolean DEFAULT true,
  	"sort_order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "plans_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "releases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"version" varchar,
  	"channel" "enum_releases_channel" DEFAULT 'stable',
  	"platform" varchar DEFAULT 'windows-x86_64',
  	"released_at" timestamp(3) with time zone,
  	"min_os" varchar,
  	"installer_id" integer,
  	"updater_signature" varchar,
  	"sha256" varchar,
  	"size_bytes" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_releases_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "releases_locales" (
  	"notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_releases_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_product_id" integer,
  	"version_version" varchar,
  	"version_channel" "enum__releases_v_version_channel" DEFAULT 'stable',
  	"version_platform" varchar DEFAULT 'windows-x86_64',
  	"version_released_at" timestamp(3) with time zone,
  	"version_min_os" varchar,
  	"version_installer_id" integer,
  	"version_updater_signature" varchar,
  	"version_sha256" varchar,
  	"version_size_bytes" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__releases_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__releases_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_releases_v_locales" (
  	"version_notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "installers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"version" varchar NOT NULL,
  	"sha256" varchar,
  	"prefix" varchar DEFAULT 'downloads',
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric
  );
  
  CREATE TABLE "docs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"parent_id" integer,
  	"sort_order" numeric,
  	"hi_status" "enum_docs_hi_status" DEFAULT 'missing',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_docs_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "docs_locales" (
  	"title" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_docs_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_product_id" integer,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_parent_id" integer,
  	"version_sort_order" numeric,
  	"version_hi_status" "enum__docs_v_version_hi_status" DEFAULT 'missing',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__docs_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__docs_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_docs_v_locales" (
  	"version_title" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "changelog" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"type" "enum_changelog_type" NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "changelog_locales" (
  	"title" varchar NOT NULL,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_leads_status" DEFAULT 'new' NOT NULL,
  	"assigned_to_id" integer,
  	"notes" varchar,
  	"type" "enum_leads_type" NOT NULL,
  	"product_id" integer,
  	"name" varchar,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"company" varchar,
  	"message" varchar,
  	"details" jsonb,
  	"locale" "enum_leads_locale",
  	"source_page" varchar,
  	"source_referrer" varchar,
  	"source_utm_source" varchar,
  	"source_utm_medium" varchar,
  	"source_utm_campaign" varchar,
  	"source_utm_term" varchar,
  	"source_utm_content" varchar,
  	"consent_text_version" varchar,
  	"consent_given_at" timestamp(3) with time zone,
  	"consent_ip_hash" varchar,
  	"marketing_consent_given" boolean,
  	"marketing_consent_at" timestamp(3) with time zone,
  	"marketing_consent_text_version" varchar,
  	"marketing_consent_withdrawn_at" timestamp(3) with time zone,
  	"confirm_token_hash" varchar,
  	"confirmed_at" timestamp(3) with time zone,
  	"unsubscribed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "data_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"type" "enum_data_requests_type" NOT NULL,
  	"details" varchar,
  	"status" "enum_data_requests_status" DEFAULT 'new' NOT NULL,
  	"handled_by_id" integer,
  	"handled_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "short_links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"destination" varchar NOT NULL,
  	"utm_source" varchar DEFAULT 'jainav',
  	"utm_medium" varchar DEFAULT 'site',
  	"utm_campaign" varchar,
  	"active" boolean DEFAULT true,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"actor_id" integer,
  	"action" "enum_audit_log_action" NOT NULL,
  	"entity" varchar NOT NULL,
  	"doc_id" varchar,
  	"summary" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "daily_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"kind" "enum_daily_stats_kind" NOT NULL,
  	"key" varchar NOT NULL,
  	"count" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to_type" "enum_redirects_to_type" DEFAULT 'reference',
  	"to_url" varchar,
  	"type" "enum_redirects_type" DEFAULT '308' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"products_id" integer,
  	"services_id" integer,
  	"posts_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer,
  	"services_id" integer,
  	"faqs_id" integer,
  	"testimonials_id" integer,
  	"team_id" integer,
  	"jobs_id" integer,
  	"legal_pages_id" integer,
  	"media_id" integer,
  	"products_id" integer,
  	"plans_id" integer,
  	"releases_id" integer,
  	"installers_id" integer,
  	"docs_id" integer,
  	"changelog_id" integer,
  	"leads_id" integer,
  	"data_requests_id" integer,
  	"short_links_id" integer,
  	"users_id" integer,
  	"audit_log_id" integer,
  	"daily_stats_id" integer,
  	"redirects_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_socials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_site_settings_socials_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company_legal_name" varchar DEFAULT 'Jainav Infotech Private Limited',
  	"company_cin" varchar,
  	"company_gstin" varchar,
  	"company_incorporation_date" timestamp(3) with time zone,
  	"company_registered_address" varchar,
  	"company_phone" varchar,
  	"company_emails_hello" varchar,
  	"company_emails_sales" varchar,
  	"company_emails_support" varchar,
  	"company_emails_careers" varchar,
  	"company_emails_privacy" varchar,
  	"company_whatsapp" varchar,
  	"announcement_link" varchar,
  	"announcement_active" boolean,
  	"store_enabled" boolean DEFAULT false,
  	"maintenance_mode" boolean,
  	"scheduler_url" varchar,
  	"default_seo_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"announcement_text" varchar,
  	"default_seo_title" varchar,
  	"default_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "navigation_header" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar NOT NULL,
  	"mega_menu" "enum_navigation_header_mega_menu" DEFAULT 'none'
  );
  
  CREATE TABLE "navigation_header_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_footer_links_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation_footer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "navigation_footer_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "pages_blocks_hero_chips" ADD CONSTRAINT "pages_blocks_hero_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_chips_locales" ADD CONSTRAINT "pages_blocks_hero_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_showcase" ADD CONSTRAINT "pages_blocks_product_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_product_showcase_locales" ADD CONSTRAINT "pages_blocks_product_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_product_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_services_overview" ADD CONSTRAINT "pages_blocks_services_overview_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_services_overview_locales" ADD CONSTRAINT "pages_blocks_services_overview_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_services_overview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_principles_items" ADD CONSTRAINT "pages_blocks_principles_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_principles_items_locales" ADD CONSTRAINT "pages_blocks_principles_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_principles_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_principles" ADD CONSTRAINT "pages_blocks_principles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_principles_locales" ADD CONSTRAINT "pages_blocks_principles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_proof_stats" ADD CONSTRAINT "pages_blocks_proof_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_proof"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_proof_stats_locales" ADD CONSTRAINT "pages_blocks_proof_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_proof_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_proof" ADD CONSTRAINT "pages_blocks_proof_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_proof_locales" ADD CONSTRAINT "pages_blocks_proof_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_proof"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_process_steps" ADD CONSTRAINT "pages_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_process_steps_locales" ADD CONSTRAINT "pages_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_process" ADD CONSTRAINT "pages_blocks_process_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_process_locales" ADD CONSTRAINT "pages_blocks_process_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_latest" ADD CONSTRAINT "pages_blocks_latest_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_latest_locales" ADD CONSTRAINT "pages_blocks_latest_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_latest"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta" ADD CONSTRAINT "pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_cta_locales" ADD CONSTRAINT "pages_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text_locales" ADD CONSTRAINT "pages_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline_items" ADD CONSTRAINT "pages_blocks_timeline_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline_items_locales" ADD CONSTRAINT "pages_blocks_timeline_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_timeline_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline" ADD CONSTRAINT "pages_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_timeline_locales" ADD CONSTRAINT "pages_blocks_timeline_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_team" ADD CONSTRAINT "pages_blocks_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_team_locales" ADD CONSTRAINT "pages_blocks_team_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_company_facts" ADD CONSTRAINT "pages_blocks_company_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_company_facts_locales" ADD CONSTRAINT "pages_blocks_company_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_company_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_chips" ADD CONSTRAINT "_pages_v_blocks_hero_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_chips_locales" ADD CONSTRAINT "_pages_v_blocks_hero_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_showcase" ADD CONSTRAINT "_pages_v_blocks_product_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_product_showcase_locales" ADD CONSTRAINT "_pages_v_blocks_product_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_product_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_services_overview" ADD CONSTRAINT "_pages_v_blocks_services_overview_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_services_overview_locales" ADD CONSTRAINT "_pages_v_blocks_services_overview_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_services_overview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_principles_items" ADD CONSTRAINT "_pages_v_blocks_principles_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_principles_items_locales" ADD CONSTRAINT "_pages_v_blocks_principles_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_principles_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_principles" ADD CONSTRAINT "_pages_v_blocks_principles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_principles_locales" ADD CONSTRAINT "_pages_v_blocks_principles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_proof_stats" ADD CONSTRAINT "_pages_v_blocks_proof_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_proof"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_proof_stats_locales" ADD CONSTRAINT "_pages_v_blocks_proof_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_proof_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_proof" ADD CONSTRAINT "_pages_v_blocks_proof_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_proof_locales" ADD CONSTRAINT "_pages_v_blocks_proof_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_proof"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_process_steps" ADD CONSTRAINT "_pages_v_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_process_steps_locales" ADD CONSTRAINT "_pages_v_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_process" ADD CONSTRAINT "_pages_v_blocks_process_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_process_locales" ADD CONSTRAINT "_pages_v_blocks_process_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_latest" ADD CONSTRAINT "_pages_v_blocks_latest_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_latest_locales" ADD CONSTRAINT "_pages_v_blocks_latest_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_latest"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta" ADD CONSTRAINT "_pages_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_cta_locales" ADD CONSTRAINT "_pages_v_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text_locales" ADD CONSTRAINT "_pages_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline_items" ADD CONSTRAINT "_pages_v_blocks_timeline_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline_items_locales" ADD CONSTRAINT "_pages_v_blocks_timeline_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_timeline_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline" ADD CONSTRAINT "_pages_v_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_timeline_locales" ADD CONSTRAINT "_pages_v_blocks_timeline_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team" ADD CONSTRAINT "_pages_v_blocks_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_team_locales" ADD CONSTRAINT "_pages_v_blocks_team_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_company_facts" ADD CONSTRAINT "_pages_v_blocks_company_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_company_facts_locales" ADD CONSTRAINT "_pages_v_blocks_company_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_company_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_team_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_locales" ADD CONSTRAINT "posts_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_locales" ADD CONSTRAINT "posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_texts" ADD CONSTRAINT "posts_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_author_id_team_id_fk" FOREIGN KEY ("version_author_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_texts" ADD CONSTRAINT "_posts_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_capabilities" ADD CONSTRAINT "services_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_capabilities_locales" ADD CONSTRAINT "services_capabilities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_capabilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_deliverables" ADD CONSTRAINT "services_deliverables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_deliverables_locales" ADD CONSTRAINT "services_deliverables_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_deliverables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_hero_chips" ADD CONSTRAINT "services_blocks_hero_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_hero_chips_locales" ADD CONSTRAINT "services_blocks_hero_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_hero_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_hero" ADD CONSTRAINT "services_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_hero_locales" ADD CONSTRAINT "services_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_product_showcase" ADD CONSTRAINT "services_blocks_product_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_product_showcase_locales" ADD CONSTRAINT "services_blocks_product_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_product_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_services_overview" ADD CONSTRAINT "services_blocks_services_overview_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_services_overview_locales" ADD CONSTRAINT "services_blocks_services_overview_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_services_overview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_principles_items" ADD CONSTRAINT "services_blocks_principles_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_principles_items_locales" ADD CONSTRAINT "services_blocks_principles_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_principles_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_principles" ADD CONSTRAINT "services_blocks_principles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_principles_locales" ADD CONSTRAINT "services_blocks_principles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_proof_stats" ADD CONSTRAINT "services_blocks_proof_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_proof"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_proof_stats_locales" ADD CONSTRAINT "services_blocks_proof_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_proof_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_proof" ADD CONSTRAINT "services_blocks_proof_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_proof_locales" ADD CONSTRAINT "services_blocks_proof_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_proof"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_process_steps" ADD CONSTRAINT "services_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_process_steps_locales" ADD CONSTRAINT "services_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_process" ADD CONSTRAINT "services_blocks_process_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_process_locales" ADD CONSTRAINT "services_blocks_process_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_latest" ADD CONSTRAINT "services_blocks_latest_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_latest_locales" ADD CONSTRAINT "services_blocks_latest_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_latest"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_cta" ADD CONSTRAINT "services_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_cta_locales" ADD CONSTRAINT "services_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_rich_text" ADD CONSTRAINT "services_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_rich_text_locales" ADD CONSTRAINT "services_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_timeline_items" ADD CONSTRAINT "services_blocks_timeline_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_timeline_items_locales" ADD CONSTRAINT "services_blocks_timeline_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_timeline_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_timeline" ADD CONSTRAINT "services_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_timeline_locales" ADD CONSTRAINT "services_blocks_timeline_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_team" ADD CONSTRAINT "services_blocks_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_team_locales" ADD CONSTRAINT "services_blocks_team_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_company_facts" ADD CONSTRAINT "services_blocks_company_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_company_facts_locales" ADD CONSTRAINT "services_blocks_company_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_company_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_faq" ADD CONSTRAINT "services_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_blocks_faq_locales" ADD CONSTRAINT "services_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "services_rels" ADD CONSTRAINT "services_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_capabilities" ADD CONSTRAINT "_services_v_version_capabilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_capabilities_locales" ADD CONSTRAINT "_services_v_version_capabilities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_version_capabilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_deliverables" ADD CONSTRAINT "_services_v_version_deliverables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_version_deliverables_locales" ADD CONSTRAINT "_services_v_version_deliverables_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_version_deliverables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_hero_chips" ADD CONSTRAINT "_services_v_blocks_hero_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_hero_chips_locales" ADD CONSTRAINT "_services_v_blocks_hero_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_hero_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_hero" ADD CONSTRAINT "_services_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_hero_locales" ADD CONSTRAINT "_services_v_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_product_showcase" ADD CONSTRAINT "_services_v_blocks_product_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_product_showcase_locales" ADD CONSTRAINT "_services_v_blocks_product_showcase_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_product_showcase"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_services_overview" ADD CONSTRAINT "_services_v_blocks_services_overview_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_services_overview_locales" ADD CONSTRAINT "_services_v_blocks_services_overview_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_services_overview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_principles_items" ADD CONSTRAINT "_services_v_blocks_principles_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_principles_items_locales" ADD CONSTRAINT "_services_v_blocks_principles_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_principles_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_principles" ADD CONSTRAINT "_services_v_blocks_principles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_principles_locales" ADD CONSTRAINT "_services_v_blocks_principles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_principles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_proof_stats" ADD CONSTRAINT "_services_v_blocks_proof_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_proof"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_proof_stats_locales" ADD CONSTRAINT "_services_v_blocks_proof_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_proof_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_proof" ADD CONSTRAINT "_services_v_blocks_proof_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_proof_locales" ADD CONSTRAINT "_services_v_blocks_proof_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_proof"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_process_steps" ADD CONSTRAINT "_services_v_blocks_process_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_process_steps_locales" ADD CONSTRAINT "_services_v_blocks_process_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_process_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_process" ADD CONSTRAINT "_services_v_blocks_process_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_process_locales" ADD CONSTRAINT "_services_v_blocks_process_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_process"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_latest" ADD CONSTRAINT "_services_v_blocks_latest_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_latest_locales" ADD CONSTRAINT "_services_v_blocks_latest_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_latest"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_cta" ADD CONSTRAINT "_services_v_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_cta_locales" ADD CONSTRAINT "_services_v_blocks_cta_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_cta"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_rich_text" ADD CONSTRAINT "_services_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_rich_text_locales" ADD CONSTRAINT "_services_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_timeline_items" ADD CONSTRAINT "_services_v_blocks_timeline_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_timeline_items_locales" ADD CONSTRAINT "_services_v_blocks_timeline_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_timeline_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_timeline" ADD CONSTRAINT "_services_v_blocks_timeline_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_timeline_locales" ADD CONSTRAINT "_services_v_blocks_timeline_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_timeline"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_team" ADD CONSTRAINT "_services_v_blocks_team_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_team_locales" ADD CONSTRAINT "_services_v_blocks_team_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_company_facts" ADD CONSTRAINT "_services_v_blocks_company_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_company_facts_locales" ADD CONSTRAINT "_services_v_blocks_company_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_company_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_faq" ADD CONSTRAINT "_services_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_blocks_faq_locales" ADD CONSTRAINT "_services_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v" ADD CONSTRAINT "_services_v_parent_id_services_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_services_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_services_v_rels" ADD CONSTRAINT "_services_v_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "faqs" ADD CONSTRAINT "faqs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "faqs_locales" ADD CONSTRAINT "faqs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials_locales" ADD CONSTRAINT "testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_parent_id_testimonials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_product_id_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_avatar_id_media_id_fk" FOREIGN KEY ("version_avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v_locales" ADD CONSTRAINT "_testimonials_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_testimonials_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_links" ADD CONSTRAINT "team_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team_links_locales" ADD CONSTRAINT "team_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team" ADD CONSTRAINT "team_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team_locales" ADD CONSTRAINT "team_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "jobs_locales" ADD CONSTRAINT "jobs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_jobs_v" ADD CONSTRAINT "_jobs_v_parent_id_jobs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_jobs_v_locales" ADD CONSTRAINT "_jobs_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_jobs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_pages_locales" ADD CONSTRAINT "legal_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_legal_pages_v" ADD CONSTRAINT "_legal_pages_v_parent_id_legal_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."legal_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legal_pages_v_locales" ADD CONSTRAINT "_legal_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_legal_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_platforms" ADD CONSTRAINT "products_platforms_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_product_hero" ADD CONSTRAINT "products_blocks_product_hero_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_hero" ADD CONSTRAINT "products_blocks_product_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_product_hero_locales" ADD CONSTRAINT "products_blocks_product_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_product_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_problem_solution_points" ADD CONSTRAINT "products_blocks_problem_solution_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_problem_solution"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_problem_solution_points_locales" ADD CONSTRAINT "products_blocks_problem_solution_points_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_problem_solution_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_problem_solution" ADD CONSTRAINT "products_blocks_problem_solution_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_problem_solution_locales" ADD CONSTRAINT "products_blocks_problem_solution_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_problem_solution"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_feature_scroller_items" ADD CONSTRAINT "products_blocks_feature_scroller_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_feature_scroller_items" ADD CONSTRAINT "products_blocks_feature_scroller_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_feature_scroller"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_feature_scroller_items_locales" ADD CONSTRAINT "products_blocks_feature_scroller_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_feature_scroller_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_feature_scroller" ADD CONSTRAINT "products_blocks_feature_scroller_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_feature_scroller_locales" ADD CONSTRAINT "products_blocks_feature_scroller_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_feature_scroller"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_feature_grid_items" ADD CONSTRAINT "products_blocks_feature_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_feature_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_feature_grid_items_locales" ADD CONSTRAINT "products_blocks_feature_grid_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_feature_grid_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_feature_grid" ADD CONSTRAINT "products_blocks_feature_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_feature_grid_locales" ADD CONSTRAINT "products_blocks_feature_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_feature_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_screenshots_images" ADD CONSTRAINT "products_blocks_screenshots_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_screenshots_images" ADD CONSTRAINT "products_blocks_screenshots_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_screenshots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_screenshots_images_locales" ADD CONSTRAINT "products_blocks_screenshots_images_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_screenshots_images"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_screenshots" ADD CONSTRAINT "products_blocks_screenshots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_screenshots_locales" ADD CONSTRAINT "products_blocks_screenshots_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_screenshots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_video" ADD CONSTRAINT "products_blocks_video_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_video" ADD CONSTRAINT "products_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_video" ADD CONSTRAINT "products_blocks_video_captions_id_media_id_fk" FOREIGN KEY ("captions_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_video" ADD CONSTRAINT "products_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_video_locales" ADD CONSTRAINT "products_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_how_it_works_steps" ADD CONSTRAINT "products_blocks_how_it_works_steps_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_how_it_works_steps" ADD CONSTRAINT "products_blocks_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_how_it_works_steps_locales" ADD CONSTRAINT "products_blocks_how_it_works_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_how_it_works_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_how_it_works" ADD CONSTRAINT "products_blocks_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_how_it_works_locales" ADD CONSTRAINT "products_blocks_how_it_works_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_use_cases_items" ADD CONSTRAINT "products_blocks_use_cases_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_use_cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_use_cases_items_locales" ADD CONSTRAINT "products_blocks_use_cases_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_use_cases_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_use_cases" ADD CONSTRAINT "products_blocks_use_cases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_use_cases_locales" ADD CONSTRAINT "products_blocks_use_cases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_use_cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_pricing_tiers_features" ADD CONSTRAINT "products_blocks_pricing_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_pricing_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_pricing_tiers_features_locales" ADD CONSTRAINT "products_blocks_pricing_tiers_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_pricing_tiers_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_pricing_tiers" ADD CONSTRAINT "products_blocks_pricing_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_pricing_tiers_locales" ADD CONSTRAINT "products_blocks_pricing_tiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_pricing_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_pricing" ADD CONSTRAINT "products_blocks_pricing_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_pricing_locales" ADD CONSTRAINT "products_blocks_pricing_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_privacy_local" ADD CONSTRAINT "products_blocks_privacy_local_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_privacy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_privacy_local_locales" ADD CONSTRAINT "products_blocks_privacy_local_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_privacy_local"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_privacy_cloud" ADD CONSTRAINT "products_blocks_privacy_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_privacy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_privacy_cloud_locales" ADD CONSTRAINT "products_blocks_privacy_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_privacy_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_privacy" ADD CONSTRAINT "products_blocks_privacy_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_privacy_locales" ADD CONSTRAINT "products_blocks_privacy_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_privacy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_requirements_rows" ADD CONSTRAINT "products_blocks_requirements_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_requirements_rows_locales" ADD CONSTRAINT "products_blocks_requirements_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_requirements_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_requirements" ADD CONSTRAINT "products_blocks_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_requirements_locales" ADD CONSTRAINT "products_blocks_requirements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_download" ADD CONSTRAINT "products_blocks_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_download_locales" ADD CONSTRAINT "products_blocks_download_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_download"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_changelog_preview" ADD CONSTRAINT "products_blocks_changelog_preview_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_changelog_preview_locales" ADD CONSTRAINT "products_blocks_changelog_preview_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_changelog_preview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_faq" ADD CONSTRAINT "products_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_faq_locales" ADD CONSTRAINT "products_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_testimonials" ADD CONSTRAINT "products_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_testimonials_locales" ADD CONSTRAINT "products_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_columns" ADD CONSTRAINT "products_blocks_comparison_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_columns_locales" ADD CONSTRAINT "products_blocks_comparison_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_rows_cells" ADD CONSTRAINT "products_blocks_comparison_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_rows_cells_locales" ADD CONSTRAINT "products_blocks_comparison_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_rows" ADD CONSTRAINT "products_blocks_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_rows_locales" ADD CONSTRAINT "products_blocks_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison" ADD CONSTRAINT "products_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_comparison_locales" ADD CONSTRAINT "products_blocks_comparison_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_cta_band" ADD CONSTRAINT "products_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_cta_band_locales" ADD CONSTRAINT "products_blocks_cta_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_rich_text" ADD CONSTRAINT "products_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_rich_text_locales" ADD CONSTRAINT "products_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_stat_strip_stats" ADD CONSTRAINT "products_blocks_stat_strip_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_stat_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_stat_strip_stats_locales" ADD CONSTRAINT "products_blocks_stat_strip_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_stat_strip_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_stat_strip" ADD CONSTRAINT "products_blocks_stat_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_embed" ADD CONSTRAINT "products_blocks_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_embed_locales" ADD CONSTRAINT "products_blocks_embed_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_embed"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_secondary_links" ADD CONSTRAINT "products_secondary_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_secondary_links_locales" ADD CONSTRAINT "products_secondary_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_secondary_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_card_preview_id_media_id_fk" FOREIGN KEY ("card_preview_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_primary_button_plan_id_plans_id_fk" FOREIGN KEY ("primary_button_plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_secondary_button_plan_id_plans_id_fk" FOREIGN KEY ("secondary_button_plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_platforms" ADD CONSTRAINT "_products_v_version_platforms_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_product_hero" ADD CONSTRAINT "_products_v_blocks_product_hero_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_product_hero" ADD CONSTRAINT "_products_v_blocks_product_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_product_hero_locales" ADD CONSTRAINT "_products_v_blocks_product_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_product_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_problem_solution_points" ADD CONSTRAINT "_products_v_blocks_problem_solution_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_problem_solution"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_problem_solution_points_locales" ADD CONSTRAINT "_products_v_blocks_problem_solution_points_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_problem_solution_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_problem_solution" ADD CONSTRAINT "_products_v_blocks_problem_solution_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_problem_solution_locales" ADD CONSTRAINT "_products_v_blocks_problem_solution_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_problem_solution"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_feature_scroller_items" ADD CONSTRAINT "_products_v_blocks_feature_scroller_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_feature_scroller_items" ADD CONSTRAINT "_products_v_blocks_feature_scroller_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_feature_scroller"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_feature_scroller_items_locales" ADD CONSTRAINT "_products_v_blocks_feature_scroller_items_locales_parent__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_feature_scroller_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_feature_scroller" ADD CONSTRAINT "_products_v_blocks_feature_scroller_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_feature_scroller_locales" ADD CONSTRAINT "_products_v_blocks_feature_scroller_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_feature_scroller"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_feature_grid_items" ADD CONSTRAINT "_products_v_blocks_feature_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_feature_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_feature_grid_items_locales" ADD CONSTRAINT "_products_v_blocks_feature_grid_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_feature_grid_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_feature_grid" ADD CONSTRAINT "_products_v_blocks_feature_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_feature_grid_locales" ADD CONSTRAINT "_products_v_blocks_feature_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_feature_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_screenshots_images" ADD CONSTRAINT "_products_v_blocks_screenshots_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_screenshots_images" ADD CONSTRAINT "_products_v_blocks_screenshots_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_screenshots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_screenshots_images_locales" ADD CONSTRAINT "_products_v_blocks_screenshots_images_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_screenshots_images"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_screenshots" ADD CONSTRAINT "_products_v_blocks_screenshots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_screenshots_locales" ADD CONSTRAINT "_products_v_blocks_screenshots_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_screenshots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_video" ADD CONSTRAINT "_products_v_blocks_video_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_video" ADD CONSTRAINT "_products_v_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_video" ADD CONSTRAINT "_products_v_blocks_video_captions_id_media_id_fk" FOREIGN KEY ("captions_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_video" ADD CONSTRAINT "_products_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_video_locales" ADD CONSTRAINT "_products_v_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_how_it_works_steps" ADD CONSTRAINT "_products_v_blocks_how_it_works_steps_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_how_it_works_steps" ADD CONSTRAINT "_products_v_blocks_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_how_it_works_steps_locales" ADD CONSTRAINT "_products_v_blocks_how_it_works_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_how_it_works_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_how_it_works" ADD CONSTRAINT "_products_v_blocks_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_how_it_works_locales" ADD CONSTRAINT "_products_v_blocks_how_it_works_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_use_cases_items" ADD CONSTRAINT "_products_v_blocks_use_cases_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_use_cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_use_cases_items_locales" ADD CONSTRAINT "_products_v_blocks_use_cases_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_use_cases_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_use_cases" ADD CONSTRAINT "_products_v_blocks_use_cases_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_use_cases_locales" ADD CONSTRAINT "_products_v_blocks_use_cases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_use_cases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_pricing_tiers_features" ADD CONSTRAINT "_products_v_blocks_pricing_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_pricing_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_pricing_tiers_features_locales" ADD CONSTRAINT "_products_v_blocks_pricing_tiers_features_locales_parent__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_pricing_tiers_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_pricing_tiers" ADD CONSTRAINT "_products_v_blocks_pricing_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_pricing_tiers_locales" ADD CONSTRAINT "_products_v_blocks_pricing_tiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_pricing_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_pricing" ADD CONSTRAINT "_products_v_blocks_pricing_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_pricing_locales" ADD CONSTRAINT "_products_v_blocks_pricing_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_privacy_local" ADD CONSTRAINT "_products_v_blocks_privacy_local_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_privacy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_privacy_local_locales" ADD CONSTRAINT "_products_v_blocks_privacy_local_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_privacy_local"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_privacy_cloud" ADD CONSTRAINT "_products_v_blocks_privacy_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_privacy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_privacy_cloud_locales" ADD CONSTRAINT "_products_v_blocks_privacy_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_privacy_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_privacy" ADD CONSTRAINT "_products_v_blocks_privacy_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_privacy_locales" ADD CONSTRAINT "_products_v_blocks_privacy_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_privacy"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_requirements_rows" ADD CONSTRAINT "_products_v_blocks_requirements_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_requirements_rows_locales" ADD CONSTRAINT "_products_v_blocks_requirements_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_requirements_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_requirements" ADD CONSTRAINT "_products_v_blocks_requirements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_requirements_locales" ADD CONSTRAINT "_products_v_blocks_requirements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_requirements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_download" ADD CONSTRAINT "_products_v_blocks_download_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_download_locales" ADD CONSTRAINT "_products_v_blocks_download_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_download"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_changelog_preview" ADD CONSTRAINT "_products_v_blocks_changelog_preview_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_changelog_preview_locales" ADD CONSTRAINT "_products_v_blocks_changelog_preview_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_changelog_preview"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_faq" ADD CONSTRAINT "_products_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_faq_locales" ADD CONSTRAINT "_products_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_testimonials" ADD CONSTRAINT "_products_v_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_testimonials_locales" ADD CONSTRAINT "_products_v_blocks_testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_comparison_columns" ADD CONSTRAINT "_products_v_blocks_comparison_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_comparison_columns_locales" ADD CONSTRAINT "_products_v_blocks_comparison_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_comparison_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_comparison_rows_cells" ADD CONSTRAINT "_products_v_blocks_comparison_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_comparison_rows_cells_locales" ADD CONSTRAINT "_products_v_blocks_comparison_rows_cells_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_comparison_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_comparison_rows" ADD CONSTRAINT "_products_v_blocks_comparison_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_comparison_rows_locales" ADD CONSTRAINT "_products_v_blocks_comparison_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_comparison_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_comparison" ADD CONSTRAINT "_products_v_blocks_comparison_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_comparison_locales" ADD CONSTRAINT "_products_v_blocks_comparison_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_comparison"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_cta_band" ADD CONSTRAINT "_products_v_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_cta_band_locales" ADD CONSTRAINT "_products_v_blocks_cta_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_rich_text" ADD CONSTRAINT "_products_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_rich_text_locales" ADD CONSTRAINT "_products_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_stat_strip_stats" ADD CONSTRAINT "_products_v_blocks_stat_strip_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_stat_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_stat_strip_stats_locales" ADD CONSTRAINT "_products_v_blocks_stat_strip_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_stat_strip_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_stat_strip" ADD CONSTRAINT "_products_v_blocks_stat_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_embed" ADD CONSTRAINT "_products_v_blocks_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_embed_locales" ADD CONSTRAINT "_products_v_blocks_embed_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_embed"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_secondary_links" ADD CONSTRAINT "_products_v_version_secondary_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_secondary_links_locales" ADD CONSTRAINT "_products_v_version_secondary_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_secondary_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_logo_id_media_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_icon_id_media_id_fk" FOREIGN KEY ("version_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_hero_media_id_media_id_fk" FOREIGN KEY ("version_hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_card_preview_id_media_id_fk" FOREIGN KEY ("version_card_preview_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_primary_button_plan_id_plans_id_fk" FOREIGN KEY ("version_primary_button_plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_secondary_button_plan_id_plans_id_fk" FOREIGN KEY ("version_secondary_button_plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_locales" ADD CONSTRAINT "_products_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_locales" ADD CONSTRAINT "_products_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "plans_features" ADD CONSTRAINT "plans_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "plans_features_locales" ADD CONSTRAINT "plans_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."plans_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "plans" ADD CONSTRAINT "plans_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "plans_locales" ADD CONSTRAINT "plans_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases" ADD CONSTRAINT "releases_installer_id_installers_id_fk" FOREIGN KEY ("installer_id") REFERENCES "public"."installers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "releases_locales" ADD CONSTRAINT "releases_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_parent_id_releases_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."releases"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_product_id_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v" ADD CONSTRAINT "_releases_v_version_installer_id_installers_id_fk" FOREIGN KEY ("version_installer_id") REFERENCES "public"."installers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_releases_v_locales" ADD CONSTRAINT "_releases_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_releases_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "installers" ADD CONSTRAINT "installers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "docs" ADD CONSTRAINT "docs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "docs" ADD CONSTRAINT "docs_parent_id_docs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."docs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "docs_locales" ADD CONSTRAINT "docs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_docs_v" ADD CONSTRAINT "_docs_v_parent_id_docs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."docs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_docs_v" ADD CONSTRAINT "_docs_v_version_product_id_products_id_fk" FOREIGN KEY ("version_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_docs_v" ADD CONSTRAINT "_docs_v_version_parent_id_docs_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."docs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_docs_v_locales" ADD CONSTRAINT "_docs_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_docs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "changelog" ADD CONSTRAINT "changelog_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "changelog_locales" ADD CONSTRAINT "changelog_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."changelog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_handled_by_id_users_id_fk" FOREIGN KEY ("handled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "redirects_rels" ADD CONSTRAINT "redirects_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_services_fk" FOREIGN KEY ("services_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_jobs_fk" FOREIGN KEY ("jobs_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_pages_fk" FOREIGN KEY ("legal_pages_id") REFERENCES "public"."legal_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_plans_fk" FOREIGN KEY ("plans_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_releases_fk" FOREIGN KEY ("releases_id") REFERENCES "public"."releases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_installers_fk" FOREIGN KEY ("installers_id") REFERENCES "public"."installers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_docs_fk" FOREIGN KEY ("docs_id") REFERENCES "public"."docs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_changelog_fk" FOREIGN KEY ("changelog_id") REFERENCES "public"."changelog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_data_requests_fk" FOREIGN KEY ("data_requests_id") REFERENCES "public"."data_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_short_links_fk" FOREIGN KEY ("short_links_id") REFERENCES "public"."short_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_daily_stats_fk" FOREIGN KEY ("daily_stats_id") REFERENCES "public"."daily_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_socials" ADD CONSTRAINT "site_settings_socials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_seo_image_id_media_id_fk" FOREIGN KEY ("default_seo_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_header" ADD CONSTRAINT "navigation_header_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_header_locales" ADD CONSTRAINT "navigation_header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_links" ADD CONSTRAINT "navigation_footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_links_locales" ADD CONSTRAINT "navigation_footer_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_footer_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer" ADD CONSTRAINT "navigation_footer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_footer_locales" ADD CONSTRAINT "navigation_footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_footer"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_chips_order_idx" ON "pages_blocks_hero_chips" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_chips_parent_id_idx" ON "pages_blocks_hero_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_hero_chips_locales_locale_parent_id_unique" ON "pages_blocks_hero_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_hero_locales_locale_parent_id_unique" ON "pages_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_product_showcase_order_idx" ON "pages_blocks_product_showcase" USING btree ("_order");
  CREATE INDEX "pages_blocks_product_showcase_parent_id_idx" ON "pages_blocks_product_showcase" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_product_showcase_path_idx" ON "pages_blocks_product_showcase" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_product_showcase_locales_locale_parent_id_uniqu" ON "pages_blocks_product_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_services_overview_order_idx" ON "pages_blocks_services_overview" USING btree ("_order");
  CREATE INDEX "pages_blocks_services_overview_parent_id_idx" ON "pages_blocks_services_overview" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_services_overview_path_idx" ON "pages_blocks_services_overview" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_services_overview_locales_locale_parent_id_uniq" ON "pages_blocks_services_overview_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_principles_items_order_idx" ON "pages_blocks_principles_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_principles_items_parent_id_idx" ON "pages_blocks_principles_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_principles_items_locales_locale_parent_id_uniqu" ON "pages_blocks_principles_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_principles_order_idx" ON "pages_blocks_principles" USING btree ("_order");
  CREATE INDEX "pages_blocks_principles_parent_id_idx" ON "pages_blocks_principles" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_principles_path_idx" ON "pages_blocks_principles" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_principles_locales_locale_parent_id_unique" ON "pages_blocks_principles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_proof_stats_order_idx" ON "pages_blocks_proof_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_proof_stats_parent_id_idx" ON "pages_blocks_proof_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_proof_stats_locales_locale_parent_id_unique" ON "pages_blocks_proof_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_proof_order_idx" ON "pages_blocks_proof" USING btree ("_order");
  CREATE INDEX "pages_blocks_proof_parent_id_idx" ON "pages_blocks_proof" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_proof_path_idx" ON "pages_blocks_proof" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_proof_locales_locale_parent_id_unique" ON "pages_blocks_proof_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_process_steps_order_idx" ON "pages_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_process_steps_parent_id_idx" ON "pages_blocks_process_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_process_steps_locales_locale_parent_id_unique" ON "pages_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_process_order_idx" ON "pages_blocks_process" USING btree ("_order");
  CREATE INDEX "pages_blocks_process_parent_id_idx" ON "pages_blocks_process" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_process_path_idx" ON "pages_blocks_process" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_process_locales_locale_parent_id_unique" ON "pages_blocks_process_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_latest_order_idx" ON "pages_blocks_latest" USING btree ("_order");
  CREATE INDEX "pages_blocks_latest_parent_id_idx" ON "pages_blocks_latest" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_latest_path_idx" ON "pages_blocks_latest" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_latest_locales_locale_parent_id_unique" ON "pages_blocks_latest_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_cta_order_idx" ON "pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "pages_blocks_cta_parent_id_idx" ON "pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_cta_path_idx" ON "pages_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_cta_locales_locale_parent_id_unique" ON "pages_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_rich_text_locales_locale_parent_id_unique" ON "pages_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_timeline_items_order_idx" ON "pages_blocks_timeline_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_timeline_items_parent_id_idx" ON "pages_blocks_timeline_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_timeline_items_locales_locale_parent_id_unique" ON "pages_blocks_timeline_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_timeline_order_idx" ON "pages_blocks_timeline" USING btree ("_order");
  CREATE INDEX "pages_blocks_timeline_parent_id_idx" ON "pages_blocks_timeline" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_timeline_path_idx" ON "pages_blocks_timeline" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_timeline_locales_locale_parent_id_unique" ON "pages_blocks_timeline_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_team_order_idx" ON "pages_blocks_team" USING btree ("_order");
  CREATE INDEX "pages_blocks_team_parent_id_idx" ON "pages_blocks_team" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_team_path_idx" ON "pages_blocks_team" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_team_locales_locale_parent_id_unique" ON "pages_blocks_team_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_company_facts_order_idx" ON "pages_blocks_company_facts" USING btree ("_order");
  CREATE INDEX "pages_blocks_company_facts_parent_id_idx" ON "pages_blocks_company_facts" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_company_facts_path_idx" ON "pages_blocks_company_facts" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_company_facts_locales_locale_parent_id_unique" ON "pages_blocks_company_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_hi_status_idx" ON "pages" USING btree ("hi_status");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_products_id_idx" ON "pages_rels" USING btree ("products_id");
  CREATE INDEX "pages_rels_services_id_idx" ON "pages_rels" USING btree ("services_id");
  CREATE INDEX "pages_rels_testimonials_id_idx" ON "pages_rels" USING btree ("testimonials_id");
  CREATE INDEX "pages_rels_team_id_idx" ON "pages_rels" USING btree ("team_id");
  CREATE INDEX "pages_rels_faqs_id_idx" ON "pages_rels" USING btree ("faqs_id");
  CREATE INDEX "_pages_v_blocks_hero_chips_order_idx" ON "_pages_v_blocks_hero_chips" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_chips_parent_id_idx" ON "_pages_v_blocks_hero_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_chips_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_product_showcase_order_idx" ON "_pages_v_blocks_product_showcase" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_product_showcase_parent_id_idx" ON "_pages_v_blocks_product_showcase" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_product_showcase_path_idx" ON "_pages_v_blocks_product_showcase" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_product_showcase_locales_locale_parent_id_un" ON "_pages_v_blocks_product_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_services_overview_order_idx" ON "_pages_v_blocks_services_overview" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_services_overview_parent_id_idx" ON "_pages_v_blocks_services_overview" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_services_overview_path_idx" ON "_pages_v_blocks_services_overview" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_services_overview_locales_locale_parent_id_u" ON "_pages_v_blocks_services_overview_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_principles_items_order_idx" ON "_pages_v_blocks_principles_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_principles_items_parent_id_idx" ON "_pages_v_blocks_principles_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_principles_items_locales_locale_parent_id_un" ON "_pages_v_blocks_principles_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_principles_order_idx" ON "_pages_v_blocks_principles" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_principles_parent_id_idx" ON "_pages_v_blocks_principles" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_principles_path_idx" ON "_pages_v_blocks_principles" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_principles_locales_locale_parent_id_unique" ON "_pages_v_blocks_principles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_proof_stats_order_idx" ON "_pages_v_blocks_proof_stats" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_proof_stats_parent_id_idx" ON "_pages_v_blocks_proof_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_proof_stats_locales_locale_parent_id_unique" ON "_pages_v_blocks_proof_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_proof_order_idx" ON "_pages_v_blocks_proof" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_proof_parent_id_idx" ON "_pages_v_blocks_proof" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_proof_path_idx" ON "_pages_v_blocks_proof" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_proof_locales_locale_parent_id_unique" ON "_pages_v_blocks_proof_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_process_steps_order_idx" ON "_pages_v_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_process_steps_parent_id_idx" ON "_pages_v_blocks_process_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_process_steps_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_process_order_idx" ON "_pages_v_blocks_process" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_process_parent_id_idx" ON "_pages_v_blocks_process" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_process_path_idx" ON "_pages_v_blocks_process" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_process_locales_locale_parent_id_unique" ON "_pages_v_blocks_process_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_latest_order_idx" ON "_pages_v_blocks_latest" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_latest_parent_id_idx" ON "_pages_v_blocks_latest" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_latest_path_idx" ON "_pages_v_blocks_latest" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_latest_locales_locale_parent_id_unique" ON "_pages_v_blocks_latest_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_order_idx" ON "_pages_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_cta_parent_id_idx" ON "_pages_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_cta_path_idx" ON "_pages_v_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_cta_locales_locale_parent_id_unique" ON "_pages_v_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_rich_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_timeline_items_order_idx" ON "_pages_v_blocks_timeline_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_timeline_items_parent_id_idx" ON "_pages_v_blocks_timeline_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_timeline_items_locales_locale_parent_id_uniq" ON "_pages_v_blocks_timeline_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_timeline_order_idx" ON "_pages_v_blocks_timeline" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_timeline_parent_id_idx" ON "_pages_v_blocks_timeline" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_timeline_path_idx" ON "_pages_v_blocks_timeline" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_timeline_locales_locale_parent_id_unique" ON "_pages_v_blocks_timeline_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_team_order_idx" ON "_pages_v_blocks_team" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_team_parent_id_idx" ON "_pages_v_blocks_team" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_team_path_idx" ON "_pages_v_blocks_team" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_team_locales_locale_parent_id_unique" ON "_pages_v_blocks_team_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_company_facts_order_idx" ON "_pages_v_blocks_company_facts" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_company_facts_parent_id_idx" ON "_pages_v_blocks_company_facts" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_company_facts_path_idx" ON "_pages_v_blocks_company_facts" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_company_facts_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_company_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_version_hi_status_idx" ON "_pages_v" USING btree ("version_hi_status");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_products_id_idx" ON "_pages_v_rels" USING btree ("products_id");
  CREATE INDEX "_pages_v_rels_services_id_idx" ON "_pages_v_rels" USING btree ("services_id");
  CREATE INDEX "_pages_v_rels_testimonials_id_idx" ON "_pages_v_rels" USING btree ("testimonials_id");
  CREATE INDEX "_pages_v_rels_team_id_idx" ON "_pages_v_rels" USING btree ("team_id");
  CREATE INDEX "_pages_v_rels_faqs_id_idx" ON "_pages_v_rels" USING btree ("faqs_id");
  CREATE INDEX "posts_cover_idx" ON "posts" USING btree ("cover_id");
  CREATE INDEX "posts_author_idx" ON "posts" USING btree ("author_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_published_at_idx" ON "posts" USING btree ("published_at");
  CREATE INDEX "posts_hi_status_idx" ON "posts" USING btree ("hi_status");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE INDEX "posts_meta_meta_image_idx" ON "posts_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "posts_locales_locale_parent_id_unique" ON "posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_texts_order_parent" ON "posts_texts" USING btree ("order","parent_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_cover_idx" ON "_posts_v" USING btree ("version_cover_id");
  CREATE INDEX "_posts_v_version_version_author_idx" ON "_posts_v" USING btree ("version_author_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_published_at_idx" ON "_posts_v" USING btree ("version_published_at");
  CREATE INDEX "_posts_v_version_version_hi_status_idx" ON "_posts_v" USING btree ("version_hi_status");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_snapshot_idx" ON "_posts_v" USING btree ("snapshot");
  CREATE INDEX "_posts_v_published_locale_idx" ON "_posts_v" USING btree ("published_locale");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE INDEX "_posts_v_version_meta_version_meta_image_idx" ON "_posts_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_posts_v_locales_locale_parent_id_unique" ON "_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_texts_order_parent" ON "_posts_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "services_capabilities_order_idx" ON "services_capabilities" USING btree ("_order");
  CREATE INDEX "services_capabilities_parent_id_idx" ON "services_capabilities" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "services_capabilities_locales_locale_parent_id_unique" ON "services_capabilities_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_deliverables_order_idx" ON "services_deliverables" USING btree ("_order");
  CREATE INDEX "services_deliverables_parent_id_idx" ON "services_deliverables" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "services_deliverables_locales_locale_parent_id_unique" ON "services_deliverables_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_hero_chips_order_idx" ON "services_blocks_hero_chips" USING btree ("_order");
  CREATE INDEX "services_blocks_hero_chips_parent_id_idx" ON "services_blocks_hero_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "services_blocks_hero_chips_locales_locale_parent_id_unique" ON "services_blocks_hero_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_hero_order_idx" ON "services_blocks_hero" USING btree ("_order");
  CREATE INDEX "services_blocks_hero_parent_id_idx" ON "services_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_hero_path_idx" ON "services_blocks_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_hero_locales_locale_parent_id_unique" ON "services_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_product_showcase_order_idx" ON "services_blocks_product_showcase" USING btree ("_order");
  CREATE INDEX "services_blocks_product_showcase_parent_id_idx" ON "services_blocks_product_showcase" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_product_showcase_path_idx" ON "services_blocks_product_showcase" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_product_showcase_locales_locale_parent_id_un" ON "services_blocks_product_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_services_overview_order_idx" ON "services_blocks_services_overview" USING btree ("_order");
  CREATE INDEX "services_blocks_services_overview_parent_id_idx" ON "services_blocks_services_overview" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_services_overview_path_idx" ON "services_blocks_services_overview" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_services_overview_locales_locale_parent_id_u" ON "services_blocks_services_overview_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_principles_items_order_idx" ON "services_blocks_principles_items" USING btree ("_order");
  CREATE INDEX "services_blocks_principles_items_parent_id_idx" ON "services_blocks_principles_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "services_blocks_principles_items_locales_locale_parent_id_un" ON "services_blocks_principles_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_principles_order_idx" ON "services_blocks_principles" USING btree ("_order");
  CREATE INDEX "services_blocks_principles_parent_id_idx" ON "services_blocks_principles" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_principles_path_idx" ON "services_blocks_principles" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_principles_locales_locale_parent_id_unique" ON "services_blocks_principles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_proof_stats_order_idx" ON "services_blocks_proof_stats" USING btree ("_order");
  CREATE INDEX "services_blocks_proof_stats_parent_id_idx" ON "services_blocks_proof_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "services_blocks_proof_stats_locales_locale_parent_id_unique" ON "services_blocks_proof_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_proof_order_idx" ON "services_blocks_proof" USING btree ("_order");
  CREATE INDEX "services_blocks_proof_parent_id_idx" ON "services_blocks_proof" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_proof_path_idx" ON "services_blocks_proof" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_proof_locales_locale_parent_id_unique" ON "services_blocks_proof_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_process_steps_order_idx" ON "services_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "services_blocks_process_steps_parent_id_idx" ON "services_blocks_process_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "services_blocks_process_steps_locales_locale_parent_id_uniqu" ON "services_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_process_order_idx" ON "services_blocks_process" USING btree ("_order");
  CREATE INDEX "services_blocks_process_parent_id_idx" ON "services_blocks_process" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_process_path_idx" ON "services_blocks_process" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_process_locales_locale_parent_id_unique" ON "services_blocks_process_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_latest_order_idx" ON "services_blocks_latest" USING btree ("_order");
  CREATE INDEX "services_blocks_latest_parent_id_idx" ON "services_blocks_latest" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_latest_path_idx" ON "services_blocks_latest" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_latest_locales_locale_parent_id_unique" ON "services_blocks_latest_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_cta_order_idx" ON "services_blocks_cta" USING btree ("_order");
  CREATE INDEX "services_blocks_cta_parent_id_idx" ON "services_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_cta_path_idx" ON "services_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_cta_locales_locale_parent_id_unique" ON "services_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_rich_text_order_idx" ON "services_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "services_blocks_rich_text_parent_id_idx" ON "services_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_rich_text_path_idx" ON "services_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_rich_text_locales_locale_parent_id_unique" ON "services_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_timeline_items_order_idx" ON "services_blocks_timeline_items" USING btree ("_order");
  CREATE INDEX "services_blocks_timeline_items_parent_id_idx" ON "services_blocks_timeline_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "services_blocks_timeline_items_locales_locale_parent_id_uniq" ON "services_blocks_timeline_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_timeline_order_idx" ON "services_blocks_timeline" USING btree ("_order");
  CREATE INDEX "services_blocks_timeline_parent_id_idx" ON "services_blocks_timeline" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_timeline_path_idx" ON "services_blocks_timeline" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_timeline_locales_locale_parent_id_unique" ON "services_blocks_timeline_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_team_order_idx" ON "services_blocks_team" USING btree ("_order");
  CREATE INDEX "services_blocks_team_parent_id_idx" ON "services_blocks_team" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_team_path_idx" ON "services_blocks_team" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_team_locales_locale_parent_id_unique" ON "services_blocks_team_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_company_facts_order_idx" ON "services_blocks_company_facts" USING btree ("_order");
  CREATE INDEX "services_blocks_company_facts_parent_id_idx" ON "services_blocks_company_facts" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_company_facts_path_idx" ON "services_blocks_company_facts" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_company_facts_locales_locale_parent_id_uniqu" ON "services_blocks_company_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_blocks_faq_order_idx" ON "services_blocks_faq" USING btree ("_order");
  CREATE INDEX "services_blocks_faq_parent_id_idx" ON "services_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "services_blocks_faq_path_idx" ON "services_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "services_blocks_faq_locales_locale_parent_id_unique" ON "services_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "services_slug_idx" ON "services" USING btree ("slug");
  CREATE INDEX "services_hi_status_idx" ON "services" USING btree ("hi_status");
  CREATE INDEX "services_updated_at_idx" ON "services" USING btree ("updated_at");
  CREATE INDEX "services_created_at_idx" ON "services" USING btree ("created_at");
  CREATE INDEX "services__status_idx" ON "services" USING btree ("_status");
  CREATE INDEX "services_meta_meta_image_idx" ON "services_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "services_locales_locale_parent_id_unique" ON "services_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "services_rels_order_idx" ON "services_rels" USING btree ("order");
  CREATE INDEX "services_rels_parent_idx" ON "services_rels" USING btree ("parent_id");
  CREATE INDEX "services_rels_path_idx" ON "services_rels" USING btree ("path");
  CREATE INDEX "services_rels_products_id_idx" ON "services_rels" USING btree ("products_id");
  CREATE INDEX "services_rels_services_id_idx" ON "services_rels" USING btree ("services_id");
  CREATE INDEX "services_rels_testimonials_id_idx" ON "services_rels" USING btree ("testimonials_id");
  CREATE INDEX "services_rels_team_id_idx" ON "services_rels" USING btree ("team_id");
  CREATE INDEX "services_rels_faqs_id_idx" ON "services_rels" USING btree ("faqs_id");
  CREATE INDEX "_services_v_version_capabilities_order_idx" ON "_services_v_version_capabilities" USING btree ("_order");
  CREATE INDEX "_services_v_version_capabilities_parent_id_idx" ON "_services_v_version_capabilities" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_services_v_version_capabilities_locales_locale_parent_id_un" ON "_services_v_version_capabilities_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_version_deliverables_order_idx" ON "_services_v_version_deliverables" USING btree ("_order");
  CREATE INDEX "_services_v_version_deliverables_parent_id_idx" ON "_services_v_version_deliverables" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_services_v_version_deliverables_locales_locale_parent_id_un" ON "_services_v_version_deliverables_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_hero_chips_order_idx" ON "_services_v_blocks_hero_chips" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_hero_chips_parent_id_idx" ON "_services_v_blocks_hero_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_services_v_blocks_hero_chips_locales_locale_parent_id_uniqu" ON "_services_v_blocks_hero_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_hero_order_idx" ON "_services_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_hero_parent_id_idx" ON "_services_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_hero_path_idx" ON "_services_v_blocks_hero" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_hero_locales_locale_parent_id_unique" ON "_services_v_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_product_showcase_order_idx" ON "_services_v_blocks_product_showcase" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_product_showcase_parent_id_idx" ON "_services_v_blocks_product_showcase" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_product_showcase_path_idx" ON "_services_v_blocks_product_showcase" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_product_showcase_locales_locale_parent_id" ON "_services_v_blocks_product_showcase_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_services_overview_order_idx" ON "_services_v_blocks_services_overview" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_services_overview_parent_id_idx" ON "_services_v_blocks_services_overview" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_services_overview_path_idx" ON "_services_v_blocks_services_overview" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_services_overview_locales_locale_parent_i" ON "_services_v_blocks_services_overview_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_principles_items_order_idx" ON "_services_v_blocks_principles_items" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_principles_items_parent_id_idx" ON "_services_v_blocks_principles_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_services_v_blocks_principles_items_locales_locale_parent_id" ON "_services_v_blocks_principles_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_principles_order_idx" ON "_services_v_blocks_principles" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_principles_parent_id_idx" ON "_services_v_blocks_principles" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_principles_path_idx" ON "_services_v_blocks_principles" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_principles_locales_locale_parent_id_uniqu" ON "_services_v_blocks_principles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_proof_stats_order_idx" ON "_services_v_blocks_proof_stats" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_proof_stats_parent_id_idx" ON "_services_v_blocks_proof_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_services_v_blocks_proof_stats_locales_locale_parent_id_uniq" ON "_services_v_blocks_proof_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_proof_order_idx" ON "_services_v_blocks_proof" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_proof_parent_id_idx" ON "_services_v_blocks_proof" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_proof_path_idx" ON "_services_v_blocks_proof" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_proof_locales_locale_parent_id_unique" ON "_services_v_blocks_proof_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_process_steps_order_idx" ON "_services_v_blocks_process_steps" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_process_steps_parent_id_idx" ON "_services_v_blocks_process_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_services_v_blocks_process_steps_locales_locale_parent_id_un" ON "_services_v_blocks_process_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_process_order_idx" ON "_services_v_blocks_process" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_process_parent_id_idx" ON "_services_v_blocks_process" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_process_path_idx" ON "_services_v_blocks_process" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_process_locales_locale_parent_id_unique" ON "_services_v_blocks_process_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_latest_order_idx" ON "_services_v_blocks_latest" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_latest_parent_id_idx" ON "_services_v_blocks_latest" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_latest_path_idx" ON "_services_v_blocks_latest" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_latest_locales_locale_parent_id_unique" ON "_services_v_blocks_latest_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_cta_order_idx" ON "_services_v_blocks_cta" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_cta_parent_id_idx" ON "_services_v_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_cta_path_idx" ON "_services_v_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_cta_locales_locale_parent_id_unique" ON "_services_v_blocks_cta_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_rich_text_order_idx" ON "_services_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_rich_text_parent_id_idx" ON "_services_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_rich_text_path_idx" ON "_services_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_rich_text_locales_locale_parent_id_unique" ON "_services_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_timeline_items_order_idx" ON "_services_v_blocks_timeline_items" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_timeline_items_parent_id_idx" ON "_services_v_blocks_timeline_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_services_v_blocks_timeline_items_locales_locale_parent_id_u" ON "_services_v_blocks_timeline_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_timeline_order_idx" ON "_services_v_blocks_timeline" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_timeline_parent_id_idx" ON "_services_v_blocks_timeline" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_timeline_path_idx" ON "_services_v_blocks_timeline" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_timeline_locales_locale_parent_id_unique" ON "_services_v_blocks_timeline_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_team_order_idx" ON "_services_v_blocks_team" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_team_parent_id_idx" ON "_services_v_blocks_team" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_team_path_idx" ON "_services_v_blocks_team" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_team_locales_locale_parent_id_unique" ON "_services_v_blocks_team_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_company_facts_order_idx" ON "_services_v_blocks_company_facts" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_company_facts_parent_id_idx" ON "_services_v_blocks_company_facts" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_company_facts_path_idx" ON "_services_v_blocks_company_facts" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_company_facts_locales_locale_parent_id_un" ON "_services_v_blocks_company_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_blocks_faq_order_idx" ON "_services_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_services_v_blocks_faq_parent_id_idx" ON "_services_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_services_v_blocks_faq_path_idx" ON "_services_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_services_v_blocks_faq_locales_locale_parent_id_unique" ON "_services_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_parent_idx" ON "_services_v" USING btree ("parent_id");
  CREATE INDEX "_services_v_version_version_slug_idx" ON "_services_v" USING btree ("version_slug");
  CREATE INDEX "_services_v_version_version_hi_status_idx" ON "_services_v" USING btree ("version_hi_status");
  CREATE INDEX "_services_v_version_version_updated_at_idx" ON "_services_v" USING btree ("version_updated_at");
  CREATE INDEX "_services_v_version_version_created_at_idx" ON "_services_v" USING btree ("version_created_at");
  CREATE INDEX "_services_v_version_version__status_idx" ON "_services_v" USING btree ("version__status");
  CREATE INDEX "_services_v_created_at_idx" ON "_services_v" USING btree ("created_at");
  CREATE INDEX "_services_v_updated_at_idx" ON "_services_v" USING btree ("updated_at");
  CREATE INDEX "_services_v_snapshot_idx" ON "_services_v" USING btree ("snapshot");
  CREATE INDEX "_services_v_published_locale_idx" ON "_services_v" USING btree ("published_locale");
  CREATE INDEX "_services_v_latest_idx" ON "_services_v" USING btree ("latest");
  CREATE INDEX "_services_v_version_meta_version_meta_image_idx" ON "_services_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_services_v_locales_locale_parent_id_unique" ON "_services_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_services_v_rels_order_idx" ON "_services_v_rels" USING btree ("order");
  CREATE INDEX "_services_v_rels_parent_idx" ON "_services_v_rels" USING btree ("parent_id");
  CREATE INDEX "_services_v_rels_path_idx" ON "_services_v_rels" USING btree ("path");
  CREATE INDEX "_services_v_rels_products_id_idx" ON "_services_v_rels" USING btree ("products_id");
  CREATE INDEX "_services_v_rels_services_id_idx" ON "_services_v_rels" USING btree ("services_id");
  CREATE INDEX "_services_v_rels_testimonials_id_idx" ON "_services_v_rels" USING btree ("testimonials_id");
  CREATE INDEX "_services_v_rels_team_id_idx" ON "_services_v_rels" USING btree ("team_id");
  CREATE INDEX "_services_v_rels_faqs_id_idx" ON "_services_v_rels" USING btree ("faqs_id");
  CREATE INDEX "faqs_product_idx" ON "faqs" USING btree ("product_id");
  CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "faqs" USING btree ("created_at");
  CREATE UNIQUE INDEX "faqs_locales_locale_parent_id_unique" ON "faqs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "testimonials_product_idx" ON "testimonials" USING btree ("product_id");
  CREATE INDEX "testimonials_avatar_idx" ON "testimonials" USING btree ("avatar_id");
  CREATE INDEX "testimonials_updated_at_idx" ON "testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "testimonials" USING btree ("created_at");
  CREATE INDEX "testimonials__status_idx" ON "testimonials" USING btree ("_status");
  CREATE UNIQUE INDEX "testimonials_locales_locale_parent_id_unique" ON "testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_testimonials_v_parent_idx" ON "_testimonials_v" USING btree ("parent_id");
  CREATE INDEX "_testimonials_v_version_version_product_idx" ON "_testimonials_v" USING btree ("version_product_id");
  CREATE INDEX "_testimonials_v_version_version_avatar_idx" ON "_testimonials_v" USING btree ("version_avatar_id");
  CREATE INDEX "_testimonials_v_version_version_updated_at_idx" ON "_testimonials_v" USING btree ("version_updated_at");
  CREATE INDEX "_testimonials_v_version_version_created_at_idx" ON "_testimonials_v" USING btree ("version_created_at");
  CREATE INDEX "_testimonials_v_version_version__status_idx" ON "_testimonials_v" USING btree ("version__status");
  CREATE INDEX "_testimonials_v_created_at_idx" ON "_testimonials_v" USING btree ("created_at");
  CREATE INDEX "_testimonials_v_updated_at_idx" ON "_testimonials_v" USING btree ("updated_at");
  CREATE INDEX "_testimonials_v_snapshot_idx" ON "_testimonials_v" USING btree ("snapshot");
  CREATE INDEX "_testimonials_v_published_locale_idx" ON "_testimonials_v" USING btree ("published_locale");
  CREATE INDEX "_testimonials_v_latest_idx" ON "_testimonials_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_testimonials_v_locales_locale_parent_id_unique" ON "_testimonials_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "team_links_order_idx" ON "team_links" USING btree ("_order");
  CREATE INDEX "team_links_parent_id_idx" ON "team_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "team_links_locales_locale_parent_id_unique" ON "team_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "team_photo_idx" ON "team" USING btree ("photo_id");
  CREATE INDEX "team_updated_at_idx" ON "team" USING btree ("updated_at");
  CREATE INDEX "team_created_at_idx" ON "team" USING btree ("created_at");
  CREATE UNIQUE INDEX "team_locales_locale_parent_id_unique" ON "team_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "jobs_slug_idx" ON "jobs" USING btree ("slug");
  CREATE INDEX "jobs_hi_status_idx" ON "jobs" USING btree ("hi_status");
  CREATE INDEX "jobs_updated_at_idx" ON "jobs" USING btree ("updated_at");
  CREATE INDEX "jobs_created_at_idx" ON "jobs" USING btree ("created_at");
  CREATE INDEX "jobs__status_idx" ON "jobs" USING btree ("_status");
  CREATE UNIQUE INDEX "jobs_locales_locale_parent_id_unique" ON "jobs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_jobs_v_parent_idx" ON "_jobs_v" USING btree ("parent_id");
  CREATE INDEX "_jobs_v_version_version_slug_idx" ON "_jobs_v" USING btree ("version_slug");
  CREATE INDEX "_jobs_v_version_version_hi_status_idx" ON "_jobs_v" USING btree ("version_hi_status");
  CREATE INDEX "_jobs_v_version_version_updated_at_idx" ON "_jobs_v" USING btree ("version_updated_at");
  CREATE INDEX "_jobs_v_version_version_created_at_idx" ON "_jobs_v" USING btree ("version_created_at");
  CREATE INDEX "_jobs_v_version_version__status_idx" ON "_jobs_v" USING btree ("version__status");
  CREATE INDEX "_jobs_v_created_at_idx" ON "_jobs_v" USING btree ("created_at");
  CREATE INDEX "_jobs_v_updated_at_idx" ON "_jobs_v" USING btree ("updated_at");
  CREATE INDEX "_jobs_v_snapshot_idx" ON "_jobs_v" USING btree ("snapshot");
  CREATE INDEX "_jobs_v_published_locale_idx" ON "_jobs_v" USING btree ("published_locale");
  CREATE INDEX "_jobs_v_latest_idx" ON "_jobs_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_jobs_v_locales_locale_parent_id_unique" ON "_jobs_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "legal_pages_slug_idx" ON "legal_pages" USING btree ("slug");
  CREATE INDEX "legal_pages_hi_status_idx" ON "legal_pages" USING btree ("hi_status");
  CREATE INDEX "legal_pages_updated_at_idx" ON "legal_pages" USING btree ("updated_at");
  CREATE INDEX "legal_pages_created_at_idx" ON "legal_pages" USING btree ("created_at");
  CREATE INDEX "legal_pages__status_idx" ON "legal_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "legal_pages_locales_locale_parent_id_unique" ON "legal_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_legal_pages_v_parent_idx" ON "_legal_pages_v" USING btree ("parent_id");
  CREATE INDEX "_legal_pages_v_version_version_slug_idx" ON "_legal_pages_v" USING btree ("version_slug");
  CREATE INDEX "_legal_pages_v_version_version_hi_status_idx" ON "_legal_pages_v" USING btree ("version_hi_status");
  CREATE INDEX "_legal_pages_v_version_version_updated_at_idx" ON "_legal_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_legal_pages_v_version_version_created_at_idx" ON "_legal_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_legal_pages_v_version_version__status_idx" ON "_legal_pages_v" USING btree ("version__status");
  CREATE INDEX "_legal_pages_v_created_at_idx" ON "_legal_pages_v" USING btree ("created_at");
  CREATE INDEX "_legal_pages_v_updated_at_idx" ON "_legal_pages_v" USING btree ("updated_at");
  CREATE INDEX "_legal_pages_v_snapshot_idx" ON "_legal_pages_v" USING btree ("snapshot");
  CREATE INDEX "_legal_pages_v_published_locale_idx" ON "_legal_pages_v" USING btree ("published_locale");
  CREATE INDEX "_legal_pages_v_latest_idx" ON "_legal_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_legal_pages_v_locales_locale_parent_id_unique" ON "_legal_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_square_sizes_square_filename_idx" ON "media" USING btree ("sizes_square_filename");
  CREATE INDEX "media_sizes_small_sizes_small_filename_idx" ON "media" USING btree ("sizes_small_filename");
  CREATE INDEX "media_sizes_medium_sizes_medium_filename_idx" ON "media" USING btree ("sizes_medium_filename");
  CREATE INDEX "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  CREATE INDEX "media_sizes_xlarge_sizes_xlarge_filename_idx" ON "media" USING btree ("sizes_xlarge_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_platforms_order_idx" ON "products_platforms" USING btree ("order");
  CREATE INDEX "products_platforms_parent_idx" ON "products_platforms" USING btree ("parent_id");
  CREATE INDEX "products_blocks_product_hero_order_idx" ON "products_blocks_product_hero" USING btree ("_order");
  CREATE INDEX "products_blocks_product_hero_parent_id_idx" ON "products_blocks_product_hero" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_product_hero_path_idx" ON "products_blocks_product_hero" USING btree ("_path");
  CREATE INDEX "products_blocks_product_hero_media_idx" ON "products_blocks_product_hero" USING btree ("media_id");
  CREATE UNIQUE INDEX "products_blocks_product_hero_locales_locale_parent_id_unique" ON "products_blocks_product_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_problem_solution_points_order_idx" ON "products_blocks_problem_solution_points" USING btree ("_order");
  CREATE INDEX "products_blocks_problem_solution_points_parent_id_idx" ON "products_blocks_problem_solution_points" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_problem_solution_points_locales_locale_paren" ON "products_blocks_problem_solution_points_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_problem_solution_order_idx" ON "products_blocks_problem_solution" USING btree ("_order");
  CREATE INDEX "products_blocks_problem_solution_parent_id_idx" ON "products_blocks_problem_solution" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_problem_solution_path_idx" ON "products_blocks_problem_solution" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_problem_solution_locales_locale_parent_id_un" ON "products_blocks_problem_solution_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_feature_scroller_items_order_idx" ON "products_blocks_feature_scroller_items" USING btree ("_order");
  CREATE INDEX "products_blocks_feature_scroller_items_parent_id_idx" ON "products_blocks_feature_scroller_items" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_feature_scroller_items_media_idx" ON "products_blocks_feature_scroller_items" USING btree ("media_id");
  CREATE UNIQUE INDEX "products_blocks_feature_scroller_items_locales_locale_parent" ON "products_blocks_feature_scroller_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_feature_scroller_order_idx" ON "products_blocks_feature_scroller" USING btree ("_order");
  CREATE INDEX "products_blocks_feature_scroller_parent_id_idx" ON "products_blocks_feature_scroller" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_feature_scroller_path_idx" ON "products_blocks_feature_scroller" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_feature_scroller_locales_locale_parent_id_un" ON "products_blocks_feature_scroller_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_feature_grid_items_order_idx" ON "products_blocks_feature_grid_items" USING btree ("_order");
  CREATE INDEX "products_blocks_feature_grid_items_parent_id_idx" ON "products_blocks_feature_grid_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_feature_grid_items_locales_locale_parent_id_" ON "products_blocks_feature_grid_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_feature_grid_order_idx" ON "products_blocks_feature_grid" USING btree ("_order");
  CREATE INDEX "products_blocks_feature_grid_parent_id_idx" ON "products_blocks_feature_grid" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_feature_grid_path_idx" ON "products_blocks_feature_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_feature_grid_locales_locale_parent_id_unique" ON "products_blocks_feature_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_screenshots_images_order_idx" ON "products_blocks_screenshots_images" USING btree ("_order");
  CREATE INDEX "products_blocks_screenshots_images_parent_id_idx" ON "products_blocks_screenshots_images" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_screenshots_images_image_idx" ON "products_blocks_screenshots_images" USING btree ("image_id");
  CREATE UNIQUE INDEX "products_blocks_screenshots_images_locales_locale_parent_id_" ON "products_blocks_screenshots_images_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_screenshots_order_idx" ON "products_blocks_screenshots" USING btree ("_order");
  CREATE INDEX "products_blocks_screenshots_parent_id_idx" ON "products_blocks_screenshots" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_screenshots_path_idx" ON "products_blocks_screenshots" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_screenshots_locales_locale_parent_id_unique" ON "products_blocks_screenshots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_video_order_idx" ON "products_blocks_video" USING btree ("_order");
  CREATE INDEX "products_blocks_video_parent_id_idx" ON "products_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_video_path_idx" ON "products_blocks_video" USING btree ("_path");
  CREATE INDEX "products_blocks_video_video_idx" ON "products_blocks_video" USING btree ("video_id");
  CREATE INDEX "products_blocks_video_poster_idx" ON "products_blocks_video" USING btree ("poster_id");
  CREATE INDEX "products_blocks_video_captions_idx" ON "products_blocks_video" USING btree ("captions_id");
  CREATE UNIQUE INDEX "products_blocks_video_locales_locale_parent_id_unique" ON "products_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_how_it_works_steps_order_idx" ON "products_blocks_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "products_blocks_how_it_works_steps_parent_id_idx" ON "products_blocks_how_it_works_steps" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_how_it_works_steps_media_idx" ON "products_blocks_how_it_works_steps" USING btree ("media_id");
  CREATE UNIQUE INDEX "products_blocks_how_it_works_steps_locales_locale_parent_id_" ON "products_blocks_how_it_works_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_how_it_works_order_idx" ON "products_blocks_how_it_works" USING btree ("_order");
  CREATE INDEX "products_blocks_how_it_works_parent_id_idx" ON "products_blocks_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_how_it_works_path_idx" ON "products_blocks_how_it_works" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_how_it_works_locales_locale_parent_id_unique" ON "products_blocks_how_it_works_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_use_cases_items_order_idx" ON "products_blocks_use_cases_items" USING btree ("_order");
  CREATE INDEX "products_blocks_use_cases_items_parent_id_idx" ON "products_blocks_use_cases_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_use_cases_items_locales_locale_parent_id_uni" ON "products_blocks_use_cases_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_use_cases_order_idx" ON "products_blocks_use_cases" USING btree ("_order");
  CREATE INDEX "products_blocks_use_cases_parent_id_idx" ON "products_blocks_use_cases" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_use_cases_path_idx" ON "products_blocks_use_cases" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_use_cases_locales_locale_parent_id_unique" ON "products_blocks_use_cases_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_pricing_tiers_features_order_idx" ON "products_blocks_pricing_tiers_features" USING btree ("_order");
  CREATE INDEX "products_blocks_pricing_tiers_features_parent_id_idx" ON "products_blocks_pricing_tiers_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_pricing_tiers_features_locales_locale_parent" ON "products_blocks_pricing_tiers_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_pricing_tiers_order_idx" ON "products_blocks_pricing_tiers" USING btree ("_order");
  CREATE INDEX "products_blocks_pricing_tiers_parent_id_idx" ON "products_blocks_pricing_tiers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_pricing_tiers_locales_locale_parent_id_uniqu" ON "products_blocks_pricing_tiers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_pricing_order_idx" ON "products_blocks_pricing" USING btree ("_order");
  CREATE INDEX "products_blocks_pricing_parent_id_idx" ON "products_blocks_pricing" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_pricing_path_idx" ON "products_blocks_pricing" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_pricing_locales_locale_parent_id_unique" ON "products_blocks_pricing_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_privacy_local_order_idx" ON "products_blocks_privacy_local" USING btree ("_order");
  CREATE INDEX "products_blocks_privacy_local_parent_id_idx" ON "products_blocks_privacy_local" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_privacy_local_locales_locale_parent_id_uniqu" ON "products_blocks_privacy_local_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_privacy_cloud_order_idx" ON "products_blocks_privacy_cloud" USING btree ("_order");
  CREATE INDEX "products_blocks_privacy_cloud_parent_id_idx" ON "products_blocks_privacy_cloud" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_privacy_cloud_locales_locale_parent_id_uniqu" ON "products_blocks_privacy_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_privacy_order_idx" ON "products_blocks_privacy" USING btree ("_order");
  CREATE INDEX "products_blocks_privacy_parent_id_idx" ON "products_blocks_privacy" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_privacy_path_idx" ON "products_blocks_privacy" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_privacy_locales_locale_parent_id_unique" ON "products_blocks_privacy_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_requirements_rows_order_idx" ON "products_blocks_requirements_rows" USING btree ("_order");
  CREATE INDEX "products_blocks_requirements_rows_parent_id_idx" ON "products_blocks_requirements_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_requirements_rows_locales_locale_parent_id_u" ON "products_blocks_requirements_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_requirements_order_idx" ON "products_blocks_requirements" USING btree ("_order");
  CREATE INDEX "products_blocks_requirements_parent_id_idx" ON "products_blocks_requirements" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_requirements_path_idx" ON "products_blocks_requirements" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_requirements_locales_locale_parent_id_unique" ON "products_blocks_requirements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_download_order_idx" ON "products_blocks_download" USING btree ("_order");
  CREATE INDEX "products_blocks_download_parent_id_idx" ON "products_blocks_download" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_download_path_idx" ON "products_blocks_download" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_download_locales_locale_parent_id_unique" ON "products_blocks_download_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_changelog_preview_order_idx" ON "products_blocks_changelog_preview" USING btree ("_order");
  CREATE INDEX "products_blocks_changelog_preview_parent_id_idx" ON "products_blocks_changelog_preview" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_changelog_preview_path_idx" ON "products_blocks_changelog_preview" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_changelog_preview_locales_locale_parent_id_u" ON "products_blocks_changelog_preview_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_faq_order_idx" ON "products_blocks_faq" USING btree ("_order");
  CREATE INDEX "products_blocks_faq_parent_id_idx" ON "products_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_faq_path_idx" ON "products_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_faq_locales_locale_parent_id_unique" ON "products_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_testimonials_order_idx" ON "products_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "products_blocks_testimonials_parent_id_idx" ON "products_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_testimonials_path_idx" ON "products_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_testimonials_locales_locale_parent_id_unique" ON "products_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_comparison_columns_order_idx" ON "products_blocks_comparison_columns" USING btree ("_order");
  CREATE INDEX "products_blocks_comparison_columns_parent_id_idx" ON "products_blocks_comparison_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_comparison_columns_locales_locale_parent_id_" ON "products_blocks_comparison_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_comparison_rows_cells_order_idx" ON "products_blocks_comparison_rows_cells" USING btree ("_order");
  CREATE INDEX "products_blocks_comparison_rows_cells_parent_id_idx" ON "products_blocks_comparison_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_comparison_rows_cells_locales_locale_parent_" ON "products_blocks_comparison_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_comparison_rows_order_idx" ON "products_blocks_comparison_rows" USING btree ("_order");
  CREATE INDEX "products_blocks_comparison_rows_parent_id_idx" ON "products_blocks_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_comparison_rows_locales_locale_parent_id_uni" ON "products_blocks_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_comparison_order_idx" ON "products_blocks_comparison" USING btree ("_order");
  CREATE INDEX "products_blocks_comparison_parent_id_idx" ON "products_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_comparison_path_idx" ON "products_blocks_comparison" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_comparison_locales_locale_parent_id_unique" ON "products_blocks_comparison_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_cta_band_order_idx" ON "products_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "products_blocks_cta_band_parent_id_idx" ON "products_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_cta_band_path_idx" ON "products_blocks_cta_band" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_cta_band_locales_locale_parent_id_unique" ON "products_blocks_cta_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_rich_text_order_idx" ON "products_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "products_blocks_rich_text_parent_id_idx" ON "products_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_rich_text_path_idx" ON "products_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_rich_text_locales_locale_parent_id_unique" ON "products_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_stat_strip_stats_order_idx" ON "products_blocks_stat_strip_stats" USING btree ("_order");
  CREATE INDEX "products_blocks_stat_strip_stats_parent_id_idx" ON "products_blocks_stat_strip_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_blocks_stat_strip_stats_locales_locale_parent_id_un" ON "products_blocks_stat_strip_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_blocks_stat_strip_order_idx" ON "products_blocks_stat_strip" USING btree ("_order");
  CREATE INDEX "products_blocks_stat_strip_parent_id_idx" ON "products_blocks_stat_strip" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_stat_strip_path_idx" ON "products_blocks_stat_strip" USING btree ("_path");
  CREATE INDEX "products_blocks_embed_order_idx" ON "products_blocks_embed" USING btree ("_order");
  CREATE INDEX "products_blocks_embed_parent_id_idx" ON "products_blocks_embed" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_embed_path_idx" ON "products_blocks_embed" USING btree ("_path");
  CREATE UNIQUE INDEX "products_blocks_embed_locales_locale_parent_id_unique" ON "products_blocks_embed_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_secondary_links_order_idx" ON "products_secondary_links" USING btree ("_order");
  CREATE INDEX "products_secondary_links_parent_id_idx" ON "products_secondary_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_secondary_links_locales_locale_parent_id_unique" ON "products_secondary_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_logo_idx" ON "products" USING btree ("logo_id");
  CREATE INDEX "products_icon_idx" ON "products" USING btree ("icon_id");
  CREATE INDEX "products_hero_media_idx" ON "products" USING btree ("hero_media_id");
  CREATE INDEX "products_card_preview_idx" ON "products" USING btree ("card_preview_id");
  CREATE INDEX "products_primary_button_primary_button_plan_idx" ON "products" USING btree ("primary_button_plan_id");
  CREATE INDEX "products_secondary_button_secondary_button_plan_idx" ON "products" USING btree ("secondary_button_plan_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE INDEX "products_hi_status_idx" ON "products" USING btree ("hi_status");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE INDEX "products_meta_meta_image_idx" ON "products_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_faqs_id_idx" ON "products_rels" USING btree ("faqs_id");
  CREATE INDEX "products_rels_testimonials_id_idx" ON "products_rels" USING btree ("testimonials_id");
  CREATE INDEX "_products_v_version_platforms_order_idx" ON "_products_v_version_platforms" USING btree ("order");
  CREATE INDEX "_products_v_version_platforms_parent_idx" ON "_products_v_version_platforms" USING btree ("parent_id");
  CREATE INDEX "_products_v_blocks_product_hero_order_idx" ON "_products_v_blocks_product_hero" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_product_hero_parent_id_idx" ON "_products_v_blocks_product_hero" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_product_hero_path_idx" ON "_products_v_blocks_product_hero" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_product_hero_media_idx" ON "_products_v_blocks_product_hero" USING btree ("media_id");
  CREATE UNIQUE INDEX "_products_v_blocks_product_hero_locales_locale_parent_id_uni" ON "_products_v_blocks_product_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_problem_solution_points_order_idx" ON "_products_v_blocks_problem_solution_points" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_problem_solution_points_parent_id_idx" ON "_products_v_blocks_problem_solution_points" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_problem_solution_points_locales_locale_pa" ON "_products_v_blocks_problem_solution_points_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_problem_solution_order_idx" ON "_products_v_blocks_problem_solution" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_problem_solution_parent_id_idx" ON "_products_v_blocks_problem_solution" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_problem_solution_path_idx" ON "_products_v_blocks_problem_solution" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_problem_solution_locales_locale_parent_id" ON "_products_v_blocks_problem_solution_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_feature_scroller_items_order_idx" ON "_products_v_blocks_feature_scroller_items" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_feature_scroller_items_parent_id_idx" ON "_products_v_blocks_feature_scroller_items" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_feature_scroller_items_media_idx" ON "_products_v_blocks_feature_scroller_items" USING btree ("media_id");
  CREATE UNIQUE INDEX "_products_v_blocks_feature_scroller_items_locales_locale_par" ON "_products_v_blocks_feature_scroller_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_feature_scroller_order_idx" ON "_products_v_blocks_feature_scroller" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_feature_scroller_parent_id_idx" ON "_products_v_blocks_feature_scroller" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_feature_scroller_path_idx" ON "_products_v_blocks_feature_scroller" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_feature_scroller_locales_locale_parent_id" ON "_products_v_blocks_feature_scroller_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_feature_grid_items_order_idx" ON "_products_v_blocks_feature_grid_items" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_feature_grid_items_parent_id_idx" ON "_products_v_blocks_feature_grid_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_feature_grid_items_locales_locale_parent_" ON "_products_v_blocks_feature_grid_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_feature_grid_order_idx" ON "_products_v_blocks_feature_grid" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_feature_grid_parent_id_idx" ON "_products_v_blocks_feature_grid" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_feature_grid_path_idx" ON "_products_v_blocks_feature_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_feature_grid_locales_locale_parent_id_uni" ON "_products_v_blocks_feature_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_screenshots_images_order_idx" ON "_products_v_blocks_screenshots_images" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_screenshots_images_parent_id_idx" ON "_products_v_blocks_screenshots_images" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_screenshots_images_image_idx" ON "_products_v_blocks_screenshots_images" USING btree ("image_id");
  CREATE UNIQUE INDEX "_products_v_blocks_screenshots_images_locales_locale_parent_" ON "_products_v_blocks_screenshots_images_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_screenshots_order_idx" ON "_products_v_blocks_screenshots" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_screenshots_parent_id_idx" ON "_products_v_blocks_screenshots" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_screenshots_path_idx" ON "_products_v_blocks_screenshots" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_screenshots_locales_locale_parent_id_uniq" ON "_products_v_blocks_screenshots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_video_order_idx" ON "_products_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_video_parent_id_idx" ON "_products_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_video_path_idx" ON "_products_v_blocks_video" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_video_video_idx" ON "_products_v_blocks_video" USING btree ("video_id");
  CREATE INDEX "_products_v_blocks_video_poster_idx" ON "_products_v_blocks_video" USING btree ("poster_id");
  CREATE INDEX "_products_v_blocks_video_captions_idx" ON "_products_v_blocks_video" USING btree ("captions_id");
  CREATE UNIQUE INDEX "_products_v_blocks_video_locales_locale_parent_id_unique" ON "_products_v_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_how_it_works_steps_order_idx" ON "_products_v_blocks_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_how_it_works_steps_parent_id_idx" ON "_products_v_blocks_how_it_works_steps" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_how_it_works_steps_media_idx" ON "_products_v_blocks_how_it_works_steps" USING btree ("media_id");
  CREATE UNIQUE INDEX "_products_v_blocks_how_it_works_steps_locales_locale_parent_" ON "_products_v_blocks_how_it_works_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_how_it_works_order_idx" ON "_products_v_blocks_how_it_works" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_how_it_works_parent_id_idx" ON "_products_v_blocks_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_how_it_works_path_idx" ON "_products_v_blocks_how_it_works" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_how_it_works_locales_locale_parent_id_uni" ON "_products_v_blocks_how_it_works_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_use_cases_items_order_idx" ON "_products_v_blocks_use_cases_items" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_use_cases_items_parent_id_idx" ON "_products_v_blocks_use_cases_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_use_cases_items_locales_locale_parent_id_" ON "_products_v_blocks_use_cases_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_use_cases_order_idx" ON "_products_v_blocks_use_cases" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_use_cases_parent_id_idx" ON "_products_v_blocks_use_cases" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_use_cases_path_idx" ON "_products_v_blocks_use_cases" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_use_cases_locales_locale_parent_id_unique" ON "_products_v_blocks_use_cases_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_pricing_tiers_features_order_idx" ON "_products_v_blocks_pricing_tiers_features" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_pricing_tiers_features_parent_id_idx" ON "_products_v_blocks_pricing_tiers_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_pricing_tiers_features_locales_locale_par" ON "_products_v_blocks_pricing_tiers_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_pricing_tiers_order_idx" ON "_products_v_blocks_pricing_tiers" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_pricing_tiers_parent_id_idx" ON "_products_v_blocks_pricing_tiers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_pricing_tiers_locales_locale_parent_id_un" ON "_products_v_blocks_pricing_tiers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_pricing_order_idx" ON "_products_v_blocks_pricing" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_pricing_parent_id_idx" ON "_products_v_blocks_pricing" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_pricing_path_idx" ON "_products_v_blocks_pricing" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_pricing_locales_locale_parent_id_unique" ON "_products_v_blocks_pricing_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_privacy_local_order_idx" ON "_products_v_blocks_privacy_local" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_privacy_local_parent_id_idx" ON "_products_v_blocks_privacy_local" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_privacy_local_locales_locale_parent_id_un" ON "_products_v_blocks_privacy_local_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_privacy_cloud_order_idx" ON "_products_v_blocks_privacy_cloud" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_privacy_cloud_parent_id_idx" ON "_products_v_blocks_privacy_cloud" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_privacy_cloud_locales_locale_parent_id_un" ON "_products_v_blocks_privacy_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_privacy_order_idx" ON "_products_v_blocks_privacy" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_privacy_parent_id_idx" ON "_products_v_blocks_privacy" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_privacy_path_idx" ON "_products_v_blocks_privacy" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_privacy_locales_locale_parent_id_unique" ON "_products_v_blocks_privacy_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_requirements_rows_order_idx" ON "_products_v_blocks_requirements_rows" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_requirements_rows_parent_id_idx" ON "_products_v_blocks_requirements_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_requirements_rows_locales_locale_parent_i" ON "_products_v_blocks_requirements_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_requirements_order_idx" ON "_products_v_blocks_requirements" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_requirements_parent_id_idx" ON "_products_v_blocks_requirements" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_requirements_path_idx" ON "_products_v_blocks_requirements" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_requirements_locales_locale_parent_id_uni" ON "_products_v_blocks_requirements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_download_order_idx" ON "_products_v_blocks_download" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_download_parent_id_idx" ON "_products_v_blocks_download" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_download_path_idx" ON "_products_v_blocks_download" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_download_locales_locale_parent_id_unique" ON "_products_v_blocks_download_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_changelog_preview_order_idx" ON "_products_v_blocks_changelog_preview" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_changelog_preview_parent_id_idx" ON "_products_v_blocks_changelog_preview" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_changelog_preview_path_idx" ON "_products_v_blocks_changelog_preview" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_changelog_preview_locales_locale_parent_i" ON "_products_v_blocks_changelog_preview_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_faq_order_idx" ON "_products_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_faq_parent_id_idx" ON "_products_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_faq_path_idx" ON "_products_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_faq_locales_locale_parent_id_unique" ON "_products_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_testimonials_order_idx" ON "_products_v_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_testimonials_parent_id_idx" ON "_products_v_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_testimonials_path_idx" ON "_products_v_blocks_testimonials" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_testimonials_locales_locale_parent_id_uni" ON "_products_v_blocks_testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_comparison_columns_order_idx" ON "_products_v_blocks_comparison_columns" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_comparison_columns_parent_id_idx" ON "_products_v_blocks_comparison_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_comparison_columns_locales_locale_parent_" ON "_products_v_blocks_comparison_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_comparison_rows_cells_order_idx" ON "_products_v_blocks_comparison_rows_cells" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_comparison_rows_cells_parent_id_idx" ON "_products_v_blocks_comparison_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_comparison_rows_cells_locales_locale_pare" ON "_products_v_blocks_comparison_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_comparison_rows_order_idx" ON "_products_v_blocks_comparison_rows" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_comparison_rows_parent_id_idx" ON "_products_v_blocks_comparison_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_comparison_rows_locales_locale_parent_id_" ON "_products_v_blocks_comparison_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_comparison_order_idx" ON "_products_v_blocks_comparison" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_comparison_parent_id_idx" ON "_products_v_blocks_comparison" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_comparison_path_idx" ON "_products_v_blocks_comparison" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_comparison_locales_locale_parent_id_uniqu" ON "_products_v_blocks_comparison_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_cta_band_order_idx" ON "_products_v_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_cta_band_parent_id_idx" ON "_products_v_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_cta_band_path_idx" ON "_products_v_blocks_cta_band" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_cta_band_locales_locale_parent_id_unique" ON "_products_v_blocks_cta_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_rich_text_order_idx" ON "_products_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_rich_text_parent_id_idx" ON "_products_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_rich_text_path_idx" ON "_products_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_rich_text_locales_locale_parent_id_unique" ON "_products_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_stat_strip_stats_order_idx" ON "_products_v_blocks_stat_strip_stats" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_stat_strip_stats_parent_id_idx" ON "_products_v_blocks_stat_strip_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_blocks_stat_strip_stats_locales_locale_parent_id" ON "_products_v_blocks_stat_strip_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_stat_strip_order_idx" ON "_products_v_blocks_stat_strip" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_stat_strip_parent_id_idx" ON "_products_v_blocks_stat_strip" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_stat_strip_path_idx" ON "_products_v_blocks_stat_strip" USING btree ("_path");
  CREATE INDEX "_products_v_blocks_embed_order_idx" ON "_products_v_blocks_embed" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_embed_parent_id_idx" ON "_products_v_blocks_embed" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_embed_path_idx" ON "_products_v_blocks_embed" USING btree ("_path");
  CREATE UNIQUE INDEX "_products_v_blocks_embed_locales_locale_parent_id_unique" ON "_products_v_blocks_embed_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_version_secondary_links_order_idx" ON "_products_v_version_secondary_links" USING btree ("_order");
  CREATE INDEX "_products_v_version_secondary_links_parent_id_idx" ON "_products_v_version_secondary_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_products_v_version_secondary_links_locales_locale_parent_id" ON "_products_v_version_secondary_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_logo_idx" ON "_products_v" USING btree ("version_logo_id");
  CREATE INDEX "_products_v_version_version_icon_idx" ON "_products_v" USING btree ("version_icon_id");
  CREATE INDEX "_products_v_version_version_hero_media_idx" ON "_products_v" USING btree ("version_hero_media_id");
  CREATE INDEX "_products_v_version_version_card_preview_idx" ON "_products_v" USING btree ("version_card_preview_id");
  CREATE INDEX "_products_v_version_primary_button_version_primary_butto_idx" ON "_products_v" USING btree ("version_primary_button_plan_id");
  CREATE INDEX "_products_v_version_secondary_button_version_secondary_b_idx" ON "_products_v" USING btree ("version_secondary_button_plan_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_hi_status_idx" ON "_products_v" USING btree ("version_hi_status");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_snapshot_idx" ON "_products_v" USING btree ("snapshot");
  CREATE INDEX "_products_v_published_locale_idx" ON "_products_v" USING btree ("published_locale");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_version_meta_version_meta_image_idx" ON "_products_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE UNIQUE INDEX "_products_v_locales_locale_parent_id_unique" ON "_products_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_faqs_id_idx" ON "_products_v_rels" USING btree ("faqs_id");
  CREATE INDEX "_products_v_rels_testimonials_id_idx" ON "_products_v_rels" USING btree ("testimonials_id");
  CREATE INDEX "plans_features_order_idx" ON "plans_features" USING btree ("_order");
  CREATE INDEX "plans_features_parent_id_idx" ON "plans_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "plans_features_locales_locale_parent_id_unique" ON "plans_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "plans_product_idx" ON "plans" USING btree ("product_id");
  CREATE INDEX "plans_updated_at_idx" ON "plans" USING btree ("updated_at");
  CREATE INDEX "plans_created_at_idx" ON "plans" USING btree ("created_at");
  CREATE UNIQUE INDEX "product_code_idx" ON "plans" USING btree ("product_id","code");
  CREATE UNIQUE INDEX "plans_locales_locale_parent_id_unique" ON "plans_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "releases_product_idx" ON "releases" USING btree ("product_id");
  CREATE INDEX "releases_installer_idx" ON "releases" USING btree ("installer_id");
  CREATE INDEX "releases_updated_at_idx" ON "releases" USING btree ("updated_at");
  CREATE INDEX "releases_created_at_idx" ON "releases" USING btree ("created_at");
  CREATE INDEX "releases__status_idx" ON "releases" USING btree ("_status");
  CREATE UNIQUE INDEX "product_platform_version_idx" ON "releases" USING btree ("product_id","platform","version");
  CREATE UNIQUE INDEX "releases_locales_locale_parent_id_unique" ON "releases_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_releases_v_parent_idx" ON "_releases_v" USING btree ("parent_id");
  CREATE INDEX "_releases_v_version_version_product_idx" ON "_releases_v" USING btree ("version_product_id");
  CREATE INDEX "_releases_v_version_version_installer_idx" ON "_releases_v" USING btree ("version_installer_id");
  CREATE INDEX "_releases_v_version_version_updated_at_idx" ON "_releases_v" USING btree ("version_updated_at");
  CREATE INDEX "_releases_v_version_version_created_at_idx" ON "_releases_v" USING btree ("version_created_at");
  CREATE INDEX "_releases_v_version_version__status_idx" ON "_releases_v" USING btree ("version__status");
  CREATE INDEX "_releases_v_created_at_idx" ON "_releases_v" USING btree ("created_at");
  CREATE INDEX "_releases_v_updated_at_idx" ON "_releases_v" USING btree ("updated_at");
  CREATE INDEX "_releases_v_snapshot_idx" ON "_releases_v" USING btree ("snapshot");
  CREATE INDEX "_releases_v_published_locale_idx" ON "_releases_v" USING btree ("published_locale");
  CREATE INDEX "_releases_v_latest_idx" ON "_releases_v" USING btree ("latest");
  CREATE INDEX "version_product_version_platform_version_version_idx" ON "_releases_v" USING btree ("version_product_id","version_platform","version_version");
  CREATE UNIQUE INDEX "_releases_v_locales_locale_parent_id_unique" ON "_releases_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "installers_product_idx" ON "installers" USING btree ("product_id");
  CREATE INDEX "installers_sha256_idx" ON "installers" USING btree ("sha256");
  CREATE INDEX "installers_updated_at_idx" ON "installers" USING btree ("updated_at");
  CREATE INDEX "installers_created_at_idx" ON "installers" USING btree ("created_at");
  CREATE UNIQUE INDEX "installers_filename_idx" ON "installers" USING btree ("filename");
  CREATE INDEX "docs_product_idx" ON "docs" USING btree ("product_id");
  CREATE INDEX "docs_slug_idx" ON "docs" USING btree ("slug");
  CREATE INDEX "docs_parent_idx" ON "docs" USING btree ("parent_id");
  CREATE INDEX "docs_hi_status_idx" ON "docs" USING btree ("hi_status");
  CREATE INDEX "docs_updated_at_idx" ON "docs" USING btree ("updated_at");
  CREATE INDEX "docs_created_at_idx" ON "docs" USING btree ("created_at");
  CREATE INDEX "docs__status_idx" ON "docs" USING btree ("_status");
  CREATE UNIQUE INDEX "product_slug_idx" ON "docs" USING btree ("product_id","slug");
  CREATE UNIQUE INDEX "docs_locales_locale_parent_id_unique" ON "docs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_docs_v_parent_idx" ON "_docs_v" USING btree ("parent_id");
  CREATE INDEX "_docs_v_version_version_product_idx" ON "_docs_v" USING btree ("version_product_id");
  CREATE INDEX "_docs_v_version_version_slug_idx" ON "_docs_v" USING btree ("version_slug");
  CREATE INDEX "_docs_v_version_version_parent_idx" ON "_docs_v" USING btree ("version_parent_id");
  CREATE INDEX "_docs_v_version_version_hi_status_idx" ON "_docs_v" USING btree ("version_hi_status");
  CREATE INDEX "_docs_v_version_version_updated_at_idx" ON "_docs_v" USING btree ("version_updated_at");
  CREATE INDEX "_docs_v_version_version_created_at_idx" ON "_docs_v" USING btree ("version_created_at");
  CREATE INDEX "_docs_v_version_version__status_idx" ON "_docs_v" USING btree ("version__status");
  CREATE INDEX "_docs_v_created_at_idx" ON "_docs_v" USING btree ("created_at");
  CREATE INDEX "_docs_v_updated_at_idx" ON "_docs_v" USING btree ("updated_at");
  CREATE INDEX "_docs_v_snapshot_idx" ON "_docs_v" USING btree ("snapshot");
  CREATE INDEX "_docs_v_published_locale_idx" ON "_docs_v" USING btree ("published_locale");
  CREATE INDEX "_docs_v_latest_idx" ON "_docs_v" USING btree ("latest");
  CREATE INDEX "version_product_version_slug_idx" ON "_docs_v" USING btree ("version_product_id","version_slug");
  CREATE UNIQUE INDEX "_docs_v_locales_locale_parent_id_unique" ON "_docs_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "changelog_product_idx" ON "changelog" USING btree ("product_id");
  CREATE INDEX "changelog_updated_at_idx" ON "changelog" USING btree ("updated_at");
  CREATE INDEX "changelog_created_at_idx" ON "changelog" USING btree ("created_at");
  CREATE UNIQUE INDEX "changelog_locales_locale_parent_id_unique" ON "changelog_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");
  CREATE INDEX "leads_assigned_to_idx" ON "leads" USING btree ("assigned_to_id");
  CREATE INDEX "leads_type_idx" ON "leads" USING btree ("type");
  CREATE INDEX "leads_product_idx" ON "leads" USING btree ("product_id");
  CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");
  CREATE INDEX "leads_confirm_token_hash_idx" ON "leads" USING btree ("confirm_token_hash");
  CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
  CREATE INDEX "data_requests_handled_by_idx" ON "data_requests" USING btree ("handled_by_id");
  CREATE INDEX "data_requests_updated_at_idx" ON "data_requests" USING btree ("updated_at");
  CREATE INDEX "data_requests_created_at_idx" ON "data_requests" USING btree ("created_at");
  CREATE UNIQUE INDEX "short_links_slug_idx" ON "short_links" USING btree ("slug");
  CREATE INDEX "short_links_updated_at_idx" ON "short_links" USING btree ("updated_at");
  CREATE INDEX "short_links_created_at_idx" ON "short_links" USING btree ("created_at");
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");
  CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity");
  CREATE INDEX "audit_log_doc_id_idx" ON "audit_log" USING btree ("doc_id");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  CREATE INDEX "daily_stats_updated_at_idx" ON "daily_stats" USING btree ("updated_at");
  CREATE INDEX "daily_stats_created_at_idx" ON "daily_stats" USING btree ("created_at");
  CREATE UNIQUE INDEX "date_kind_key_idx" ON "daily_stats" USING btree ("date","kind","key");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "redirects_rels_order_idx" ON "redirects_rels" USING btree ("order");
  CREATE INDEX "redirects_rels_parent_idx" ON "redirects_rels" USING btree ("parent_id");
  CREATE INDEX "redirects_rels_path_idx" ON "redirects_rels" USING btree ("path");
  CREATE INDEX "redirects_rels_pages_id_idx" ON "redirects_rels" USING btree ("pages_id");
  CREATE INDEX "redirects_rels_products_id_idx" ON "redirects_rels" USING btree ("products_id");
  CREATE INDEX "redirects_rels_services_id_idx" ON "redirects_rels" USING btree ("services_id");
  CREATE INDEX "redirects_rels_posts_id_idx" ON "redirects_rels" USING btree ("posts_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_services_id_idx" ON "payload_locked_documents_rels" USING btree ("services_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonials_id");
  CREATE INDEX "payload_locked_documents_rels_team_id_idx" ON "payload_locked_documents_rels" USING btree ("team_id");
  CREATE INDEX "payload_locked_documents_rels_jobs_id_idx" ON "payload_locked_documents_rels" USING btree ("jobs_id");
  CREATE INDEX "payload_locked_documents_rels_legal_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("legal_pages_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_plans_id_idx" ON "payload_locked_documents_rels" USING btree ("plans_id");
  CREATE INDEX "payload_locked_documents_rels_releases_id_idx" ON "payload_locked_documents_rels" USING btree ("releases_id");
  CREATE INDEX "payload_locked_documents_rels_installers_id_idx" ON "payload_locked_documents_rels" USING btree ("installers_id");
  CREATE INDEX "payload_locked_documents_rels_docs_id_idx" ON "payload_locked_documents_rels" USING btree ("docs_id");
  CREATE INDEX "payload_locked_documents_rels_changelog_id_idx" ON "payload_locked_documents_rels" USING btree ("changelog_id");
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_data_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("data_requests_id");
  CREATE INDEX "payload_locked_documents_rels_short_links_id_idx" ON "payload_locked_documents_rels" USING btree ("short_links_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");
  CREATE INDEX "payload_locked_documents_rels_daily_stats_id_idx" ON "payload_locked_documents_rels" USING btree ("daily_stats_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_socials_order_idx" ON "site_settings_socials" USING btree ("_order");
  CREATE INDEX "site_settings_socials_parent_id_idx" ON "site_settings_socials" USING btree ("_parent_id");
  CREATE INDEX "site_settings_default_seo_default_seo_image_idx" ON "site_settings" USING btree ("default_seo_image_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_header_order_idx" ON "navigation_header" USING btree ("_order");
  CREATE INDEX "navigation_header_parent_id_idx" ON "navigation_header" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_header_locales_locale_parent_id_unique" ON "navigation_header_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_footer_links_order_idx" ON "navigation_footer_links" USING btree ("_order");
  CREATE INDEX "navigation_footer_links_parent_id_idx" ON "navigation_footer_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_footer_links_locales_locale_parent_id_unique" ON "navigation_footer_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_footer_order_idx" ON "navigation_footer" USING btree ("_order");
  CREATE INDEX "navigation_footer_parent_id_idx" ON "navigation_footer" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_footer_locales_locale_parent_id_unique" ON "navigation_footer_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_hero_chips" CASCADE;
  DROP TABLE "pages_blocks_hero_chips_locales" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_hero_locales" CASCADE;
  DROP TABLE "pages_blocks_product_showcase" CASCADE;
  DROP TABLE "pages_blocks_product_showcase_locales" CASCADE;
  DROP TABLE "pages_blocks_services_overview" CASCADE;
  DROP TABLE "pages_blocks_services_overview_locales" CASCADE;
  DROP TABLE "pages_blocks_principles_items" CASCADE;
  DROP TABLE "pages_blocks_principles_items_locales" CASCADE;
  DROP TABLE "pages_blocks_principles" CASCADE;
  DROP TABLE "pages_blocks_principles_locales" CASCADE;
  DROP TABLE "pages_blocks_proof_stats" CASCADE;
  DROP TABLE "pages_blocks_proof_stats_locales" CASCADE;
  DROP TABLE "pages_blocks_proof" CASCADE;
  DROP TABLE "pages_blocks_proof_locales" CASCADE;
  DROP TABLE "pages_blocks_process_steps" CASCADE;
  DROP TABLE "pages_blocks_process_steps_locales" CASCADE;
  DROP TABLE "pages_blocks_process" CASCADE;
  DROP TABLE "pages_blocks_process_locales" CASCADE;
  DROP TABLE "pages_blocks_latest" CASCADE;
  DROP TABLE "pages_blocks_latest_locales" CASCADE;
  DROP TABLE "pages_blocks_cta" CASCADE;
  DROP TABLE "pages_blocks_cta_locales" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_rich_text_locales" CASCADE;
  DROP TABLE "pages_blocks_timeline_items" CASCADE;
  DROP TABLE "pages_blocks_timeline_items_locales" CASCADE;
  DROP TABLE "pages_blocks_timeline" CASCADE;
  DROP TABLE "pages_blocks_timeline_locales" CASCADE;
  DROP TABLE "pages_blocks_team" CASCADE;
  DROP TABLE "pages_blocks_team_locales" CASCADE;
  DROP TABLE "pages_blocks_company_facts" CASCADE;
  DROP TABLE "pages_blocks_company_facts_locales" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_faq_locales" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_chips" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_chips_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_product_showcase" CASCADE;
  DROP TABLE "_pages_v_blocks_product_showcase_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_services_overview" CASCADE;
  DROP TABLE "_pages_v_blocks_services_overview_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_principles_items" CASCADE;
  DROP TABLE "_pages_v_blocks_principles_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_principles" CASCADE;
  DROP TABLE "_pages_v_blocks_principles_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_proof_stats" CASCADE;
  DROP TABLE "_pages_v_blocks_proof_stats_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_proof" CASCADE;
  DROP TABLE "_pages_v_blocks_proof_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_process_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_process_steps_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_process" CASCADE;
  DROP TABLE "_pages_v_blocks_process_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_latest" CASCADE;
  DROP TABLE "_pages_v_blocks_latest_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_cta" CASCADE;
  DROP TABLE "_pages_v_blocks_cta_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline_items" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline" CASCADE;
  DROP TABLE "_pages_v_blocks_timeline_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_team" CASCADE;
  DROP TABLE "_pages_v_blocks_team_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_company_facts" CASCADE;
  DROP TABLE "_pages_v_blocks_company_facts_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_locales" CASCADE;
  DROP TABLE "posts_texts" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_locales" CASCADE;
  DROP TABLE "_posts_v_texts" CASCADE;
  DROP TABLE "services_capabilities" CASCADE;
  DROP TABLE "services_capabilities_locales" CASCADE;
  DROP TABLE "services_deliverables" CASCADE;
  DROP TABLE "services_deliverables_locales" CASCADE;
  DROP TABLE "services_blocks_hero_chips" CASCADE;
  DROP TABLE "services_blocks_hero_chips_locales" CASCADE;
  DROP TABLE "services_blocks_hero" CASCADE;
  DROP TABLE "services_blocks_hero_locales" CASCADE;
  DROP TABLE "services_blocks_product_showcase" CASCADE;
  DROP TABLE "services_blocks_product_showcase_locales" CASCADE;
  DROP TABLE "services_blocks_services_overview" CASCADE;
  DROP TABLE "services_blocks_services_overview_locales" CASCADE;
  DROP TABLE "services_blocks_principles_items" CASCADE;
  DROP TABLE "services_blocks_principles_items_locales" CASCADE;
  DROP TABLE "services_blocks_principles" CASCADE;
  DROP TABLE "services_blocks_principles_locales" CASCADE;
  DROP TABLE "services_blocks_proof_stats" CASCADE;
  DROP TABLE "services_blocks_proof_stats_locales" CASCADE;
  DROP TABLE "services_blocks_proof" CASCADE;
  DROP TABLE "services_blocks_proof_locales" CASCADE;
  DROP TABLE "services_blocks_process_steps" CASCADE;
  DROP TABLE "services_blocks_process_steps_locales" CASCADE;
  DROP TABLE "services_blocks_process" CASCADE;
  DROP TABLE "services_blocks_process_locales" CASCADE;
  DROP TABLE "services_blocks_latest" CASCADE;
  DROP TABLE "services_blocks_latest_locales" CASCADE;
  DROP TABLE "services_blocks_cta" CASCADE;
  DROP TABLE "services_blocks_cta_locales" CASCADE;
  DROP TABLE "services_blocks_rich_text" CASCADE;
  DROP TABLE "services_blocks_rich_text_locales" CASCADE;
  DROP TABLE "services_blocks_timeline_items" CASCADE;
  DROP TABLE "services_blocks_timeline_items_locales" CASCADE;
  DROP TABLE "services_blocks_timeline" CASCADE;
  DROP TABLE "services_blocks_timeline_locales" CASCADE;
  DROP TABLE "services_blocks_team" CASCADE;
  DROP TABLE "services_blocks_team_locales" CASCADE;
  DROP TABLE "services_blocks_company_facts" CASCADE;
  DROP TABLE "services_blocks_company_facts_locales" CASCADE;
  DROP TABLE "services_blocks_faq" CASCADE;
  DROP TABLE "services_blocks_faq_locales" CASCADE;
  DROP TABLE "services" CASCADE;
  DROP TABLE "services_locales" CASCADE;
  DROP TABLE "services_rels" CASCADE;
  DROP TABLE "_services_v_version_capabilities" CASCADE;
  DROP TABLE "_services_v_version_capabilities_locales" CASCADE;
  DROP TABLE "_services_v_version_deliverables" CASCADE;
  DROP TABLE "_services_v_version_deliverables_locales" CASCADE;
  DROP TABLE "_services_v_blocks_hero_chips" CASCADE;
  DROP TABLE "_services_v_blocks_hero_chips_locales" CASCADE;
  DROP TABLE "_services_v_blocks_hero" CASCADE;
  DROP TABLE "_services_v_blocks_hero_locales" CASCADE;
  DROP TABLE "_services_v_blocks_product_showcase" CASCADE;
  DROP TABLE "_services_v_blocks_product_showcase_locales" CASCADE;
  DROP TABLE "_services_v_blocks_services_overview" CASCADE;
  DROP TABLE "_services_v_blocks_services_overview_locales" CASCADE;
  DROP TABLE "_services_v_blocks_principles_items" CASCADE;
  DROP TABLE "_services_v_blocks_principles_items_locales" CASCADE;
  DROP TABLE "_services_v_blocks_principles" CASCADE;
  DROP TABLE "_services_v_blocks_principles_locales" CASCADE;
  DROP TABLE "_services_v_blocks_proof_stats" CASCADE;
  DROP TABLE "_services_v_blocks_proof_stats_locales" CASCADE;
  DROP TABLE "_services_v_blocks_proof" CASCADE;
  DROP TABLE "_services_v_blocks_proof_locales" CASCADE;
  DROP TABLE "_services_v_blocks_process_steps" CASCADE;
  DROP TABLE "_services_v_blocks_process_steps_locales" CASCADE;
  DROP TABLE "_services_v_blocks_process" CASCADE;
  DROP TABLE "_services_v_blocks_process_locales" CASCADE;
  DROP TABLE "_services_v_blocks_latest" CASCADE;
  DROP TABLE "_services_v_blocks_latest_locales" CASCADE;
  DROP TABLE "_services_v_blocks_cta" CASCADE;
  DROP TABLE "_services_v_blocks_cta_locales" CASCADE;
  DROP TABLE "_services_v_blocks_rich_text" CASCADE;
  DROP TABLE "_services_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_services_v_blocks_timeline_items" CASCADE;
  DROP TABLE "_services_v_blocks_timeline_items_locales" CASCADE;
  DROP TABLE "_services_v_blocks_timeline" CASCADE;
  DROP TABLE "_services_v_blocks_timeline_locales" CASCADE;
  DROP TABLE "_services_v_blocks_team" CASCADE;
  DROP TABLE "_services_v_blocks_team_locales" CASCADE;
  DROP TABLE "_services_v_blocks_company_facts" CASCADE;
  DROP TABLE "_services_v_blocks_company_facts_locales" CASCADE;
  DROP TABLE "_services_v_blocks_faq" CASCADE;
  DROP TABLE "_services_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_services_v" CASCADE;
  DROP TABLE "_services_v_locales" CASCADE;
  DROP TABLE "_services_v_rels" CASCADE;
  DROP TABLE "faqs" CASCADE;
  DROP TABLE "faqs_locales" CASCADE;
  DROP TABLE "testimonials" CASCADE;
  DROP TABLE "testimonials_locales" CASCADE;
  DROP TABLE "_testimonials_v" CASCADE;
  DROP TABLE "_testimonials_v_locales" CASCADE;
  DROP TABLE "team_links" CASCADE;
  DROP TABLE "team_links_locales" CASCADE;
  DROP TABLE "team" CASCADE;
  DROP TABLE "team_locales" CASCADE;
  DROP TABLE "jobs" CASCADE;
  DROP TABLE "jobs_locales" CASCADE;
  DROP TABLE "_jobs_v" CASCADE;
  DROP TABLE "_jobs_v_locales" CASCADE;
  DROP TABLE "legal_pages" CASCADE;
  DROP TABLE "legal_pages_locales" CASCADE;
  DROP TABLE "_legal_pages_v" CASCADE;
  DROP TABLE "_legal_pages_v_locales" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "products_platforms" CASCADE;
  DROP TABLE "products_blocks_product_hero" CASCADE;
  DROP TABLE "products_blocks_product_hero_locales" CASCADE;
  DROP TABLE "products_blocks_problem_solution_points" CASCADE;
  DROP TABLE "products_blocks_problem_solution_points_locales" CASCADE;
  DROP TABLE "products_blocks_problem_solution" CASCADE;
  DROP TABLE "products_blocks_problem_solution_locales" CASCADE;
  DROP TABLE "products_blocks_feature_scroller_items" CASCADE;
  DROP TABLE "products_blocks_feature_scroller_items_locales" CASCADE;
  DROP TABLE "products_blocks_feature_scroller" CASCADE;
  DROP TABLE "products_blocks_feature_scroller_locales" CASCADE;
  DROP TABLE "products_blocks_feature_grid_items" CASCADE;
  DROP TABLE "products_blocks_feature_grid_items_locales" CASCADE;
  DROP TABLE "products_blocks_feature_grid" CASCADE;
  DROP TABLE "products_blocks_feature_grid_locales" CASCADE;
  DROP TABLE "products_blocks_screenshots_images" CASCADE;
  DROP TABLE "products_blocks_screenshots_images_locales" CASCADE;
  DROP TABLE "products_blocks_screenshots" CASCADE;
  DROP TABLE "products_blocks_screenshots_locales" CASCADE;
  DROP TABLE "products_blocks_video" CASCADE;
  DROP TABLE "products_blocks_video_locales" CASCADE;
  DROP TABLE "products_blocks_how_it_works_steps" CASCADE;
  DROP TABLE "products_blocks_how_it_works_steps_locales" CASCADE;
  DROP TABLE "products_blocks_how_it_works" CASCADE;
  DROP TABLE "products_blocks_how_it_works_locales" CASCADE;
  DROP TABLE "products_blocks_use_cases_items" CASCADE;
  DROP TABLE "products_blocks_use_cases_items_locales" CASCADE;
  DROP TABLE "products_blocks_use_cases" CASCADE;
  DROP TABLE "products_blocks_use_cases_locales" CASCADE;
  DROP TABLE "products_blocks_pricing_tiers_features" CASCADE;
  DROP TABLE "products_blocks_pricing_tiers_features_locales" CASCADE;
  DROP TABLE "products_blocks_pricing_tiers" CASCADE;
  DROP TABLE "products_blocks_pricing_tiers_locales" CASCADE;
  DROP TABLE "products_blocks_pricing" CASCADE;
  DROP TABLE "products_blocks_pricing_locales" CASCADE;
  DROP TABLE "products_blocks_privacy_local" CASCADE;
  DROP TABLE "products_blocks_privacy_local_locales" CASCADE;
  DROP TABLE "products_blocks_privacy_cloud" CASCADE;
  DROP TABLE "products_blocks_privacy_cloud_locales" CASCADE;
  DROP TABLE "products_blocks_privacy" CASCADE;
  DROP TABLE "products_blocks_privacy_locales" CASCADE;
  DROP TABLE "products_blocks_requirements_rows" CASCADE;
  DROP TABLE "products_blocks_requirements_rows_locales" CASCADE;
  DROP TABLE "products_blocks_requirements" CASCADE;
  DROP TABLE "products_blocks_requirements_locales" CASCADE;
  DROP TABLE "products_blocks_download" CASCADE;
  DROP TABLE "products_blocks_download_locales" CASCADE;
  DROP TABLE "products_blocks_changelog_preview" CASCADE;
  DROP TABLE "products_blocks_changelog_preview_locales" CASCADE;
  DROP TABLE "products_blocks_faq" CASCADE;
  DROP TABLE "products_blocks_faq_locales" CASCADE;
  DROP TABLE "products_blocks_testimonials" CASCADE;
  DROP TABLE "products_blocks_testimonials_locales" CASCADE;
  DROP TABLE "products_blocks_comparison_columns" CASCADE;
  DROP TABLE "products_blocks_comparison_columns_locales" CASCADE;
  DROP TABLE "products_blocks_comparison_rows_cells" CASCADE;
  DROP TABLE "products_blocks_comparison_rows_cells_locales" CASCADE;
  DROP TABLE "products_blocks_comparison_rows" CASCADE;
  DROP TABLE "products_blocks_comparison_rows_locales" CASCADE;
  DROP TABLE "products_blocks_comparison" CASCADE;
  DROP TABLE "products_blocks_comparison_locales" CASCADE;
  DROP TABLE "products_blocks_cta_band" CASCADE;
  DROP TABLE "products_blocks_cta_band_locales" CASCADE;
  DROP TABLE "products_blocks_rich_text" CASCADE;
  DROP TABLE "products_blocks_rich_text_locales" CASCADE;
  DROP TABLE "products_blocks_stat_strip_stats" CASCADE;
  DROP TABLE "products_blocks_stat_strip_stats_locales" CASCADE;
  DROP TABLE "products_blocks_stat_strip" CASCADE;
  DROP TABLE "products_blocks_embed" CASCADE;
  DROP TABLE "products_blocks_embed_locales" CASCADE;
  DROP TABLE "products_secondary_links" CASCADE;
  DROP TABLE "products_secondary_links_locales" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_locales" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "_products_v_version_platforms" CASCADE;
  DROP TABLE "_products_v_blocks_product_hero" CASCADE;
  DROP TABLE "_products_v_blocks_product_hero_locales" CASCADE;
  DROP TABLE "_products_v_blocks_problem_solution_points" CASCADE;
  DROP TABLE "_products_v_blocks_problem_solution_points_locales" CASCADE;
  DROP TABLE "_products_v_blocks_problem_solution" CASCADE;
  DROP TABLE "_products_v_blocks_problem_solution_locales" CASCADE;
  DROP TABLE "_products_v_blocks_feature_scroller_items" CASCADE;
  DROP TABLE "_products_v_blocks_feature_scroller_items_locales" CASCADE;
  DROP TABLE "_products_v_blocks_feature_scroller" CASCADE;
  DROP TABLE "_products_v_blocks_feature_scroller_locales" CASCADE;
  DROP TABLE "_products_v_blocks_feature_grid_items" CASCADE;
  DROP TABLE "_products_v_blocks_feature_grid_items_locales" CASCADE;
  DROP TABLE "_products_v_blocks_feature_grid" CASCADE;
  DROP TABLE "_products_v_blocks_feature_grid_locales" CASCADE;
  DROP TABLE "_products_v_blocks_screenshots_images" CASCADE;
  DROP TABLE "_products_v_blocks_screenshots_images_locales" CASCADE;
  DROP TABLE "_products_v_blocks_screenshots" CASCADE;
  DROP TABLE "_products_v_blocks_screenshots_locales" CASCADE;
  DROP TABLE "_products_v_blocks_video" CASCADE;
  DROP TABLE "_products_v_blocks_video_locales" CASCADE;
  DROP TABLE "_products_v_blocks_how_it_works_steps" CASCADE;
  DROP TABLE "_products_v_blocks_how_it_works_steps_locales" CASCADE;
  DROP TABLE "_products_v_blocks_how_it_works" CASCADE;
  DROP TABLE "_products_v_blocks_how_it_works_locales" CASCADE;
  DROP TABLE "_products_v_blocks_use_cases_items" CASCADE;
  DROP TABLE "_products_v_blocks_use_cases_items_locales" CASCADE;
  DROP TABLE "_products_v_blocks_use_cases" CASCADE;
  DROP TABLE "_products_v_blocks_use_cases_locales" CASCADE;
  DROP TABLE "_products_v_blocks_pricing_tiers_features" CASCADE;
  DROP TABLE "_products_v_blocks_pricing_tiers_features_locales" CASCADE;
  DROP TABLE "_products_v_blocks_pricing_tiers" CASCADE;
  DROP TABLE "_products_v_blocks_pricing_tiers_locales" CASCADE;
  DROP TABLE "_products_v_blocks_pricing" CASCADE;
  DROP TABLE "_products_v_blocks_pricing_locales" CASCADE;
  DROP TABLE "_products_v_blocks_privacy_local" CASCADE;
  DROP TABLE "_products_v_blocks_privacy_local_locales" CASCADE;
  DROP TABLE "_products_v_blocks_privacy_cloud" CASCADE;
  DROP TABLE "_products_v_blocks_privacy_cloud_locales" CASCADE;
  DROP TABLE "_products_v_blocks_privacy" CASCADE;
  DROP TABLE "_products_v_blocks_privacy_locales" CASCADE;
  DROP TABLE "_products_v_blocks_requirements_rows" CASCADE;
  DROP TABLE "_products_v_blocks_requirements_rows_locales" CASCADE;
  DROP TABLE "_products_v_blocks_requirements" CASCADE;
  DROP TABLE "_products_v_blocks_requirements_locales" CASCADE;
  DROP TABLE "_products_v_blocks_download" CASCADE;
  DROP TABLE "_products_v_blocks_download_locales" CASCADE;
  DROP TABLE "_products_v_blocks_changelog_preview" CASCADE;
  DROP TABLE "_products_v_blocks_changelog_preview_locales" CASCADE;
  DROP TABLE "_products_v_blocks_faq" CASCADE;
  DROP TABLE "_products_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_products_v_blocks_testimonials" CASCADE;
  DROP TABLE "_products_v_blocks_testimonials_locales" CASCADE;
  DROP TABLE "_products_v_blocks_comparison_columns" CASCADE;
  DROP TABLE "_products_v_blocks_comparison_columns_locales" CASCADE;
  DROP TABLE "_products_v_blocks_comparison_rows_cells" CASCADE;
  DROP TABLE "_products_v_blocks_comparison_rows_cells_locales" CASCADE;
  DROP TABLE "_products_v_blocks_comparison_rows" CASCADE;
  DROP TABLE "_products_v_blocks_comparison_rows_locales" CASCADE;
  DROP TABLE "_products_v_blocks_comparison" CASCADE;
  DROP TABLE "_products_v_blocks_comparison_locales" CASCADE;
  DROP TABLE "_products_v_blocks_cta_band" CASCADE;
  DROP TABLE "_products_v_blocks_cta_band_locales" CASCADE;
  DROP TABLE "_products_v_blocks_rich_text" CASCADE;
  DROP TABLE "_products_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_products_v_blocks_stat_strip_stats" CASCADE;
  DROP TABLE "_products_v_blocks_stat_strip_stats_locales" CASCADE;
  DROP TABLE "_products_v_blocks_stat_strip" CASCADE;
  DROP TABLE "_products_v_blocks_embed" CASCADE;
  DROP TABLE "_products_v_blocks_embed_locales" CASCADE;
  DROP TABLE "_products_v_version_secondary_links" CASCADE;
  DROP TABLE "_products_v_version_secondary_links_locales" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_locales" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "plans_features" CASCADE;
  DROP TABLE "plans_features_locales" CASCADE;
  DROP TABLE "plans" CASCADE;
  DROP TABLE "plans_locales" CASCADE;
  DROP TABLE "releases" CASCADE;
  DROP TABLE "releases_locales" CASCADE;
  DROP TABLE "_releases_v" CASCADE;
  DROP TABLE "_releases_v_locales" CASCADE;
  DROP TABLE "installers" CASCADE;
  DROP TABLE "docs" CASCADE;
  DROP TABLE "docs_locales" CASCADE;
  DROP TABLE "_docs_v" CASCADE;
  DROP TABLE "_docs_v_locales" CASCADE;
  DROP TABLE "changelog" CASCADE;
  DROP TABLE "changelog_locales" CASCADE;
  DROP TABLE "leads" CASCADE;
  DROP TABLE "data_requests" CASCADE;
  DROP TABLE "short_links" CASCADE;
  DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "daily_stats" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "redirects_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_socials" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "navigation_header" CASCADE;
  DROP TABLE "navigation_header_locales" CASCADE;
  DROP TABLE "navigation_footer_links" CASCADE;
  DROP TABLE "navigation_footer_links_locales" CASCADE;
  DROP TABLE "navigation_footer" CASCADE;
  DROP TABLE "navigation_footer_locales" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_pages_blocks_product_showcase_mode";
  DROP TYPE "public"."enum_pages_blocks_proof_stats_source";
  DROP TYPE "public"."enum_pages_hi_status";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_product_showcase_mode";
  DROP TYPE "public"."enum__pages_v_blocks_proof_stats_source";
  DROP TYPE "public"."enum__pages_v_version_hi_status";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum_posts_hi_status";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_hi_status";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum__posts_v_published_locale";
  DROP TYPE "public"."enum_services_blocks_product_showcase_mode";
  DROP TYPE "public"."enum_services_blocks_proof_stats_source";
  DROP TYPE "public"."enum_services_hi_status";
  DROP TYPE "public"."enum_services_status";
  DROP TYPE "public"."enum__services_v_blocks_product_showcase_mode";
  DROP TYPE "public"."enum__services_v_blocks_proof_stats_source";
  DROP TYPE "public"."enum__services_v_version_hi_status";
  DROP TYPE "public"."enum__services_v_version_status";
  DROP TYPE "public"."enum__services_v_published_locale";
  DROP TYPE "public"."enum_faqs_category";
  DROP TYPE "public"."enum_testimonials_status";
  DROP TYPE "public"."enum__testimonials_v_version_status";
  DROP TYPE "public"."enum__testimonials_v_published_locale";
  DROP TYPE "public"."enum_jobs_type";
  DROP TYPE "public"."enum_jobs_work_mode";
  DROP TYPE "public"."enum_jobs_hi_status";
  DROP TYPE "public"."enum_jobs_status";
  DROP TYPE "public"."enum__jobs_v_version_type";
  DROP TYPE "public"."enum__jobs_v_version_work_mode";
  DROP TYPE "public"."enum__jobs_v_version_hi_status";
  DROP TYPE "public"."enum__jobs_v_version_status";
  DROP TYPE "public"."enum__jobs_v_published_locale";
  DROP TYPE "public"."enum_legal_pages_hi_status";
  DROP TYPE "public"."enum_legal_pages_status";
  DROP TYPE "public"."enum__legal_pages_v_version_hi_status";
  DROP TYPE "public"."enum__legal_pages_v_version_status";
  DROP TYPE "public"."enum__legal_pages_v_published_locale";
  DROP TYPE "public"."enum_products_platforms";
  DROP TYPE "public"."enum_products_blocks_product_hero_animation";
  DROP TYPE "public"."enum_products_blocks_pricing_source";
  DROP TYPE "public"."enum_products_blocks_download_channel";
  DROP TYPE "public"."enum_products_blocks_stat_strip_stats_source";
  DROP TYPE "public"."enum_products_blocks_embed_aspect_ratio";
  DROP TYPE "public"."enum_products_secondary_links_kind";
  DROP TYPE "public"."enum_products_type";
  DROP TYPE "public"."enum_products_category";
  DROP TYPE "public"."enum_products_lifecycle";
  DROP TYPE "public"."enum_products_hosting_mode";
  DROP TYPE "public"."enum_products_primary_button_type";
  DROP TYPE "public"."enum_products_primary_button_channel";
  DROP TYPE "public"."enum_products_secondary_button_type";
  DROP TYPE "public"."enum_products_secondary_button_channel";
  DROP TYPE "public"."enum_products_hi_status";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum__products_v_version_platforms";
  DROP TYPE "public"."enum__products_v_blocks_product_hero_animation";
  DROP TYPE "public"."enum__products_v_blocks_pricing_source";
  DROP TYPE "public"."enum__products_v_blocks_download_channel";
  DROP TYPE "public"."enum__products_v_blocks_stat_strip_stats_source";
  DROP TYPE "public"."enum__products_v_blocks_embed_aspect_ratio";
  DROP TYPE "public"."enum__products_v_version_secondary_links_kind";
  DROP TYPE "public"."enum__products_v_version_type";
  DROP TYPE "public"."enum__products_v_version_category";
  DROP TYPE "public"."enum__products_v_version_lifecycle";
  DROP TYPE "public"."enum__products_v_version_hosting_mode";
  DROP TYPE "public"."enum__products_v_version_primary_button_type";
  DROP TYPE "public"."enum__products_v_version_primary_button_channel";
  DROP TYPE "public"."enum__products_v_version_secondary_button_type";
  DROP TYPE "public"."enum__products_v_version_secondary_button_channel";
  DROP TYPE "public"."enum__products_v_version_hi_status";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum__products_v_published_locale";
  DROP TYPE "public"."enum_plans_billing";
  DROP TYPE "public"."enum_releases_channel";
  DROP TYPE "public"."enum_releases_status";
  DROP TYPE "public"."enum__releases_v_version_channel";
  DROP TYPE "public"."enum__releases_v_version_status";
  DROP TYPE "public"."enum__releases_v_published_locale";
  DROP TYPE "public"."enum_docs_hi_status";
  DROP TYPE "public"."enum_docs_status";
  DROP TYPE "public"."enum__docs_v_version_hi_status";
  DROP TYPE "public"."enum__docs_v_version_status";
  DROP TYPE "public"."enum__docs_v_published_locale";
  DROP TYPE "public"."enum_changelog_type";
  DROP TYPE "public"."enum_leads_status";
  DROP TYPE "public"."enum_leads_type";
  DROP TYPE "public"."enum_leads_locale";
  DROP TYPE "public"."enum_data_requests_type";
  DROP TYPE "public"."enum_data_requests_status";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_audit_log_action";
  DROP TYPE "public"."enum_daily_stats_kind";
  DROP TYPE "public"."enum_redirects_to_type";
  DROP TYPE "public"."enum_redirects_type";
  DROP TYPE "public"."enum_site_settings_socials_platform";
  DROP TYPE "public"."enum_navigation_header_mega_menu";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_licenses_status" AS ENUM('active', 'suspended', 'revoked', 'expired');
  CREATE TYPE "public"."enum_licenses_source" AS ENUM('purchase', 'complimentary', 'manual');
  CREATE TYPE "public"."enum_activations_deactivated_by" AS ENUM('device', 'account', 'support');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'sendLicenseEmail' BEFORE 'reconcileOrders';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'sendDeviceEmail' BEFORE 'reconcileOrders';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'sendLicenseEmail' BEFORE 'reconcileOrders';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'sendDeviceEmail' BEFORE 'reconcileOrders';
  CREATE TABLE "licenses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"plan_id" integer NOT NULL,
  	"customer_id" integer NOT NULL,
  	"order_id" integer,
  	"status" "enum_licenses_status" DEFAULT 'active' NOT NULL,
  	"source" "enum_licenses_source" DEFAULT 'complimentary' NOT NULL,
  	"max_activations" numeric,
  	"updates_until" timestamp(3) with time zone,
  	"issued_at" timestamp(3) with time zone,
  	"key_last4" varchar,
  	"notes" varchar,
  	"key_hash" varchar,
  	"key_encrypted" varchar,
  	"emailed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "activations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"license_id" integer NOT NULL,
  	"active" boolean DEFAULT true,
  	"device_name" varchar NOT NULL,
  	"os" varchar,
  	"app_version" varchar,
  	"first_seen_at" timestamp(3) with time zone,
  	"last_seen_at" timestamp(3) with time zone,
  	"deactivated_at" timestamp(3) with time zone,
  	"deactivated_by" "enum_activations_deactivated_by",
  	"device_id_hash" varchar NOT NULL,
  	"notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "trials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"device_id_hash" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "licenses_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "activations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "trials_id" integer;
  ALTER TABLE "licenses" ADD CONSTRAINT "licenses_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "licenses" ADD CONSTRAINT "licenses_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "licenses" ADD CONSTRAINT "licenses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "licenses" ADD CONSTRAINT "licenses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "activations" ADD CONSTRAINT "activations_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "trials" ADD CONSTRAINT "trials_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "licenses_product_idx" ON "licenses" USING btree ("product_id");
  CREATE INDEX "licenses_plan_idx" ON "licenses" USING btree ("plan_id");
  CREATE INDEX "licenses_customer_idx" ON "licenses" USING btree ("customer_id");
  CREATE UNIQUE INDEX "licenses_order_idx" ON "licenses" USING btree ("order_id");
  CREATE INDEX "licenses_status_idx" ON "licenses" USING btree ("status");
  CREATE UNIQUE INDEX "licenses_key_hash_idx" ON "licenses" USING btree ("key_hash");
  CREATE INDEX "licenses_updated_at_idx" ON "licenses" USING btree ("updated_at");
  CREATE INDEX "licenses_created_at_idx" ON "licenses" USING btree ("created_at");
  CREATE INDEX "activations_license_idx" ON "activations" USING btree ("license_id");
  CREATE INDEX "activations_active_idx" ON "activations" USING btree ("active");
  CREATE INDEX "activations_device_id_hash_idx" ON "activations" USING btree ("device_id_hash");
  CREATE INDEX "activations_updated_at_idx" ON "activations" USING btree ("updated_at");
  CREATE INDEX "activations_created_at_idx" ON "activations" USING btree ("created_at");
  CREATE INDEX "trials_product_idx" ON "trials" USING btree ("product_id");
  CREATE INDEX "trials_updated_at_idx" ON "trials" USING btree ("updated_at");
  CREATE INDEX "trials_created_at_idx" ON "trials" USING btree ("created_at");
  CREATE UNIQUE INDEX "product_deviceIdHash_idx" ON "trials" USING btree ("product_id","device_id_hash");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_licenses_fk" FOREIGN KEY ("licenses_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_activations_fk" FOREIGN KEY ("activations_id") REFERENCES "public"."activations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_trials_fk" FOREIGN KEY ("trials_id") REFERENCES "public"."trials"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_licenses_id_idx" ON "payload_locked_documents_rels" USING btree ("licenses_id");
  CREATE INDEX "payload_locked_documents_rels_activations_id_idx" ON "payload_locked_documents_rels" USING btree ("activations_id");
  CREATE INDEX "payload_locked_documents_rels_trials_id_idx" ON "payload_locked_documents_rels" USING btree ("trials_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "licenses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "activations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "trials" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "licenses" CASCADE;
  DROP TABLE "activations" CASCADE;
  DROP TABLE "trials" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_licenses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_activations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_trials_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'processWebhook', 'renderInvoicePdf', 'sendOrderEmail', 'reconcileOrders', 'cleanup');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'processWebhook', 'renderInvoicePdf', 'sendOrderEmail', 'reconcileOrders', 'cleanup');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_licenses_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_activations_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_trials_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "licenses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "activations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "trials_id";
  DROP TYPE "public"."enum_licenses_status";
  DROP TYPE "public"."enum_licenses_source";
  DROP TYPE "public"."enum_activations_deactivated_by";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_licenses_status_notified_as" AS ENUM('suspended', 'revoked');
  CREATE TYPE "public"."enum_waitlist_emails_status" AS ENUM('draft', 'sending', 'sent');
  CREATE TABLE "waitlist_emails" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"status" "enum_waitlist_emails_status" DEFAULT 'draft' NOT NULL,
  	"recipients" numeric,
  	"sent" numeric DEFAULT 0,
  	"sent_at" timestamp(3) with time zone,
  	"sent_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "waitlist_emails_locales" (
  	"subject" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "waitlist_deliveries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email_id" integer NOT NULL,
  	"lead_id" integer,
  	"address_hash" varchar NOT NULL,
  	"claimed_at" timestamp(3) with time zone NOT NULL,
  	"sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "orders" ADD COLUMN "amount_refunded" numeric DEFAULT 0 NOT NULL;
  ALTER TABLE "invoices" ADD COLUMN "razorpay_refund_id" varchar;
  ALTER TABLE "invoices" ADD COLUMN "email_claimed_at" timestamp(3) with time zone;
  ALTER TABLE "invoices" ADD COLUMN "emailed_at" timestamp(3) with time zone;
  ALTER TABLE "licenses" ADD COLUMN "status_notified_as" "enum_licenses_status_notified_as";
  ALTER TABLE "licenses" ADD COLUMN "status_claimed_at" timestamp(3) with time zone;
  UPDATE "licenses" SET "status_notified_as" = "status"::text::"enum_licenses_status_notified_as" WHERE "status" IN ('suspended', 'revoked');
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "waitlist_emails_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "waitlist_deliveries_id" integer;
  ALTER TABLE "waitlist_emails" ADD CONSTRAINT "waitlist_emails_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "waitlist_emails" ADD CONSTRAINT "waitlist_emails_sent_by_id_users_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "waitlist_emails_locales" ADD CONSTRAINT "waitlist_emails_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."waitlist_emails"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "waitlist_deliveries" ADD CONSTRAINT "waitlist_deliveries_email_id_waitlist_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."waitlist_emails"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "waitlist_deliveries" ADD CONSTRAINT "waitlist_deliveries_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "waitlist_emails_product_idx" ON "waitlist_emails" USING btree ("product_id");
  CREATE INDEX "waitlist_emails_status_idx" ON "waitlist_emails" USING btree ("status");
  CREATE INDEX "waitlist_emails_sent_by_idx" ON "waitlist_emails" USING btree ("sent_by_id");
  CREATE INDEX "waitlist_emails_updated_at_idx" ON "waitlist_emails" USING btree ("updated_at");
  CREATE INDEX "waitlist_emails_created_at_idx" ON "waitlist_emails" USING btree ("created_at");
  CREATE UNIQUE INDEX "waitlist_emails_locales_locale_parent_id_unique" ON "waitlist_emails_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "waitlist_deliveries_email_idx" ON "waitlist_deliveries" USING btree ("email_id");
  CREATE INDEX "waitlist_deliveries_lead_idx" ON "waitlist_deliveries" USING btree ("lead_id");
  CREATE INDEX "waitlist_deliveries_updated_at_idx" ON "waitlist_deliveries" USING btree ("updated_at");
  CREATE INDEX "waitlist_deliveries_created_at_idx" ON "waitlist_deliveries" USING btree ("created_at");
  CREATE UNIQUE INDEX "email_addressHash_idx" ON "waitlist_deliveries" USING btree ("email_id","address_hash");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_waitlist_emails_fk" FOREIGN KEY ("waitlist_emails_id") REFERENCES "public"."waitlist_emails"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_waitlist_deliveries_fk" FOREIGN KEY ("waitlist_deliveries_id") REFERENCES "public"."waitlist_deliveries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "invoices_razorpay_refund_id_idx" ON "invoices" USING btree ("razorpay_refund_id");
  CREATE INDEX "payload_locked_documents_rels_waitlist_emails_id_idx" ON "payload_locked_documents_rels" USING btree ("waitlist_emails_id");
  CREATE INDEX "payload_locked_documents_rels_waitlist_deliveries_id_idx" ON "payload_locked_documents_rels" USING btree ("waitlist_deliveries_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "waitlist_emails" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "waitlist_emails_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "waitlist_deliveries" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "waitlist_emails" CASCADE;
  DROP TABLE "waitlist_emails_locales" CASCADE;
  DROP TABLE "waitlist_deliveries" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_waitlist_emails_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_waitlist_deliveries_fk";
  
  DROP INDEX "invoices_razorpay_refund_id_idx";
  DROP INDEX "payload_locked_documents_rels_waitlist_emails_id_idx";
  DROP INDEX "payload_locked_documents_rels_waitlist_deliveries_id_idx";
  ALTER TABLE "orders" DROP COLUMN "amount_refunded";
  ALTER TABLE "invoices" DROP COLUMN "razorpay_refund_id";
  ALTER TABLE "invoices" DROP COLUMN "email_claimed_at";
  ALTER TABLE "invoices" DROP COLUMN "emailed_at";
  ALTER TABLE "licenses" DROP COLUMN "status_notified_as";
  ALTER TABLE "licenses" DROP COLUMN "status_claimed_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "waitlist_emails_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "waitlist_deliveries_id";
  DROP TYPE "public"."enum_licenses_status_notified_as";
  DROP TYPE "public"."enum_waitlist_emails_status";`)
}

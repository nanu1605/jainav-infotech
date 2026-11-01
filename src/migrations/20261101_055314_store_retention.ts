import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "retention_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"lead_months" numeric DEFAULT 24 NOT NULL,
  	"data_request_months" numeric,
  	"remove_orders" boolean DEFAULT false,
  	"order_financial_years" numeric DEFAULT 8 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "leads" ADD COLUMN "last_activity_at" timestamp(3) with time zone;
  UPDATE "leads" SET "last_activity_at" = "updated_at";
  CREATE INDEX "leads_last_activity_at_idx" ON "leads" USING btree ("last_activity_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "retention_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "retention_settings" CASCADE;
  DROP INDEX "leads_last_activity_at_idx";
  ALTER TABLE "leads" DROP COLUMN "last_activity_at";`)
}

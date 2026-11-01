import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_orders_status" ADD VALUE 'chargeback' BEFORE 'expired';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // A lost dispute was simply left disputed before this.
  await db.execute(sql`
   UPDATE "orders" SET "status" = 'disputed' WHERE "status" = 'chargeback';
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'created'::text;
  DROP TYPE "public"."enum_orders_status";
  CREATE TYPE "public"."enum_orders_status" AS ENUM('created', 'paid', 'refunded', 'partially-refunded', 'disputed', 'expired');
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'created'::"public"."enum_orders_status";
  ALTER TABLE "orders" ALTER COLUMN "status" SET DATA TYPE "public"."enum_orders_status" USING "status"::"public"."enum_orders_status";`)
}

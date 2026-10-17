import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "licenses" ADD COLUMN "email_claimed_at" timestamp(3) with time zone;
  ALTER TABLE "activations" ADD COLUMN "notify_claimed_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "licenses" DROP COLUMN "email_claimed_at";
  ALTER TABLE "activations" DROP COLUMN "notify_claimed_at";`)
}

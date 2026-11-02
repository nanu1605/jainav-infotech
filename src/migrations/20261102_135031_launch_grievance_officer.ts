import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings_locales" ADD COLUMN "company_grievance_officer_name" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "company_grievance_officer_title" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings_locales" DROP COLUMN "company_grievance_officer_name";
  ALTER TABLE "site_settings_locales" DROP COLUMN "company_grievance_officer_title";`)
}

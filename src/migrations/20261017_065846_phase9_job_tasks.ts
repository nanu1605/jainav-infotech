import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'sendWaitlistEmail';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'sendWaitlistEmail';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Jobs of the removed task can't be cast back to the old enum.
  await db.execute(sql`
   DELETE FROM "payload_jobs" WHERE "task_slug" = 'sendWaitlistEmail';
  DELETE FROM "payload_jobs_log" WHERE "task_slug" = 'sendWaitlistEmail';
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'processWebhook', 'renderInvoicePdf', 'sendOrderEmail', 'sendLicenseEmail', 'sendDeviceEmail', 'reconcileOrders', 'cleanup');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'processWebhook', 'renderInvoicePdf', 'sendOrderEmail', 'sendLicenseEmail', 'sendDeviceEmail', 'reconcileOrders', 'cleanup');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";`)
}

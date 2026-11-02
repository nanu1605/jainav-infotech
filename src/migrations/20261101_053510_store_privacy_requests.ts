import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_data_requests_locale" AS ENUM('en', 'hi');
  ALTER TYPE "public"."enum_data_requests_type" ADD VALUE 'nomination' BEFORE 'grievance';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'sendDataRequestAck';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'remindDataRequests';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'sendDataRequestAck';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'remindDataRequests';
  ALTER TABLE "data_requests" ADD COLUMN "ticket_number" varchar;
  ALTER TABLE "data_requests" ADD COLUMN "locale" "enum_data_requests_locale";
  ALTER TABLE "data_requests" ADD COLUMN "due_at" timestamp(3) with time zone;
  ALTER TABLE "data_requests" ADD COLUMN "acknowledge_by" timestamp(3) with time zone;
  ALTER TABLE "data_requests" ADD COLUMN "acknowledged_at" timestamp(3) with time zone;
  ALTER TABLE "data_requests" ADD COLUMN "ack_claimed_at" timestamp(3) with time zone;
  -- Requests already received: their automatic email was sent then, or its failure only logged.
  UPDATE "data_requests" SET
    "ticket_number" = 'JT-' || lpad(upper(to_hex("id")), 8, '0'),
    "due_at" = "created_at" + interval '1 month',
    "acknowledge_by" = CASE WHEN "type" = 'grievance' THEN "created_at" + interval '48 hours' END,
    "acknowledged_at" = "created_at";
  CREATE UNIQUE INDEX "data_requests_ticket_number_idx" ON "data_requests" USING btree ("ticket_number");
  CREATE INDEX "data_requests_due_at_idx" ON "data_requests" USING btree ("due_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // A nomination was a correction request before this; jobs of removed tasks can't be cast back.
  await db.execute(sql`
   UPDATE "data_requests" SET "type" = 'correction' WHERE "type" = 'nomination';
  DELETE FROM "payload_jobs" WHERE "task_slug" IN ('sendDataRequestAck', 'remindDataRequests');
  DELETE FROM "payload_jobs_log" WHERE "task_slug" IN ('sendDataRequestAck', 'remindDataRequests');
  ALTER TABLE "data_requests" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE "public"."enum_data_requests_type";
  CREATE TYPE "public"."enum_data_requests_type" AS ENUM('access', 'correction', 'erasure', 'withdraw-consent', 'grievance');
  ALTER TABLE "data_requests" ALTER COLUMN "type" SET DATA TYPE "public"."enum_data_requests_type" USING "type"::"public"."enum_data_requests_type";
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'processWebhook', 'renderInvoicePdf', 'sendOrderEmail', 'sendLicenseEmail', 'sendDeviceEmail', 'reconcileOrders', 'cleanup', 'sendWaitlistEmail');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'processWebhook', 'renderInvoicePdf', 'sendOrderEmail', 'sendLicenseEmail', 'sendDeviceEmail', 'reconcileOrders', 'cleanup', 'sendWaitlistEmail');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "data_requests_ticket_number_idx";
  DROP INDEX "data_requests_due_at_idx";
  ALTER TABLE "data_requests" DROP COLUMN "ticket_number";
  ALTER TABLE "data_requests" DROP COLUMN "locale";
  ALTER TABLE "data_requests" DROP COLUMN "due_at";
  ALTER TABLE "data_requests" DROP COLUMN "acknowledge_by";
  ALTER TABLE "data_requests" DROP COLUMN "acknowledged_at";
  ALTER TABLE "data_requests" DROP COLUMN "ack_claimed_at";
  DROP TYPE "public"."enum_data_requests_locale";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_flags" AS ENUM('paid-twice');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('created', 'paid', 'refunded', 'partially-refunded', 'disputed', 'expired');
  CREATE TYPE "public"."enum_orders_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_orders_currency" AS ENUM('INR');
  CREATE TYPE "public"."enum_orders_tax_mode" AS ENUM('cgst_sgst', 'igst', 'none');
  CREATE TYPE "public"."enum_invoices_kind" AS ENUM('invoice', 'credit-note');
  CREATE TYPE "public"."enum_invoices_tax_mode" AS ENUM('cgst_sgst', 'igst', 'none');
  CREATE TYPE "public"."enum_customers_state" AS ENUM('10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '26', '27', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '97', '01', '02', '03', '04', '05', '06', '07', '08', '09');
  CREATE TYPE "public"."enum_customers_preferred_locale" AS ENUM('en', 'hi');
  CREATE TYPE "public"."enum_customers_status" AS ENUM('active', 'deleted');
  CREATE TYPE "public"."enum_coupons_kind" AS ENUM('percent', 'fixed');
  CREATE TYPE "public"."enum_coupons_currency" AS ENUM('INR');
  CREATE TYPE "public"."enum_webhook_events_provider" AS ENUM('razorpay');
  CREATE TYPE "public"."enum_webhook_events_status" AS ENUM('received', 'processed', 'ignored', 'failed');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'processWebhook', 'renderInvoicePdf', 'sendOrderEmail', 'reconcileOrders', 'cleanup');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'processWebhook', 'renderInvoicePdf', 'sendOrderEmail', 'reconcileOrders', 'cleanup');
  CREATE TYPE "public"."enum_commerce_settings_home_state_code" AS ENUM('10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '26', '27', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '97', '01', '02', '03', '04', '05', '06', '07', '08', '09');
  CREATE TYPE "public"."enum_commerce_settings_export_treatment" AS ENUM('lut', 'igst');
  CREATE TABLE "orders_flags" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_orders_flags",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"plan_id" integer NOT NULL,
  	"qty" numeric DEFAULT 1 NOT NULL,
  	"unit_price" numeric DEFAULT 0 NOT NULL,
  	"description" varchar NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_number" varchar NOT NULL,
  	"customer_id" integer NOT NULL,
  	"status" "enum_orders_status" DEFAULT 'created' NOT NULL,
  	"paid_at" timestamp(3) with time zone,
  	"emailed_at" timestamp(3) with time zone,
  	"locale" "enum_orders_locale" DEFAULT 'en' NOT NULL,
  	"currency" "enum_orders_currency" DEFAULT 'INR' NOT NULL,
  	"subtotal" numeric DEFAULT 0 NOT NULL,
  	"discount" numeric DEFAULT 0 NOT NULL,
  	"total" numeric DEFAULT 0 NOT NULL,
  	"coupon_id" integer,
  	"tax_mode" "enum_orders_tax_mode" DEFAULT 'none' NOT NULL,
  	"tax_rate_percent" numeric DEFAULT 0 NOT NULL,
  	"tax_taxable" numeric DEFAULT 0 NOT NULL,
  	"tax_cgst" numeric DEFAULT 0 NOT NULL,
  	"tax_sgst" numeric DEFAULT 0 NOT NULL,
  	"tax_igst" numeric DEFAULT 0 NOT NULL,
  	"billing_name" varchar NOT NULL,
  	"billing_email" varchar NOT NULL,
  	"billing_phone" varchar,
  	"billing_country" varchar DEFAULT 'IN' NOT NULL,
  	"billing_state_code" varchar NOT NULL,
  	"billing_state_name" varchar NOT NULL,
  	"billing_business_name" varchar,
  	"billing_gstin" varchar,
  	"acceptance_terms_version" varchar NOT NULL,
  	"acceptance_eula_version" varchar NOT NULL,
  	"acceptance_at" timestamp(3) with time zone NOT NULL,
  	"acceptance_ip_hash" varchar,
  	"razorpay_order_id" varchar,
  	"razorpay_payment_id" varchar,
  	"invoice_id" integer,
  	"events" jsonb DEFAULT '[]'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"invoices_id" integer
  );
  
  CREATE TABLE "invoices_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"description" varchar NOT NULL,
  	"qty" numeric DEFAULT 1 NOT NULL,
  	"unit_price" numeric DEFAULT 0 NOT NULL,
  	"discount" numeric DEFAULT 0 NOT NULL,
  	"taxable" numeric DEFAULT 0 NOT NULL,
  	"rate_percent" numeric DEFAULT 0 NOT NULL,
  	"cgst" numeric DEFAULT 0 NOT NULL,
  	"sgst" numeric DEFAULT 0 NOT NULL,
  	"igst" numeric DEFAULT 0 NOT NULL,
  	"total" numeric DEFAULT 0 NOT NULL
  );
  
  CREATE TABLE "invoices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar NOT NULL,
  	"kind" "enum_invoices_kind" DEFAULT 'invoice' NOT NULL,
  	"financial_year" varchar NOT NULL,
  	"order_id" integer NOT NULL,
  	"issued_at" timestamp(3) with time zone NOT NULL,
  	"original_invoice_id" integer,
  	"pdf_id" integer,
  	"seller_state_name" varchar NOT NULL,
  	"seller_state_code" varchar NOT NULL,
  	"seller_gstin" varchar,
  	"seller_legal_name" varchar NOT NULL,
  	"seller_cin" varchar,
  	"seller_address" varchar,
  	"buyer_state_name" varchar NOT NULL,
  	"buyer_state_code" varchar NOT NULL,
  	"buyer_gstin" varchar,
  	"buyer_name" varchar NOT NULL,
  	"buyer_business_name" varchar,
  	"buyer_email" varchar,
  	"buyer_country" varchar DEFAULT 'IN' NOT NULL,
  	"tax_mode" "enum_invoices_tax_mode" NOT NULL,
  	"sac_code" varchar,
  	"reverse_charge" boolean DEFAULT false,
  	"currency" varchar DEFAULT 'INR' NOT NULL,
  	"totals_subtotal" numeric DEFAULT 0 NOT NULL,
  	"totals_discount" numeric DEFAULT 0 NOT NULL,
  	"totals_taxable" numeric DEFAULT 0 NOT NULL,
  	"totals_cgst" numeric DEFAULT 0 NOT NULL,
  	"totals_sgst" numeric DEFAULT 0 NOT NULL,
  	"totals_igst" numeric DEFAULT 0 NOT NULL,
  	"totals_total" numeric DEFAULT 0 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"name" varchar,
  	"phone" varchar,
  	"country" varchar DEFAULT 'IN',
  	"state" "enum_customers_state",
  	"business_name" varchar,
  	"gstin" varchar,
  	"preferred_locale" "enum_customers_preferred_locale" DEFAULT 'en' NOT NULL,
  	"status" "enum_customers_status" DEFAULT 'active' NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"marketing_consent_given" boolean,
  	"marketing_consent_at" timestamp(3) with time zone,
  	"marketing_consent_text_version" varchar,
  	"marketing_consent_withdrawn_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "coupons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"kind" "enum_coupons_kind" DEFAULT 'percent' NOT NULL,
  	"value" numeric NOT NULL,
  	"currency" "enum_coupons_currency" DEFAULT 'INR',
  	"valid_from" timestamp(3) with time zone,
  	"valid_to" timestamp(3) with time zone,
  	"max_redemptions" numeric,
  	"per_customer_limit" numeric,
  	"redemptions" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "coupons_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer,
  	"plans_id" integer
  );
  
  CREATE TABLE "webhook_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"provider" "enum_webhook_events_provider" DEFAULT 'razorpay' NOT NULL,
  	"event_id" varchar NOT NULL,
  	"event" varchar NOT NULL,
  	"status" "enum_webhook_events_status" DEFAULT 'received' NOT NULL,
  	"received_at" timestamp(3) with time zone NOT NULL,
  	"processed_at" timestamp(3) with time zone,
  	"error" varchar,
  	"payload" jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "invoice_counters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"series" varchar NOT NULL,
  	"financial_year" varchar NOT NULL,
  	"next" numeric DEFAULT 1 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "otp_challenges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email_hash" varchar NOT NULL,
  	"code_hmac" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"ip_hash" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customer_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"token_hash" varchar NOT NULL,
  	"customer_id" integer NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"last_seen_at" timestamp(3) with time zone,
  	"user_agent" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "commerce_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"gst_enabled" boolean DEFAULT false,
  	"gst_rate_percent" numeric DEFAULT 18 NOT NULL,
  	"sac_code" varchar,
  	"home_state_code" "enum_commerce_settings_home_state_code" DEFAULT '23' NOT NULL,
  	"prices_include_gst" boolean DEFAULT true,
  	"international_enabled" boolean DEFAULT false,
  	"export_treatment" "enum_commerce_settings_export_treatment",
  	"invoice_prefix" varchar DEFAULT 'JI' NOT NULL,
  	"credit_note_prefix" varchar DEFAULT 'JC' NOT NULL,
  	"current_terms_version" varchar,
  	"current_eula_version" varchar,
  	"refund_window_days" numeric,
  	"default_max_activations" numeric DEFAULT 2 NOT NULL,
  	"deactivations_per_month" numeric DEFAULT 3 NOT NULL,
  	"trial_days" numeric DEFAULT 14 NOT NULL,
  	"license_token_days" numeric DEFAULT 30 NOT NULL,
  	"refresh_after_days" numeric DEFAULT 7 NOT NULL,
  	"token_grace_days" numeric DEFAULT 180 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "data_requests" ADD COLUMN "customer_id" integer;
  ALTER TABLE "private_files_rels" ADD COLUMN "invoices_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "orders_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "invoices_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "coupons_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "webhook_events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "invoice_counters_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "otp_challenges_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customer_sessions_id" integer;
  ALTER TABLE "orders_flags" ADD CONSTRAINT "orders_flags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_rels" ADD CONSTRAINT "orders_rels_invoices_fk" FOREIGN KEY ("invoices_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "invoices_lines" ADD CONSTRAINT "invoices_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_original_invoice_id_invoices_id_fk" FOREIGN KEY ("original_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "invoices" ADD CONSTRAINT "invoices_pdf_id_private_files_id_fk" FOREIGN KEY ("pdf_id") REFERENCES "public"."private_files"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "coupons_rels" ADD CONSTRAINT "coupons_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "coupons_rels" ADD CONSTRAINT "coupons_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "coupons_rels" ADD CONSTRAINT "coupons_rels_plans_fk" FOREIGN KEY ("plans_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_flags_order_idx" ON "orders_flags" USING btree ("order");
  CREATE INDEX "orders_flags_parent_idx" ON "orders_flags" USING btree ("parent_id");
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_product_idx" ON "orders_items" USING btree ("product_id");
  CREATE INDEX "orders_items_plan_idx" ON "orders_items" USING btree ("plan_id");
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE INDEX "orders_customer_idx" ON "orders" USING btree ("customer_id");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_coupon_idx" ON "orders" USING btree ("coupon_id");
  CREATE UNIQUE INDEX "orders_razorpay_order_id_idx" ON "orders" USING btree ("razorpay_order_id");
  CREATE UNIQUE INDEX "orders_razorpay_payment_id_idx" ON "orders" USING btree ("razorpay_payment_id");
  CREATE INDEX "orders_invoice_idx" ON "orders" USING btree ("invoice_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "orders_rels_order_idx" ON "orders_rels" USING btree ("order");
  CREATE INDEX "orders_rels_parent_idx" ON "orders_rels" USING btree ("parent_id");
  CREATE INDEX "orders_rels_path_idx" ON "orders_rels" USING btree ("path");
  CREATE INDEX "orders_rels_invoices_id_idx" ON "orders_rels" USING btree ("invoices_id");
  CREATE INDEX "invoices_lines_order_idx" ON "invoices_lines" USING btree ("_order");
  CREATE INDEX "invoices_lines_parent_id_idx" ON "invoices_lines" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "invoices_number_idx" ON "invoices" USING btree ("number");
  CREATE INDEX "invoices_financial_year_idx" ON "invoices" USING btree ("financial_year");
  CREATE INDEX "invoices_order_idx" ON "invoices" USING btree ("order_id");
  CREATE INDEX "invoices_issued_at_idx" ON "invoices" USING btree ("issued_at");
  CREATE INDEX "invoices_original_invoice_idx" ON "invoices" USING btree ("original_invoice_id");
  CREATE INDEX "invoices_pdf_idx" ON "invoices" USING btree ("pdf_id");
  CREATE INDEX "invoices_updated_at_idx" ON "invoices" USING btree ("updated_at");
  CREATE INDEX "invoices_created_at_idx" ON "invoices" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");
  CREATE INDEX "coupons_updated_at_idx" ON "coupons" USING btree ("updated_at");
  CREATE INDEX "coupons_created_at_idx" ON "coupons" USING btree ("created_at");
  CREATE INDEX "coupons_rels_order_idx" ON "coupons_rels" USING btree ("order");
  CREATE INDEX "coupons_rels_parent_idx" ON "coupons_rels" USING btree ("parent_id");
  CREATE INDEX "coupons_rels_path_idx" ON "coupons_rels" USING btree ("path");
  CREATE INDEX "coupons_rels_products_id_idx" ON "coupons_rels" USING btree ("products_id");
  CREATE INDEX "coupons_rels_plans_id_idx" ON "coupons_rels" USING btree ("plans_id");
  CREATE UNIQUE INDEX "webhook_events_event_id_idx" ON "webhook_events" USING btree ("event_id");
  CREATE INDEX "webhook_events_event_idx" ON "webhook_events" USING btree ("event");
  CREATE INDEX "webhook_events_status_idx" ON "webhook_events" USING btree ("status");
  CREATE INDEX "webhook_events_updated_at_idx" ON "webhook_events" USING btree ("updated_at");
  CREATE INDEX "webhook_events_created_at_idx" ON "webhook_events" USING btree ("created_at");
  CREATE INDEX "invoice_counters_updated_at_idx" ON "invoice_counters" USING btree ("updated_at");
  CREATE INDEX "invoice_counters_created_at_idx" ON "invoice_counters" USING btree ("created_at");
  CREATE UNIQUE INDEX "series_financialYear_idx" ON "invoice_counters" USING btree ("series","financial_year");
  CREATE INDEX "otp_challenges_email_hash_idx" ON "otp_challenges" USING btree ("email_hash");
  CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges" USING btree ("expires_at");
  CREATE INDEX "otp_challenges_updated_at_idx" ON "otp_challenges" USING btree ("updated_at");
  CREATE INDEX "otp_challenges_created_at_idx" ON "otp_challenges" USING btree ("created_at");
  CREATE UNIQUE INDEX "customer_sessions_token_hash_idx" ON "customer_sessions" USING btree ("token_hash");
  CREATE INDEX "customer_sessions_customer_idx" ON "customer_sessions" USING btree ("customer_id");
  CREATE INDEX "customer_sessions_expires_at_idx" ON "customer_sessions" USING btree ("expires_at");
  CREATE INDEX "customer_sessions_updated_at_idx" ON "customer_sessions" USING btree ("updated_at");
  CREATE INDEX "customer_sessions_created_at_idx" ON "customer_sessions" USING btree ("created_at");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "private_files_rels" ADD CONSTRAINT "private_files_rels_invoices_fk" FOREIGN KEY ("invoices_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invoices_fk" FOREIGN KEY ("invoices_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_coupons_fk" FOREIGN KEY ("coupons_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_webhook_events_fk" FOREIGN KEY ("webhook_events_id") REFERENCES "public"."webhook_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_invoice_counters_fk" FOREIGN KEY ("invoice_counters_id") REFERENCES "public"."invoice_counters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_otp_challenges_fk" FOREIGN KEY ("otp_challenges_id") REFERENCES "public"."otp_challenges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_sessions_fk" FOREIGN KEY ("customer_sessions_id") REFERENCES "public"."customer_sessions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "data_requests_customer_idx" ON "data_requests" USING btree ("customer_id");
  CREATE INDEX "private_files_rels_invoices_id_idx" ON "private_files_rels" USING btree ("invoices_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_invoices_id_idx" ON "payload_locked_documents_rels" USING btree ("invoices_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_coupons_id_idx" ON "payload_locked_documents_rels" USING btree ("coupons_id");
  CREATE INDEX "payload_locked_documents_rels_webhook_events_id_idx" ON "payload_locked_documents_rels" USING btree ("webhook_events_id");
  CREATE INDEX "payload_locked_documents_rels_invoice_counters_id_idx" ON "payload_locked_documents_rels" USING btree ("invoice_counters_id");
  CREATE INDEX "payload_locked_documents_rels_otp_challenges_id_idx" ON "payload_locked_documents_rels" USING btree ("otp_challenges_id");
  CREATE INDEX "payload_locked_documents_rels_customer_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("customer_sessions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders_flags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "invoices_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "invoices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "coupons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "coupons_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "webhook_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "invoice_counters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "otp_challenges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customer_sessions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "commerce_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "orders_flags" CASCADE;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "orders_rels" CASCADE;
  DROP TABLE "invoices_lines" CASCADE;
  DROP TABLE "invoices" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "coupons" CASCADE;
  DROP TABLE "coupons_rels" CASCADE;
  DROP TABLE "webhook_events" CASCADE;
  DROP TABLE "invoice_counters" CASCADE;
  DROP TABLE "otp_challenges" CASCADE;
  DROP TABLE "customer_sessions" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "commerce_settings" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  ALTER TABLE "data_requests" DROP CONSTRAINT "data_requests_customer_id_customers_id_fk";
  
  ALTER TABLE "private_files_rels" DROP CONSTRAINT "private_files_rels_invoices_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_orders_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_invoices_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_coupons_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_webhook_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_invoice_counters_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_otp_challenges_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customer_sessions_fk";
  
  DROP INDEX "data_requests_customer_idx";
  DROP INDEX "private_files_rels_invoices_id_idx";
  DROP INDEX "payload_locked_documents_rels_orders_id_idx";
  DROP INDEX "payload_locked_documents_rels_invoices_id_idx";
  DROP INDEX "payload_locked_documents_rels_customers_id_idx";
  DROP INDEX "payload_locked_documents_rels_coupons_id_idx";
  DROP INDEX "payload_locked_documents_rels_webhook_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_invoice_counters_id_idx";
  DROP INDEX "payload_locked_documents_rels_otp_challenges_id_idx";
  DROP INDEX "payload_locked_documents_rels_customer_sessions_id_idx";
  ALTER TABLE "data_requests" DROP COLUMN "customer_id";
  ALTER TABLE "private_files_rels" DROP COLUMN "invoices_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "orders_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "invoices_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "coupons_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "webhook_events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "invoice_counters_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "otp_challenges_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customer_sessions_id";
  DROP TYPE "public"."enum_orders_flags";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_locale";
  DROP TYPE "public"."enum_orders_currency";
  DROP TYPE "public"."enum_orders_tax_mode";
  DROP TYPE "public"."enum_invoices_kind";
  DROP TYPE "public"."enum_invoices_tax_mode";
  DROP TYPE "public"."enum_customers_state";
  DROP TYPE "public"."enum_customers_preferred_locale";
  DROP TYPE "public"."enum_customers_status";
  DROP TYPE "public"."enum_coupons_kind";
  DROP TYPE "public"."enum_coupons_currency";
  DROP TYPE "public"."enum_webhook_events_provider";
  DROP TYPE "public"."enum_webhook_events_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  DROP TYPE "public"."enum_commerce_settings_home_state_code";
  DROP TYPE "public"."enum_commerce_settings_export_treatment";`)
}

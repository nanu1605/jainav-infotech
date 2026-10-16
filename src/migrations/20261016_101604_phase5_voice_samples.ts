import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "products_blocks_product_hero_samples" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"audio_id" integer
  );
  
  CREATE TABLE "products_blocks_product_hero_samples_locales" (
  	"label" varchar,
  	"transcript" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_products_v_blocks_product_hero_samples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"audio_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_blocks_product_hero_samples_locales" (
  	"label" varchar,
  	"transcript" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "products_blocks_product_hero_samples" ADD CONSTRAINT "products_blocks_product_hero_samples_audio_id_media_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_blocks_product_hero_samples" ADD CONSTRAINT "products_blocks_product_hero_samples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_product_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_blocks_product_hero_samples_locales" ADD CONSTRAINT "products_blocks_product_hero_samples_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_blocks_product_hero_samples"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_product_hero_samples" ADD CONSTRAINT "_products_v_blocks_product_hero_samples_audio_id_media_id_fk" FOREIGN KEY ("audio_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_product_hero_samples" ADD CONSTRAINT "_products_v_blocks_product_hero_samples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_product_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_blocks_product_hero_samples_locales" ADD CONSTRAINT "_products_v_blocks_product_hero_samples_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_blocks_product_hero_samples"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_blocks_product_hero_samples_order_idx" ON "products_blocks_product_hero_samples" USING btree ("_order");
  CREATE INDEX "products_blocks_product_hero_samples_parent_id_idx" ON "products_blocks_product_hero_samples" USING btree ("_parent_id");
  CREATE INDEX "products_blocks_product_hero_samples_audio_idx" ON "products_blocks_product_hero_samples" USING btree ("audio_id");
  CREATE UNIQUE INDEX "products_blocks_product_hero_samples_locales_locale_parent_i" ON "products_blocks_product_hero_samples_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_blocks_product_hero_samples_order_idx" ON "_products_v_blocks_product_hero_samples" USING btree ("_order");
  CREATE INDEX "_products_v_blocks_product_hero_samples_parent_id_idx" ON "_products_v_blocks_product_hero_samples" USING btree ("_parent_id");
  CREATE INDEX "_products_v_blocks_product_hero_samples_audio_idx" ON "_products_v_blocks_product_hero_samples" USING btree ("audio_id");
  CREATE UNIQUE INDEX "_products_v_blocks_product_hero_samples_locales_locale_paren" ON "_products_v_blocks_product_hero_samples_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "products_blocks_product_hero_samples" CASCADE;
  DROP TABLE "products_blocks_product_hero_samples_locales" CASCADE;
  DROP TABLE "_products_v_blocks_product_hero_samples" CASCADE;
  DROP TABLE "_products_v_blocks_product_hero_samples_locales" CASCADE;`)
}

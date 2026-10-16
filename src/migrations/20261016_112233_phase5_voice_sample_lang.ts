import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_blocks_product_hero_samples_lang" AS ENUM('en', 'hi', 'hi-Latn');
  CREATE TYPE "public"."enum__products_v_blocks_product_hero_samples_lang" AS ENUM('en', 'hi', 'hi-Latn');
  ALTER TABLE "products_blocks_product_hero_samples" ADD COLUMN "lang" "enum_products_blocks_product_hero_samples_lang" DEFAULT 'en';
  ALTER TABLE "products_blocks_product_hero_samples" ADD COLUMN "transcript" varchar;
  ALTER TABLE "_products_v_blocks_product_hero_samples" ADD COLUMN "lang" "enum__products_v_blocks_product_hero_samples_lang" DEFAULT 'en';
  ALTER TABLE "_products_v_blocks_product_hero_samples" ADD COLUMN "transcript" varchar;
  ALTER TABLE "products_blocks_product_hero_samples_locales" DROP COLUMN "transcript";
  ALTER TABLE "_products_v_blocks_product_hero_samples_locales" DROP COLUMN "transcript";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_blocks_product_hero_samples_locales" ADD COLUMN "transcript" varchar;
  ALTER TABLE "_products_v_blocks_product_hero_samples_locales" ADD COLUMN "transcript" varchar;
  ALTER TABLE "products_blocks_product_hero_samples" DROP COLUMN "lang";
  ALTER TABLE "products_blocks_product_hero_samples" DROP COLUMN "transcript";
  ALTER TABLE "_products_v_blocks_product_hero_samples" DROP COLUMN "lang";
  ALTER TABLE "_products_v_blocks_product_hero_samples" DROP COLUMN "transcript";
  DROP TYPE "public"."enum_products_blocks_product_hero_samples_lang";
  DROP TYPE "public"."enum__products_v_blocks_product_hero_samples_lang";`)
}

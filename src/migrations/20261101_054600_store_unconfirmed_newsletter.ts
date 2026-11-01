import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * A newsletter sign-up's marketing consent is now recorded when it is confirmed (forms/handle.ts),
 * so sign-ups nobody confirmed stop counting as consenting in reports and exports. Data only: no
 * schema change, so no snapshot.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "leads"
    SET "marketing_consent_given" = false, "marketing_consent_at" = NULL,
        "marketing_consent_text_version" = NULL
    WHERE "type" = 'newsletter' AND "confirmed_at" IS NULL`)
}

// Nothing to put back: what this clears was never confirmed.
export async function down(_args: MigrateDownArgs): Promise<void> {}

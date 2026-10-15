/** TEST_DATABASE_URL, or DATABASE_URL pointed at the `jainav_test` database. */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL
  const url = new URL(
    process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/jainav',
  )
  url.pathname = '/jainav_test'
  return url.toString()
}

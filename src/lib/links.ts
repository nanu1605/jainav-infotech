/** Adds the link's UTM defaults unless the destination already sets them (spec §8.6). */
export function withUtm(
  destination: string,
  slug: string,
  utm:
    { source?: string | null; medium?: string | null; campaign?: string | null } | null | undefined,
) {
  const url = new URL(destination)
  const defaults = {
    utm_source: utm?.source || 'jainav',
    utm_medium: utm?.medium || 'site',
    utm_campaign: utm?.campaign || slug,
  }
  for (const [key, value] of Object.entries(defaults)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value)
  }
  return url.toString()
}

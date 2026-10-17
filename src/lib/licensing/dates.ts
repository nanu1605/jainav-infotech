// India has one time zone and no daylight saving: Asia/Kolkata is always UTC+05:30, so month
// and day boundaries there are fixed offsets from UTC.
const IST = (5 * 60 + 30) * 60_000

/** `date` plus `months` calendar months in India time; the 31st becomes the month's last day. */
export function addMonthsIST(date: Date, months: number): Date {
  const local = new Date(date.getTime() + IST)
  const year = local.getUTCFullYear()
  const month = local.getUTCMonth() + months
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(local.getUTCDate(), lastDay)
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      local.getUTCHours(),
      local.getUTCMinutes(),
      local.getUTCSeconds(),
      local.getUTCMilliseconds(),
    ) - IST,
  )
}

/** Midnight IST on the 1st of this month (`offset` 0) or a later one, as an instant. */
export function istMonthStart(now: Date, offset = 0): Date {
  const local = new Date(now.getTime() + IST)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offset, 1) - IST)
}

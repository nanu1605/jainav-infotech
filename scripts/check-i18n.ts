/** pnpm check:i18n — fails if messages/hi.json is missing a key that en.json has (spec §3, §6). */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

type Messages = { [key: string]: string | Messages }

const flatten = (obj: Messages, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : flatten(v, `${prefix}${k}.`),
  )

export function missingKeys(en: Messages, hi: Messages): string[] {
  const hiKeys = new Set(flatten(hi))
  return flatten(en).filter((key) => !hiKeys.has(key))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../messages')
  const load = (locale: string) =>
    JSON.parse(readFileSync(path.join(dir, `${locale}.json`), 'utf8'))
  const missing = missingKeys(load('en'), load('hi'))
  if (missing.length) {
    console.error(`check:i18n failed. messages/hi.json is missing:\n  ${missing.join('\n  ')}`)
    process.exit(1)
  }
  console.log('check:i18n passed.')
}

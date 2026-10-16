'use client'

import {
  Bell,
  Check,
  ChefHat,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react'
import { useReducedMotion, useScroll } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, type CSSProperties } from 'react'

import type { Locale } from '@/i18n/routing'
import { cn } from '@/lib/cn'
import { formatINR } from '@/lib/format'

import { frame, localProgress, playRange, QR_PATH, SCENES, type Part } from './menumesh/scenes'

type Dish = { key: string; paise: number; veg: boolean; order?: number }

/** Illustrative dishes (paise). `order` marks the two the guest adds, in order. */
const MENU: { section: string; dishes: Dish[] }[] = [
  {
    section: 'starters',
    dishes: [
      { key: 'paneerTikka', paise: 28000, veg: true },
      { key: 'chicken65', paise: 32000, veg: false },
    ],
  },
  { section: 'mains', dishes: [{ key: 'masalaDosa', paise: 18000, veg: true, order: 0 }] },
  { section: 'drinks', dishes: [{ key: 'coldCoffee', paise: 15000, veg: true, order: 1 }] },
]
const ORDERED = MENU.flatMap((s) => s.dishes).filter((d) => d.order !== undefined)
const TOTAL = ORDERED.reduce((sum, d) => sum + d.paise, 0)

/** The server-rendered still frame; scroll then rewrites these inline styles directly. */
const STILL = frame(0)
const part = (name: Part) => ({ 'data-part': name, style: STILL[name] as CSSProperties })

function VegMark({ veg }: { veg: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex size-[0.9em] shrink-0 items-center justify-center rounded-[0.15em] border-[0.1em]',
        veg ? 'border-success' : 'border-danger',
      )}
    >
      <span
        className={cn(
          'size-[0.4em]',
          veg ? 'rounded-full bg-success' : 'bg-danger [clip-path:polygon(50%_0,100%_100%,0_100%)]',
        )}
      />
    </span>
  )
}

/**
 * MenuMesh product hero animation (spec §14): a phone walks through scanning the table QR,
 * browsing the menu, adding to cart, and the order landing on a kitchen screen, scrubbed by page
 * scroll. Renders its own 4:3 panel (4:5 on phones) sized by container units, so it never shifts
 * layout. The server renders the still menu scene; scroll writes opacity/transform straight to
 * the parts (no React renders per frame). Reduced motion keeps the still, with the kitchen ticket
 * shown beside it (on phones, over the starters and without the QR card). Expects the product accent vars (accentVars) on an ancestor.
 */
export function MenuMeshDemo() {
  const t = useTranslations('ui.demo.menumesh')
  const locale = useLocale() as Locale
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const parts = [...root.querySelectorAll<HTMLElement>('[data-part]')]
    const paint = (progress: number) => {
      const styles = frame(progress)
      for (const el of parts) {
        const s = styles[el.dataset.part as Part]
        el.style.opacity = String(s.opacity)
        el.style.transform = s.transform
      }
    }
    if (reduce) return paint(0)

    let range = { start: 0, end: 1 }
    let last = -1
    const update = (y: number) => {
      const progress = localProgress(y, range)
      if (progress !== last) paint((last = progress))
    }
    // Layout is read only here, never per scroll frame. It uses the live window.scrollY: the
    // motion value is still 0 until useScroll's first frame read, so a page already scrolled at
    // hydration (reload, back/forward, slow chunk) would otherwise get a range off by that much.
    // ponytail: re-measured on resize only; a hero whose height changes later (late font swap)
    // plays slightly early or late until the next resize. Add a ResizeObserver if that shows.
    const measure = () => {
      const box = root.getBoundingClientRect()
      range = playRange(box.top + window.scrollY, box.height, innerHeight)
      update(window.scrollY)
    }
    measure()
    addEventListener('resize', measure)
    const unsubscribe = scrollY.on('change', update)
    return () => {
      removeEventListener('resize', measure)
      unsubscribe()
    }
  }, [reduce, scrollY])

  const price = (paise: number) => formatINR(locale, paise)

  return (
    <div
      ref={ref}
      role="img"
      aria-label={t('label')}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-border bg-surface shadow-lg [container-type:size] sm:aspect-[4/3]"
    >
      <div
        aria-hidden
        className="absolute inset-0 text-[length:2.2cqh] leading-normal text-fg select-none"
      >
        <div className="absolute inset-0 bg-product-accent opacity-10" />

        {/* Step captions, stacked in one cell so the largest sizes it. They sit at the bottom edge,
            which stays below the sticky header for the whole range, and never go under 14px. */}
        <div className="absolute bottom-[2.5%] left-[4%] grid text-[length:max(2.2cqh,0.875rem)] motion-reduce:hidden">
          {SCENES.map((scene, i) => (
            <p
              key={scene}
              {...part(`caption-${i}`)}
              className="flex items-center gap-[0.5em] font-semibold whitespace-nowrap [grid-area:1/1]"
            >
              <span className="grid size-[1.7em] place-items-center rounded-full bg-product-accent text-[0.85em] font-bold text-product-accent-fg">
                {i + 1}
              </span>
              {t(`steps.${scene}`)}
            </p>
          ))}
        </div>

        {/* Phone */}
        <div className="absolute inset-x-0 top-[2.5em] mx-auto h-[38em] w-[18.5em] rounded-[2.6em] border border-border-strong bg-bg-subtle p-[0.4em] shadow-lg">
          <div className="relative flex h-full flex-col overflow-hidden rounded-[2.2em] bg-surface ring-1 ring-border">
            <div className="flex h-[1.6em] shrink-0 items-center justify-center">
              <span className="h-[0.45em] w-[4em] rounded-full bg-border" />
            </div>
            <div className="flex h-[4em] shrink-0 items-center gap-[0.6em] border-b border-border px-[1em]">
              <span className="grid size-[2.4em] shrink-0 place-items-center rounded-[0.5em] bg-product-accent text-[1.1em] font-bold text-product-accent-fg">
                <UtensilsCrossed className="size-[0.9em]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[1.05em] font-semibold">
                  {t('restaurant')}
                </span>
                <span className="block truncate text-[0.8em] text-fg-muted">{t('table')}</span>
              </span>
              <span className="grid size-[2em] shrink-0 place-items-center rounded-full border border-border text-fg-muted">
                <Bell className="size-[1em]" />
              </span>
            </div>
            <div className="flex h-[3.2em] shrink-0 items-center gap-[0.4em] overflow-hidden border-b border-border px-[1em] text-[0.8em]">
              {MENU.map(({ section }, i) => (
                <span
                  key={section}
                  className={cn(
                    'flex h-[2.1em] items-center rounded-full border px-[0.9em] font-medium whitespace-nowrap',
                    i === 0
                      ? 'border-transparent bg-product-accent text-product-accent-fg'
                      : 'border-border',
                  )}
                >
                  {t(`categories.${section}`)}
                </span>
              ))}
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div {...part('list')} className="px-[1em] pb-[4.5em]">
                {MENU.map(({ section, dishes }) => (
                  <div key={section}>
                    <p className="flex h-[2.4em] items-end pb-[0.2em] font-bold">
                      {t(`categories.${section}`)}
                    </p>
                    {dishes.map((dish) => (
                      <div
                        key={dish.key}
                        className="flex h-[5.4em] items-center gap-[0.6em] border-b border-border last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-[0.4em] text-[0.95em] font-semibold">
                            <VegMark veg={dish.veg} />
                            <span className="truncate">{t(`dishes.${dish.key}.name`)}</span>
                          </p>
                          <p className="text-[0.85em] font-medium">{price(dish.paise)}</p>
                          <p className="line-clamp-2 text-[0.72em] text-fg-muted">
                            {t(`dishes.${dish.key}.description`)}
                          </p>
                        </div>
                        <div className="grid h-[2.1em] w-[4.6em] shrink-0 text-[0.85em] font-semibold">
                          <span
                            {...(dish.order === undefined ? {} : part(`add-${dish.order}`))}
                            className="grid place-items-center rounded-[0.45em] bg-product-accent text-product-accent-fg [grid-area:1/1]"
                          >
                            {t('add')}
                          </span>
                          {dish.order !== undefined && (
                            <span
                              {...part(`step-${dish.order}`)}
                              className="flex items-center justify-between rounded-[0.45em] border border-border-strong bg-surface px-[0.4em] [grid-area:1/1]"
                            >
                              <Minus className="size-[0.9em]" />1
                              <Plus className="size-[0.9em]" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div
                {...part('cart')}
                className="absolute inset-x-[0.7em] bottom-[0.7em] flex h-[3.4em] items-center justify-between gap-[0.5em] rounded-[0.8em] bg-product-accent px-[0.7em] text-[0.85em] font-semibold whitespace-nowrap text-product-accent-fg shadow-md"
              >
                {/* Only the item count may truncate; the total always shows in full. */}
                <span className="flex min-w-0 items-center gap-[0.3em]">
                  <ShoppingBag className="size-[1.1em] shrink-0" />
                  <span className="truncate">{t('items')} ·</span>
                  <span className="shrink-0">{price(TOTAL)}</span>
                </span>
                <span className="grid justify-items-end">
                  <span {...part('cart-order')} className="flex items-center [grid-area:1/1]">
                    {t('placeOrder')}
                    <ChevronRight className="size-[1.1em]" />
                  </span>
                  <span
                    {...part('cart-sent')}
                    className="flex items-center gap-[0.3em] [grid-area:1/1]"
                  >
                    <Check className="size-[1.1em]" />
                    {t('sent')}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* The table's QR card (scene 1) */}
        <div
          {...part('qr')}
          className="absolute bottom-[12%] left-[5%] w-[10.5em] motion-reduce:max-sm:hidden -rotate-3 rounded-[0.9em] border border-border bg-surface-raised p-[0.9em] text-center shadow-lg"
        >
          <p className="text-[1.05em] font-bold">{t('table')}</p>
          <div className="relative mx-auto my-[0.5em] size-[7.4em] p-[0.4em]">
            {[
              'top-0 left-0 border-t border-l',
              'top-0 right-0 border-t border-r',
              'bottom-0 left-0 border-b border-l',
              'bottom-0 right-0 border-b border-r',
            ].map((corner) => (
              <span
                key={corner}
                className={cn(
                  'absolute size-[1.4em] border-product-accent [border-width:0.2em]',
                  corner,
                )}
              />
            ))}
            <svg
              viewBox="-1 -1 23 23"
              fill="currentColor"
              shapeRendering="crispEdges"
              className="size-full text-fg"
            >
              <path d={QR_PATH} />
            </svg>
          </div>
          <p className="text-[0.75em] text-fg-muted">{t('scanToOrder')}</p>
        </div>

        {/* The kitchen screen's new ticket (scene 4); shown statically with reduced motion, over
            the starters on phones (no room beside the phone there) so the ordered dishes show. */}
        <div
          {...part('ticket')}
          className="absolute right-[4%] bottom-[14%] w-[17em] overflow-hidden rounded-[0.9em] border border-border bg-surface-raised shadow-lg motion-reduce:opacity-100! motion-reduce:transform-none! motion-reduce:max-sm:bottom-[42%]"
        >
          <div className="flex h-[2.4em] items-center gap-[0.4em] border-b border-border bg-bg-subtle px-[0.9em] text-[0.85em] font-semibold">
            <ChefHat className="size-[1.1em] text-product-accent-text" />
            <span className="flex-1">{t('kitchen')}</span>
            <span className="rounded-full bg-product-accent px-[0.6em] text-[0.85em] text-product-accent-fg">
              {t('new')}
            </span>
          </div>
          <div className="border-s-[0.3em] border-product-accent p-[0.9em]">
            <p className="flex items-baseline gap-[0.4em]">
              <span className="text-[1.3em] font-bold">{t('table')}</span>
              <span className="flex-1 text-[0.8em] text-fg-muted">· {t('round')}</span>
              <span className="text-[0.75em] text-fg-muted">{t('now')}</span>
            </p>
            {ORDERED.map((dish) => (
              <p
                key={dish.key}
                className="mt-[0.45em] flex items-center gap-[0.5em] rounded-[0.5em] border border-border px-[0.6em] py-[0.3em] text-[0.85em]"
              >
                <VegMark veg={dish.veg} />
                <span className="truncate">
                  {t('ticketLine', { count: 1, dish: t(`dishes.${dish.key}.name`) })}
                </span>
              </p>
            ))}
            <p className="mt-[0.6em] grid h-[2.2em] place-items-center rounded-[0.5em] border border-border bg-bg-subtle text-[0.8em] font-semibold">
              {t('start')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

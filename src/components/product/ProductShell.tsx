import type { CSSProperties, ReactNode } from 'react'

import { ProductSubNav, type ProductSubNavProps } from '@/components/layout/ProductSubNav'
import { accentVars } from '@/lib/accent'
import type { LoadedProduct } from '@/lib/product'

/** A product page's <main>: accent colors for every block, and the sub-nav for hosted products. */
export function ProductShell({
  loaded,
  active,
  children,
}: {
  loaded: LoadedProduct
  active: ProductSubNavProps['active']
  children: ReactNode
}) {
  const { product } = loaded
  return (
    <main
      id="main"
      className="scroll-mt-16"
      style={accentVars(product.accentColor) as CSSProperties}
    >
      {product.hostingMode === 'hosted' && (
        <ProductSubNav slug={product.slug} name={product.name} active={active} />
      )}
      {children}
    </main>
  )
}

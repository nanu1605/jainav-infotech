import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/** False in the server HTML and until the component hydrates, then true. */
export const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

import { useEffect, useState } from 'react'
import {
  fallbackStripeCatalog,
  loadStripeCatalog,
  type StripeCatalog,
} from '@/lib/stripe-catalog'

export function useStripeCatalog() {
  const [catalog, setCatalog] = useState<StripeCatalog>(() => fallbackStripeCatalog())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void loadStripeCatalog().then((next) => {
      if (!cancelled) {
        setCatalog(next)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { catalog, loading }
}

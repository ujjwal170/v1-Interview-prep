import { useState, useEffect, useCallback } from 'react'

export function useAsyncResource(asyncFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const run = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    asyncFn()
      .then((d) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setError(e); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  useEffect(() => run(), [])

  return { data, loading, error, refetch: run }
}

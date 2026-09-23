import { useEffect, useState } from 'react'

/**
 * public/data/*.json 을 fetch하는 공용 훅.
 * base 경로(GitHub Pages 하위 경로 포함)를 자동으로 붙입니다.
 */
export function useData(fileName) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const url = `${import.meta.env.BASE_URL}data/${fileName}`

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${fileName}을(를) 불러오지 못했습니다 (${res.status})`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fileName])

  return { data, error, loading }
}

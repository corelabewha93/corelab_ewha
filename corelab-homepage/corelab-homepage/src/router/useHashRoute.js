import { useEffect, useState, useCallback } from 'react'

/**
 * 아주 단순한 해시 기반 라우터.
 * "#/research?tab=projects" 같은 주소를 { path: "/research", query: { tab: "projects" } }로 파싱합니다.
 */
function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, queryString] = raw.split('?')
  const query = Object.fromEntries(new URLSearchParams(queryString ?? ''))
  return { path: path || '/', query }
}

export function useHashRoute() {
  const [route, setRoute] = useState(parseHash)

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return route
}

/** 탭 페이지에서 쓰는 헬퍼: 현재 탭을 읽고, 클릭 시 쿼리만 바꿔 히스토리에 남기지 않고 전환합니다. */
export function useQueryTab(path, tabKeys, defaultTab) {
  const { query } = useHashRoute()
  const current = tabKeys.includes(query.tab) ? query.tab : defaultTab

  const setTab = useCallback(
    (tab) => {
      window.location.hash = `${path}?tab=${tab}`
    },
    [path],
  )

  return [current, setTab]
}

export function navigate(path) {
  window.location.hash = path
}

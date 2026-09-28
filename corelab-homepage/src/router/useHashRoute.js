import { useEffect, useState, useCallback } from 'react'

/**
 * 주소창에 #(해시) 없이 깔끔한 경로("corelab.ewha.ac.kr/news")로 동작하는 라우터입니다.
 * (예전엔 "#/news" 같은 해시 방식이었는데, 검색엔진이 페이지를 제대로 구분 못 하는 문제가 있어
 *  진짜 주소(pathname) 기반으로 바꿨습니다.)
 *
 * GitHub Pages는 정적 호스팅이라 "/news"로 직접 들어오거나 새로고침하면 원래는 404가 뜨는데,
 * public/404.html + index.html의 복원 스크립트가 이를 보완해줍니다.
 */

// 빌드 시 정해지는 배포 경로. 커스텀 도메인(corelab.ewha.ac.kr)에서는 '/',
// GitHub 기본 주소(계정.github.io/저장소이름/)에서는 '/저장소이름/'.
const BASE = import.meta.env.BASE_URL

function stripBase(pathname) {
  if (BASE !== '/' && pathname.startsWith(BASE)) {
    return `/${pathname.slice(BASE.length)}`
  }
  return pathname
}

/** 라우터 안에서 쓰는 경로 앞에 배포 경로(BASE)를 붙여, 실제 주소창에 쓸 값을 만듭니다. */
export function withBase(path) {
  return BASE === '/' ? path : `${BASE.replace(/\/$/, '')}${path}`
}

function parseLocation() {
  const path = stripBase(window.location.pathname) || '/'
  const query = Object.fromEntries(new URLSearchParams(window.location.search))
  return { path, query }
}

// history.pushState/replaceState는 popstate 이벤트를 스스로 내지 않으므로,
// navigate()를 부를 때마다 이 이벤트를 직접 쏴서 구독 중인 컴포넌트들에 새 주소를 알립니다.
const LOCATION_CHANGE = 'corelab:locationchange'

export function useHashRoute() {
  const [route, setRoute] = useState(parseLocation)

  useEffect(() => {
    const onChange = () => setRoute(parseLocation())
    window.addEventListener('popstate', onChange) // 뒤로/앞으로 가기
    window.addEventListener(LOCATION_CHANGE, onChange) // navigate() 호출
    return () => {
      window.removeEventListener('popstate', onChange)
      window.removeEventListener(LOCATION_CHANGE, onChange)
    }
  }, [])

  return route
}

/** 탭 페이지에서 쓰는 헬퍼: 현재 탭을 읽고, 클릭 시 쿼리만 바꿔 전환합니다. */
export function useQueryTab(path, tabKeys, defaultTab) {
  const { query } = useHashRoute()
  const current = tabKeys.includes(query.tab) ? query.tab : defaultTab

  const setTab = useCallback(
    (tab) => {
      navigate(`${path}?tab=${tab}`)
    },
    [path],
  )

  return [current, setTab]
}

/** 새로고침 없이 주소를 바꿉니다. path는 "/news"나 "/news?id=123"처럼 씁니다. */
export function navigate(path) {
  window.history.pushState(null, '', withBase(path))
  window.dispatchEvent(new Event(LOCATION_CHANGE))
}

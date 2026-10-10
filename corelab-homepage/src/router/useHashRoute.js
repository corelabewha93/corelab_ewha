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

// GitHub Pages는 "/research"를 "/research/"로 한 번 바꿔 보냅니다 (링크 미리보기용 페이지가 그 폴더에 있어서).
// 화면은 같으므로, 주소창에서만 끝의 "/"를 조용히 지워 깔끔하게 둡니다.
if (typeof window !== 'undefined') {
  const { pathname, search, hash } = window.location
  if (pathname.length > 1 && pathname.endsWith('/') && pathname !== BASE) {
    window.history.replaceState(window.history.state, '', pathname.replace(/\/+$/, '') + search + hash)
  }
}

function parseLocation() {
  let path = stripBase(window.location.pathname) || '/'
  // 뒤에 "/"가 붙어도(예: "/news/") 같은 페이지로 봅니다.
  // (news/people/lablife는 업로드된 사진을 담는 폴더 이름과 같아서, GitHub Pages가
  //  "/news"를 "/news/"로 한 번 바꿔 보내는 경우가 있었습니다.)
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
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

/**
 * 소식 한 건의 주소: /news/소식id
 * (예전 주소 /news?id=소식id 도 그대로 열립니다.) 소식마다 주소가 달라야
 * 카카오톡 등에 붙여 넣었을 때 그 소식의 제목·사진으로 미리보기가 뜹니다 (vite.config.js의 linkPreviewPagesPlugin).
 */
export function newsHref(id) {
  return `/news/${encodeURIComponent(id)}`
}

/** 지금 주소에서 열려 있는 소식 id (/news/소식id 또는 /news?id=소식id). 없으면 '' */
export function openNewsId({ path, query }) {
  if (path.startsWith('/news/')) {
    try {
      return decodeURIComponent(path.slice(6))
    } catch {
      return path.slice(6)
    }
  }
  return query.id ?? ''
}

/** 새로고침 없이 주소를 바꿉니다. path는 "/news"나 "/news?id=123"처럼 씁니다. */
export function navigate(path) {
  window.history.pushState(null, '', withBase(path))
  window.dispatchEvent(new Event(LOCATION_CHANGE))
}

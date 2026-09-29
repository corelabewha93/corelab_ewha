/**
 * "옛날 화면 자동 새로고침" 장치.
 *
 * 휴대폰 브라우저(특히 카카오톡 안에서 여는 브라우저)는 예전에 받아 둔 화면을 오래 붙들고 있어서,
 * 새 버전을 올려도 폰에서는 옛날 모습이 그대로 보이는 일이 있습니다.
 * 그래서 화면이 열릴 때(그리고 앱을 다시 열었을 때) 서버의 version.json을 확인해,
 * 지금 보고 있는 화면보다 새 버전이 올라와 있으면 자동으로 새 화면으로 바꿉니다.
 * (같은 버전으로는 한 번만 시도하므로 무한 새로고침은 일어나지 않습니다.)
 */
const GUARD_KEY = 'corelab_reloaded_for'

async function check() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const { id } = await res.json()
    if (!id || id === __BUILD_ID__) return

    try {
      if (sessionStorage.getItem(GUARD_KEY) === id) return
      sessionStorage.setItem(GUARD_KEY, id)
    } catch {
      /* 저장소를 못 쓰는 환경이면 그냥 시도합니다 */
    }
    const url = new URL(window.location.href)
    url.searchParams.set('_v', id) // 주소가 달라지면 폰이 저장해 둔 옛날 화면을 쓰지 못하고 새로 받아옵니다
    window.location.replace(url.toString())
  } catch {
    /* 인터넷이 불안정하면 조용히 넘어갑니다 */
  }
}

export function startVersionCheck() {
  if (import.meta.env.DEV) return
  check()
  window.addEventListener('pageshow', (e) => e.persisted && check())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
}

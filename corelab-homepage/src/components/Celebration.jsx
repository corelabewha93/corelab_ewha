import { useEffect } from 'react'
import { findActiveEvent } from './celebration/events'
import { useLang } from '../i18n/LangContext'

/**
 * 기념일 효과 (임규연 교수님 생신 11/14 · 스승의 날 5/15).
 * - 한국 시간 기준으로 그날 하루 동안만 켜지고, 매년 자동으로 돌아옵니다.
 * - 평소(다른 날)에는 아무것도 불러오지 않아 사이트 속도에 영향이 없습니다.
 * - 같은 브라우저에서는 그날 처음 들어올 때만 큰 축하 화면이 나오고, 이후에는 배너·풍선·색종이만 은은하게 남습니다.
 * - 배너의 × 를 누르면 그 탭에서는 꺼집니다. (화면 움직임을 줄이는 설정을 쓰는 분께는 효과 없이 배너만 보입니다.)
 * - 미리보기: 주소 뒤에 ?celebrate=birthday 또는 ?celebrate=teachers
 */

const memory = new Set()

function store(kind) {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function seen(key) {
  try {
    return memory.has(key) || store('local')?.getItem(key) === '1'
  } catch {
    return memory.has(key)
  }
}

function markSeen(key) {
  memory.add(key)
  try {
    store('local')?.setItem(key, '1')
  } catch {
    /* 저장이 안 돼도 이번 방문 동안은 한 번만 나옵니다. */
  }
}

export default function Celebration() {
  const { en } = useLang()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const forced = params.get('celebrate')
    const found = findActiveEvent(forced)
    if (!found) return undefined
    // 영어 화면이면 영어 문구로
    const ev = en
      ? {
          ...found,
          sub: found.subEn ?? found.sub,
          messages: found.messagesEn ?? found.messages,
          replayLabel: found.replayLabelEn ?? found.replayLabel,
        }
      : found

    const closedKey = `corelab-celebrate-closed-${ev.id}`
    if (!forced) {
      try {
        if (store('session')?.getItem(closedKey) === '1') return undefined
      } catch {
        /* noop */
      }
    }

    const seenKey = `corelab-celebrate-${ev.id}-${new Date().getFullYear()}`
    const quick = !forced && seen(seenKey)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    let controller = null
    let cancelled = false

    ;(async () => {
      // 큰 글씨 폰트가 준비된 뒤 시작해야 글자가 갑자기 바뀌어 보이지 않습니다.
      try {
        await Promise.race([
          document.fonts?.load("600 80px 'Playfair Display'"),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ])
      } catch {
        /* 폰트가 늦어도 그냥 진행합니다. */
      }
      if (cancelled) return
      const { startCelebration } = await import('./celebration/engine')
      if (cancelled) return
      controller = startCelebration(ev, {
        quick,
        reduced,
        onClose: () => {
          try {
            store('session')?.setItem(closedKey, '1')
          } catch {
            /* noop */
          }
        },
      })
      if (!quick && !reduced) markSeen(seenKey)
      if (forced) window.__corelabCelebrate = controller // 미리보기·점검용
    })()

    return () => {
      cancelled = true
      controller?.destroy()
      if (window.__corelabCelebrate === controller) delete window.__corelabCelebrate
    }
  }, [en])

  return null
}

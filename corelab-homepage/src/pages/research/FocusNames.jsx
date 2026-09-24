import { normalizeName } from './authorMatch'

/** 이름 목록을 쉼표로 이어 보여주되, 모아보기 중인 사람 이름만 초록색으로 살짝 구분합니다. */
export default function FocusNames({ names = [], focus }) {
  return names.map((n, i) => (
    <span key={i}>
      {i > 0 && ', '}
      {focus?.has(normalizeName(n)) ? <mark className="pub-hl-author">{n}</mark> : n}
    </span>
  ))
}

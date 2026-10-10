import { normalizeName } from './authorMatch'
import { useNameEn } from '../../i18n/LangContext'

/** 이름 목록을 쉼표로 이어 보여주되, 모아보기 중인 사람 이름만 초록색으로 살짝 구분합니다. */
export default function FocusNames({ names = [], focus }) {
  const show = useNameEn() // 영어 화면: 구성원 이름은 영문 이름으로
  return names.map((n, i) => (
    <span key={i}>
      {i > 0 && ', '}
      {focus?.has(normalizeName(n)) ? <mark className="pub-hl-author">{show(n)}</mark> : show(n)}
    </span>
  ))
}

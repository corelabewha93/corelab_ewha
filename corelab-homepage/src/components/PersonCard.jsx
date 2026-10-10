import { useEffect, useState } from 'react'
import SafeImage from './SafeImage'
import { EditButton } from './admin/AdminControls'
import { cropToStyle, normalizeCrop } from '../admin/photoCrop'
import { navigate, withBase } from '../router/useHashRoute'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { useLang } from '../i18n/LangContext'

/** 사진을 넣지 않은(또는 사진을 못 불러온) 사람에게 자동으로 보여줄 이화 심벌 기본 사진 */
const DEFAULT_PHOTO = 'images/people/default-ewha.jpg'

/** Research 페이지에서 이 사람 이름이 올라간 논문·저역서·특허를 모아 보여주는 링크. */
function researchLinkFor(name) {
  return `/research?author=${encodeURIComponent(name)}`
}

function initials(name) {
  if (!name) return '?'
  return name.trim().slice(0, 1)
}

/** "내용 | 날짜" 형태의 줄을 라벨/날짜로 나눕니다. "|"가 없으면 날짜 없이 라벨만 표시합니다. */
function splitHistoryLine(line) {
  const idx = line.indexOf('|')
  if (idx === -1) return { label: line.trim(), date: '' }
  return { label: line.slice(0, idx).trim(), date: line.slice(idx + 1).trim() }
}

/** 교수 프로필: 사진 + 이름 + 연락처 + 소개 + 연구관심분야를 한 화면에 바로 보여줍니다. */
function FacultyProfile({ person: raw, onEdit, reorder }) {
  const { tr, loc } = useLang()
  const person = loc(raw, 'people')
  const contactLines = [person.email, person.office, person.phone].filter(Boolean)
  const interests = Array.isArray(person.researchInterests) ? person.researchInterests : []
  const education = Array.isArray(person.education) ? person.education : []
  const career = Array.isArray(person.career) ? person.career : []
  const awards = Array.isArray(person.awards) ? person.awards : []
  const hasHistory = education.length > 0 || career.length > 0 || awards.length > 0

  return (
    <div className="faculty-profile admin-item">
      {!reorder && <EditButton onClick={() => onEdit?.(raw)} label={`${raw.name} 정보 수정`} />}

      <div className="faculty-photo">
        <SafeImage
          src={person.photo}
          alt={person.name}
          fallbackSrc={DEFAULT_PHOTO}
            fallback={<span>{initials(person.name)}</span>}
          imgStyle={cropToStyle(normalizeCrop(person))}
        />
      </div>

      <div className="faculty-info">
        <h2 className="faculty-name">{person.name}</h2>
        {person.position && <p className="faculty-position">{person.position}</p>}
        {person.affiliation && <p className="faculty-affiliation">{person.affiliation}</p>}

        <div className="faculty-rule" />

        {person.bio && <p className="faculty-bio">{person.bio}</p>}

        {(contactLines.length > 0 || interests.length > 0) && (
          <div className="faculty-meta">
            {contactLines.length > 0 && (
              <ul className="faculty-contact">
                {contactLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
            {interests.length > 0 && (
              <div className="faculty-interests">
                <span className="faculty-meta-label">{tr('연구관심분야', 'Research Interests')}</span>
                <div>
                  {interests.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {person.scholarLink && (
          <p className="faculty-scholar">
            <a href={person.scholarLink} target="_blank" rel="noreferrer">
              Google Scholar →
            </a>
          </p>
        )}

        {hasHistory && (
          <div className="faculty-history-table">
            {education.length > 0 && (
              <div className="faculty-history-col">
                <h4>{tr('학력', 'Education')}</h4>
                <ul>
                  {education.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            {awards.length > 0 && (
              <div className="faculty-history-col">
                <h4>{tr('교내수상이력', 'Awards')}</h4>
                <ul>
                  {awards.map((line, i) => {
                    const { label, date } = splitHistoryLine(line)
                    return (
                      <li key={i} className="faculty-history-row">
                        <span className="faculty-history-label">{label}</span>
                        {date && <span className="faculty-history-date">{date}</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {career.length > 0 && (
              <div className="faculty-history-col">
                <h4>{tr('경력', 'Career')}</h4>
                <ul>
                  {career.map((line, i) => {
                    const { label, date } = splitHistoryLine(line)
                    return (
                      <li key={i} className="faculty-history-row">
                        <span className="faculty-history-label">{label}</span>
                        {date && <span className="faculty-history-date">{date}</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {reorder && (
        <div className="reorder-controls">
          <button type="button" onClick={() => reorder.move(-1)} disabled={!reorder.canPrev} aria-label="앞으로">
            ◀
          </button>
          <button type="button" onClick={() => reorder.move(1)} disabled={!reorder.canNext} aria-label="뒤로">
            ▶
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * 팝업 맨 아래 "OOO의 연구 실적 보기" 줄.
 * person.hideResearch가 'hidden'이면 방문자에게는 아예 보이지 않고,
 * 관리자에게는 흐리게 보이면서 "표시하기" 버튼이 붙습니다.
 */
function ResearchLinkRow({ person, displayName, onToggleResearch }) {
  const { isAdmin } = useAdminAuth()
  const { tr } = useLang()
  const hidden = Boolean(person.hideResearch)
  if (hidden && !isAdmin) return null

  return (
    <li className={`person-detail-pub${hidden ? ' is-hidden' : ''}`}>
      <a
        href={withBase(researchLinkFor(person.name))}
        className="person-detail-link"
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
          e.preventDefault()
          navigate(researchLinkFor(person.name))
        }}
      >
        {tr(`${person.name}의 연구 실적 보기 →`, `Publications by ${displayName || person.name} →`)}
      </a>
      {isAdmin && onToggleResearch && (
        <span className="person-pub-admin">
          {hidden && <span className="person-pub-hidden-note">방문자에게 숨김</span>}
          <button
            type="button"
            className={`person-pub-toggle${hidden ? ' is-hidden' : ''}`}
            onClick={() => onToggleResearch(person)}
            title={hidden ? '방문자에게 다시 보이게 합니다' : '이 사람의 연구 실적 모아보기를 방문자에게 숨깁니다'}
          >
            {hidden ? '표시하기' : '숨기기'}
          </button>
        </span>
      )}
    </li>
  )
}

/** 사진 + 이름을 누르면 뜨는 팝업. 사진과 함께 전체 이력을 한 화면에 보여줍니다. */
function PersonModal({ person, view, expandLines, links, onClose, onToggleResearch }) {
  const { en, tr } = useLang()
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // 팝업이 열려 있는 동안 뒤 화면을 그 자리에 고정합니다.
  // (휴대폰에서 이력을 스크롤할 때 뒤 화면과 위쪽 메뉴가 같이 움직이는 걸 막습니다.)
  useEffect(() => {
    const body = document.body
    const scrollY = window.scrollY
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    // 화면을 이렇게 고정하면 맨 위의 CoRe Lab 헤더가 같이 위로 밀려 사라지므로,
    // 스크롤했던 만큼 헤더를 아래로 내려 항상 화면 맨 위에 보이게 합니다. (global.css의 modal-locked)
    const root = document.documentElement
    root.style.setProperty('--lock-y', `${scrollY}px`)
    root.classList.add('modal-locked')
    return () => {
      root.classList.remove('modal-locked')
      root.style.removeProperty('--lock-y')
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.width = prev.width
      body.style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  return (
    <div className="person-modal-overlay" onClick={onClose}>
      <div className="person-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="person-modal-close" onClick={onClose} aria-label={tr('닫기', 'Close')}>
          ×
        </button>

        <div className="person-modal-head">
        <div className="person-modal-photo">
          <SafeImage
            src={person.photo}
            alt={person.name}
            fallbackSrc={DEFAULT_PHOTO}
            fallback={<span>{initials(person.name)}</span>}
            imgStyle={cropToStyle(normalizeCrop(person))}
          />
        </div>

          <h2 className="person-modal-name">{view.name}</h2>
          {!en && person.nameEn && <p className="person-modal-name-en">{person.nameEn}</p>}
        </div>

        <div className="person-modal-scroll">
          <ul className="person-detail">
            {expandLines.map((line, i) =>
              line.kind === 'link' ? (
                <li key={i}>
                  <a href={line.url} target="_blank" rel="noreferrer" className="person-detail-link">
                    {line.text}
                  </a>
                </li>
              ) : (
                <li key={i} className={line.kind !== 'normal' ? `person-detail-${line.kind}` : undefined}>
                  {line.text}
                </li>
              )
            )}
            {links.map((l, i) => (
              <li key={`link-${i}`}>
                <a href={l.url} target="_blank" rel="noreferrer" className="person-detail-link">
                  {l.label || l.url}
                </a>
              </li>
            ))}
            <ResearchLinkRow person={person} displayName={view.name} onToggleResearch={onToggleResearch} />
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * category에 따라 보이는 정보가 달라집니다.
 * - faculty          : 사진·연락처·소개가 모두 펼쳐진 프로필 카드 (FacultyProfile)
 * - students/alumni  : 평소엔 사진 · 이름만. 누르면 팝업으로 사진과 함께 전체 이력이 뜹니다.
 */
export default function PersonCard({ person, category, onEdit, onToggleResearch, reorder }) {
  const [open, setOpen] = useState(false)
  const { isAdmin } = useAdminAuth()
  const { loc } = useLang()
  // 화면에 보여줄 값(영어 화면이면 영문 칸). 편집·연구 실적 검색에는 원래 값(person)을 씁니다.
  const view = loc(person, 'people')

  if (category === 'faculty') {
    return <FacultyProfile person={person} onEdit={onEdit} reorder={reorder} />
  }

  const isAlumni = category === 'alumni'
  const detail = Array.isArray(view.detail) ? view.detail : []
  const links = Array.isArray(person.links) ? person.links.filter((l) => l.url) : []

  // 팝업에 순서대로 표시: 한 줄 소개(굵게) → (Alumni만) 현재 직장 → #소제목으로 구분한 자유 이력
  const expandLines = []
  if (view.bio) expandLines.push({ text: view.bio, kind: 'intro' })
  if (isAlumni && view.affiliation) expandLines.push({ text: view.affiliation, kind: 'strong' })
  detail.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      expandLines.push({ text: trimmed.replace(/^#+\s*/, ''), kind: 'heading' })
      return
    }
    const { label, date: url } = splitHistoryLine(trimmed)
    if (url && /^https?:\/\//i.test(url)) {
      expandLines.push({ text: label || url, url, kind: 'link' })
    } else {
      expandLines.push({ text: line, kind: 'normal' })
    }
  })

  // 팝업에 보여줄 내용이 하나라도 있으면 열립니다.
  // (연구 실적 링크를 숨긴 사람도 관리자에게는 링크 줄이 보이므로 항상 열립니다.)
  const researchVisible = !person.hideResearch || isAdmin
  const expandable = researchVisible || expandLines.length > 0 || links.length > 0
  const openModal = () => expandable && setOpen(true)

  return (
    <div className={`person-card${reorder ? ' reordering' : ''}`}>
      {!reorder && <EditButton onClick={() => onEdit?.(person)} label={`${person.name} 정보 수정`} />}

      <button
        type="button"
        className="person-photo-btn"
        onClick={openModal}
        disabled={!expandable || Boolean(reorder)}
      >
        <div className="person-photo">
          <SafeImage
            src={person.photo}
            alt={view.name}
            fallbackSrc={DEFAULT_PHOTO}
            fallback={<span>{initials(view.name)}</span>}
            imgStyle={cropToStyle(normalizeCrop(person))}
          />
        </div>
      </button>

      <button type="button" className="person-name-btn" onClick={openModal} disabled={!expandable || Boolean(reorder)}>
        <span className="person-name">{view.name}</span>
      </button>

      {isAdmin && person.hideResearch && !reorder && (
        <span className="person-card-flag" title="이 사람의 연구 실적 모아보기가 방문자에게 숨겨져 있어요">
          실적 모아보기 숨김
        </span>
      )}

      {expandable && open && !reorder && (
        <PersonModal
          person={person}
          view={view}
          expandLines={expandLines}
          links={links}
          onClose={() => setOpen(false)}
          onToggleResearch={onToggleResearch}
        />
      )}

      {reorder && (
        <div className="reorder-controls">
          <button type="button" onClick={() => reorder.move(-1)} disabled={!reorder.canPrev} aria-label="앞으로">
            ◀
          </button>
          <button type="button" onClick={() => reorder.move(1)} disabled={!reorder.canNext} aria-label="뒤로">
            ▶
          </button>
        </div>
      )}
    </div>
  )
}

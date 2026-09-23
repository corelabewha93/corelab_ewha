import { useState } from 'react'
import SafeImage from './SafeImage'
import { EditButton } from './admin/AdminControls'
import { cropToStyle, normalizeCrop } from '../admin/photoCrop'

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
function FacultyProfile({ person, onEdit, reorder }) {
  const contactLines = [person.email, person.office, person.phone].filter(Boolean)
  const interests = Array.isArray(person.researchInterests) ? person.researchInterests : []
  const education = Array.isArray(person.education) ? person.education : []
  const career = Array.isArray(person.career) ? person.career : []
  const awards = Array.isArray(person.awards) ? person.awards : []
  const hasHistory = education.length > 0 || career.length > 0 || awards.length > 0

  return (
    <div className="faculty-profile admin-item">
      {!reorder && <EditButton onClick={() => onEdit?.(person)} label={`${person.name} 정보 수정`} />}

      <div className="faculty-photo">
        <SafeImage
          src={person.photo}
          alt={person.name}
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
                <span className="faculty-meta-label">연구관심분야</span>
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
                <h4>학력</h4>
                <ul>
                  {education.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            {awards.length > 0 && (
              <div className="faculty-history-col">
                <h4>교내수상이력</h4>
                <ul>
                  {awards.map((line, i) => {
                    const { label, date } = splitHistoryLine(line)
                    return (
                      <li key={i} className="faculty-history-row">
                        <span>{label}</span>
                        {date && <span className="faculty-history-date">{date}</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {career.length > 0 && (
              <div className="faculty-history-col">
                <h4>경력</h4>
                <ul>
                  {career.map((line, i) => {
                    const { label, date } = splitHistoryLine(line)
                    return (
                      <li key={i} className="faculty-history-row">
                        <span>{label}</span>
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
 * category에 따라 보이는 정보가 달라집니다.
 * - faculty          : 사진·연락처·소개가 모두 펼쳐진 프로필 카드 (FacultyProfile)
 * - students/alumni  : 평소엔 사진 · 이름만. 펼치면 한 줄 소개(굵게) → (Alumni만) 현재 직장 → #소제목으로 구분한 자유 이력
 */
export default function PersonCard({ person, category, onEdit, reorder }) {
  const [open, setOpen] = useState(false)

  if (category === 'faculty') {
    return <FacultyProfile person={person} onEdit={onEdit} reorder={reorder} />
  }

  const isAlumni = category === 'alumni'
  const detail = Array.isArray(person.detail) ? person.detail : []
  const links = Array.isArray(person.links) ? person.links.filter((l) => l.url) : []

  // 이름/사진을 눌러 펼치면: 한 줄 소개(굵게) → (Alumni만) 현재 직장 → #소제목으로 구분한 자유 이력
  const expandLines = []
  if (person.bio) expandLines.push({ text: person.bio, kind: 'intro' })
  if (isAlumni && person.affiliation) expandLines.push({ text: person.affiliation, kind: 'strong' })
  detail.forEach((line) => {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      expandLines.push({ text: trimmed.replace(/^#+\s*/, ''), kind: 'heading' })
    } else {
      expandLines.push({ text: line, kind: 'normal' })
    }
  })

  const expandable = expandLines.length > 0 || links.length > 0
  const toggle = () => expandable && setOpen((v) => !v)

  return (
    <div className={`person-card${reorder ? ' reordering' : ''}`}>
      {!reorder && <EditButton onClick={() => onEdit?.(person)} label={`${person.name} 정보 수정`} />}

      <button
        type="button"
        className="person-photo-btn"
        onClick={toggle}
        disabled={!expandable || Boolean(reorder)}
        aria-expanded={expandable ? open : undefined}
      >
        <div className="person-photo">
          <SafeImage
            src={person.photo}
            alt={person.name}
            fallback={<span>{initials(person.name)}</span>}
            imgStyle={cropToStyle(normalizeCrop(person))}
          />
        </div>
      </button>

      <button type="button" className="person-name-btn" onClick={toggle} disabled={!expandable || Boolean(reorder)}>
        <span className="person-name">{person.name}</span>
        {expandable && !reorder && <span className={`chevron${open ? ' open' : ''}`}>▾</span>}
      </button>

      {expandable && open && !reorder && (
        <ul className="person-detail">
          {expandLines.map((line, i) => (
            <li key={i} className={line.kind !== 'normal' ? `person-detail-${line.kind}` : undefined}>
              {line.text}
            </li>
          ))}
          {links.map((l, i) => (
            <li key={`link-${i}`}>
              <a href={l.url} target="_blank" rel="noreferrer" className="person-detail-link">
                {l.label || l.url}
              </a>
            </li>
          ))}
        </ul>
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

import { useState } from 'react'
import SafeImage from './SafeImage'
import { EditButton } from './admin/AdminControls'
import { cropToStyle, normalizeCrop } from '../admin/photoCrop'

function initials(name) {
  if (!name) return '?'
  return name.trim().slice(0, 1)
}

/** 교수 프로필: 사진 + 이름 + 연락처 + 소개 + 연구관심분야를 한 화면에 바로 보여줍니다. */
function FacultyProfile({ person, onEdit, reorder }) {
  const contactLines = [person.email, person.office, person.phone].filter(Boolean)
  const interests = Array.isArray(person.researchInterests) ? person.researchInterests : []
  const detail = Array.isArray(person.detail) ? person.detail : []

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

        {detail.length > 0 && (
          <ul className="person-detail faculty-history">
            {detail.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
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
 * - faculty  : 사진·연락처·소개가 모두 펼쳐진 프로필 카드 (FacultyProfile)
 * - students : 소속, 한 줄 소개 / 펼치면 상세 이력
 * - alumni   : 이름만 / 펼치면 현재 직장·직함 + 상세 이력
 */
export default function PersonCard({ person, category, onEdit, reorder }) {
  const [open, setOpen] = useState(false)

  if (category === 'faculty') {
    return <FacultyProfile person={person} onEdit={onEdit} reorder={reorder} />
  }

  const isAlumni = category === 'alumni'
  const detail = Array.isArray(person.detail) ? person.detail : []

  const expandLines = []
  if (isAlumni && person.affiliation) expandLines.push({ text: person.affiliation, strong: true })
  if (isAlumni && person.bio) expandLines.push({ text: person.bio })
  detail.forEach((text) => expandLines.push({ text }))

  const expandable = expandLines.length > 0
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

      {!isAlumni && person.affiliation && <p className="person-affiliation">{person.affiliation}</p>}
      {!isAlumni && person.bio && <p className="person-bio">{person.bio}</p>}

      {expandable && open && !reorder && (
        <ul className="person-detail">
          {expandLines.map((line, i) => (
            <li key={i} className={line.strong ? 'strong' : undefined}>
              {line.text}
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

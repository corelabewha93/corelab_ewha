import { useState } from 'react'
import SafeImage from './SafeImage'
import { EditButton } from './admin/AdminControls'
import { cropToStyle, normalizeCrop } from '../admin/photoCrop'

function initials(name) {
  if (!name) return '?'
  return name.trim().slice(0, 1)
}

/**
 * category에 따라 보이는 정보가 달라집니다.
 * - faculty  : 직책, 소속, 한 줄 소개 / 펼치면 상세 이력
 * - students : 소속, 한 줄 소개 / 펼치면 상세 이력
 * - alumni   : 이름만 / 펼치면 현재 직장·직함 + 상세 이력
 */
export default function PersonCard({ person, category, onEdit, reorder }) {
  const [open, setOpen] = useState(false)
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

      {category === 'faculty' && person.position && <p className="person-position">{person.position}</p>}
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

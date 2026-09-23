import { useState } from 'react'
import SafeImage from './SafeImage'

function initials(name) {
  if (!name) return '?'
  return name.trim().slice(0, 1)
}

const OBJECT_POSITION = {
  top: '50% 20%',
  center: '50% 50%',
  bottom: '50% 80%',
}

export default function PersonCard({ person, positionLabel, isAdmin = false, onEdit }) {
  const [open, setOpen] = useState(false)
  const hasDetail = Array.isArray(person.detail) && person.detail.length > 0
  const toggle = () => hasDetail && setOpen((v) => !v)
  const objectPosition = OBJECT_POSITION[person.photoPosition] || OBJECT_POSITION.center

  return (
    <div className="person-card">
      {isAdmin && (
        <button
          type="button"
          className="person-edit-btn"
          onClick={() => onEdit?.(person)}
          aria-label={`${person.name} 정보 수정`}
          title="정보 수정"
        >
          ✎
        </button>
      )}
      <button type="button" className="person-photo-btn" onClick={toggle} disabled={!hasDetail} aria-expanded={hasDetail ? open : undefined}>
        <div className="person-photo">
          <SafeImage
            src={person.photo}
            alt={person.name}
            fallback={<span>{initials(person.name)}</span>}
            imgStyle={{ objectPosition }}
          />
        </div>
      </button>
      <button type="button" className="person-name-btn" onClick={toggle} disabled={!hasDetail}>
        <span className="person-name">{person.name}</span>
        {hasDetail && <span className={`chevron${open ? ' open' : ''}`}>▾</span>}
      </button>
      {positionLabel && <p className="person-position">{positionLabel}</p>}
      {person.affiliation && <p className="person-position">{person.affiliation}</p>}
      {person.bio && <p className="person-bio">{person.bio}</p>}
      {hasDetail && open && (
        <ul className="person-detail">
          {person.detail.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      )}
    </div>
  )
}

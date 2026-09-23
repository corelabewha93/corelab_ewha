import SafeImage from './SafeImage'

function initials(name) {
  if (!name) return '?'
  return name.trim().slice(0, 1)
}

export default function PersonCard({ person, positionLabel }) {
  return (
    <div className="person-card">
      <div className="person-photo">
        <SafeImage
          src={person.photo}
          alt={person.name}
          fallback={<span>{initials(person.name)}</span>}
        />
      </div>
      <p className="person-name">{person.name}</p>
      {positionLabel && <p className="person-position">{positionLabel}</p>}
      {person.affiliation && <p className="person-position">{person.affiliation}</p>}
      {person.bio && <p className="person-bio">{person.bio}</p>}
    </div>
  )
}

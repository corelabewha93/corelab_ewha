import { useState } from 'react'

const CATEGORY_LABELS = {
  faculty: 'Faculty',
  students: 'Students',
  alumni: 'Alumni',
}

function slugify(name) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '')
  return (base || 'person') + '-' + Date.now().toString(36)
}

export default function AdminRegisterModal({ initialCategory = 'students', onClose }) {
  const [category, setCategory] = useState(initialCategory)
  const [name, setName] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [position, setPosition] = useState('') // faculty
  const [degree, setDegree] = useState('MA') // students / alumni
  const [admission, setAdmission] = useState('') // students
  const [graduation, setGraduation] = useState('') // alumni, YYYY-MM
  const [affiliation, setAffiliation] = useState('')
  const [bio, setBio] = useState('')
  const [detailText, setDetailText] = useState('')

  const [result, setResult] = useState(null) // { json, photoUrl, photoFileName }
  const [copied, setCopied] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return

    const id = slugify(name)
    let photoPath = ''
    let photoUrl = null
    let photoFileName = ''

    if (photoFile) {
      const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase()
      photoFileName = `${id}.${ext}`
      photoPath = `images/people/${photoFileName}`
      photoUrl = URL.createObjectURL(photoFile)
    }

    const detail = detailText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const person = { id, name: name.trim(), photo: photoPath }

    if (category === 'faculty') {
      person.position = position.trim()
      person.affiliation = affiliation.trim()
      person.bio = bio.trim()
    } else if (category === 'students') {
      person.degree = degree
      person.admission = admission.trim()
      person.affiliation = affiliation.trim()
      person.bio = bio.trim()
    } else {
      person.degree = degree
      person.graduation = graduation.trim()
      person.affiliation = affiliation.trim()
      person.bio = bio.trim()
    }

    if (detail.length > 0) person.detail = detail

    setResult({ json: JSON.stringify(person, null, 2), photoUrl, photoFileName })
    setCopied(false)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* 클립보드 접근이 막힌 브라우저에서는 아래 텍스트 상자에서 직접 선택/복사하면 됩니다. */
    }
  }

  if (result) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">등록 준비 완료</h2>
          <p className="modal-hint">아래 순서대로 GitHub에 반영해주세요.</p>

          <ol className="modal-steps">
            {result.photoUrl && (
              <li>
                사진을 다운로드해서{' '}
                <code>public/images/people/</code> 폴더에 그대로 업로드하세요.
                <div style={{ marginTop: '0.4rem' }}>
                  <a
                    href={result.photoUrl}
                    download={result.photoFileName}
                    className="btn-primary"
                    style={{ display: 'inline-block', fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
                  >
                    사진 다운로드 ({result.photoFileName})
                  </a>
                </div>
              </li>
            )}
            <li>
              아래 내용을 복사해서 <code>people.json</code>의{' '}
              <strong>{CATEGORY_LABELS[category]}</strong> 배열(<code>"{category}": [ ... ]</code>) 안,
              다른 항목들 사이에 붙여넣으세요. (앞뒤로 쉼표 <code>,</code> 잘 맞춰주세요)
            </li>
            <li>GitHub에서 Commit changes를 눌러 저장하세요. 1~2분 뒤 사이트에 반영됩니다.</li>
          </ol>

          <textarea className="modal-input modal-textarea modal-json" readOnly rows={10} value={result.json} />

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={() => setResult(null)}>
              다시 입력
            </button>
            <button type="button" className="btn-primary" onClick={handleCopy}>
              {copied ? '복사됨!' : 'JSON 복사'}
            </button>
          </div>

          <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
            <button type="button" className="modal-btn-secondary" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">새 구성원 등록</h2>

        <form onSubmit={handleSubmit}>
          <label className="modal-field">
            <span>분류</span>
            <select className="modal-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="faculty">Faculty</option>
              <option value="students">Students</option>
              <option value="alumni">Alumni</option>
            </select>
          </label>

          <label className="modal-field">
            <span>이름 *</span>
            <input className="modal-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label className="modal-field">
            <span>사진 (선택)</span>
            <input
              type="file"
              accept="image/*"
              className="modal-input"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {category === 'faculty' && (
            <label className="modal-field">
              <span>직책</span>
              <input
                className="modal-input"
                placeholder="예: 교수 / 지도교수"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </label>
          )}

          {category !== 'faculty' && (
            <label className="modal-field">
              <span>학위과정</span>
              <select className="modal-input" value={degree} onChange={(e) => setDegree(e.target.value)}>
                <option value="MA">MA (석사)</option>
                <option value="Integrated">Integrated (석박통합)</option>
                <option value="PhD">PhD (박사)</option>
              </select>
            </label>
          )}

          {category === 'students' && (
            <label className="modal-field">
              <span>입학연도 (학번)</span>
              <input
                className="modal-input"
                placeholder="예: 2026"
                value={admission}
                onChange={(e) => setAdmission(e.target.value)}
              />
            </label>
          )}

          {category === 'alumni' && (
            <label className="modal-field">
              <span>졸업연월</span>
              <input
                className="modal-input"
                placeholder="예: 2023-02"
                value={graduation}
                onChange={(e) => setGraduation(e.target.value)}
              />
            </label>
          )}

          <label className="modal-field">
            <span>소속 (선택)</span>
            <input
              className="modal-input"
              placeholder="예: 현재 근무지 / 직함"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
            />
          </label>

          <label className="modal-field">
            <span>한 줄 소개 (선택)</span>
            <input className="modal-input" value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>

          <label className="modal-field">
            <span>상세 이력 (선택, 한 줄에 한 항목)</span>
            <textarea
              className="modal-input modal-textarea"
              rows={3}
              placeholder={'예)\n이화여자대학교 교육공학과 학사\n관심분야: 학습분석'}
              value={detailText}
              onChange={(e) => setDetailText(e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary">
              등록 내용 만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

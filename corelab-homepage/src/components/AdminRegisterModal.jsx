import { useState } from 'react'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { getTextFile, putTextFile, putBase64File } from '../admin/githubApi'
import { PEOPLE_JSON_PATH, PEOPLE_IMAGES_PATH } from '../admin/githubConfig'

const CATEGORIES = ['faculty', 'students', 'alumni']

function slugify(name) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '')
  return (base || 'person') + '-' + Date.now().toString(36)
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * editPerson이 있으면 "수정 모드"(기존 사람을 그대로 불러와 채운 뒤 그 항목을 갱신),
 * 없으면 "등록 모드"(새 사람을 배열에 추가)로 동작합니다.
 * editCategory는 이 사람이 지금 들어있는 분류(수정 시 원래 위치를 찾기 위해 필요).
 */
export default function AdminRegisterModal({
  initialCategory = 'students',
  editPerson = null,
  editCategory = null,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(editPerson)
  const { token } = useAdminAuth()

  const [category, setCategory] = useState(editCategory || initialCategory)
  const [name, setName] = useState(editPerson?.name || '')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPosition, setPhotoPosition] = useState(editPerson?.photoPosition || 'center')
  const [position, setPosition] = useState(editPerson?.position || '')
  const [degree, setDegree] = useState(editPerson?.degree || 'MA')
  const [admission, setAdmission] = useState(editPerson?.admission || '')
  const [graduation, setGraduation] = useState(editPerson?.graduation || '')
  const [affiliation, setAffiliation] = useState(editPerson?.affiliation || '')
  const [bio, setBio] = useState(editPerson?.bio || '')
  const [detailText, setDetailText] = useState((editPerson?.detail || []).join('\n'))

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    setError(null)

    try {
      const id = editPerson?.id || slugify(name)
      let photoPath = editPerson?.photo || ''

      if (photoFile) {
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase()
        const fileName = `${id}.${ext}`
        const dataUrl = await fileToDataUrl(photoFile)
        await putBase64File(
          token,
          `${PEOPLE_IMAGES_PATH}/${fileName}`,
          dataUrl,
          `사진 업로드: ${name.trim()}`,
        )
        photoPath = `images/people/${fileName}`
      }

      const detail = detailText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      const person = { id, name: name.trim(), photo: photoPath }
      if (photoPosition && photoPosition !== 'center') person.photoPosition = photoPosition

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

      const { content, sha } = await getTextFile(token, PEOPLE_JSON_PATH)
      const data = JSON.parse(content)
      CATEGORIES.forEach((c) => {
        if (!Array.isArray(data[c])) data[c] = []
      })

      if (isEdit) {
        const fromCategory = editCategory || category
        data[fromCategory] = data[fromCategory].filter((p) => p.id !== id)
      }
      data[category].push(person)

      const message = isEdit ? `구성원 수정: ${name.trim()}` : `구성원 등록: ${name.trim()}`
      await putTextFile(token, PEOPLE_JSON_PATH, JSON.stringify(data, null, 2) + '\n', message, sha)

      setDone(true)
      onSaved?.()
    } catch (err) {
      setError(err.message || '저장 중 문제가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <h2 className="modal-title">{isEdit ? '수정 완료' : '등록 완료'}</h2>
          <p className="modal-hint">
            GitHub에 저장되었습니다. 1~2분 뒤 자동으로 홈페이지에 반영됩니다.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn-primary" onClick={onClose}>
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
        <h2 className="modal-title">{isEdit ? '구성원 정보 수정' : '새 구성원 등록'}</h2>

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
            <span>사진 {isEdit ? '(바꾸려면 새로 선택, 그대로 두면 기존 사진 유지)' : '(선택)'}</span>
            <input
              type="file"
              accept="image/*"
              className="modal-input"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="modal-field">
            <span>사진 위치 (사진이 잘리는 위치 조정)</span>
            <select
              className="modal-input"
              value={photoPosition}
              onChange={(e) => setPhotoPosition(e.target.value)}
            >
              <option value="top">위쪽 (얼굴이 사진 위쪽에 있을 때)</option>
              <option value="center">가운데 (기본)</option>
              <option value="bottom">아래쪽 (얼굴이 사진 아래쪽에 있을 때)</option>
            </select>
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

          {error && <p className="modal-error">{error}</p>}
          {submitting && <p className="modal-status">GitHub에 저장하는 중...</p>}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '저장 중...' : isEdit ? '수정 저장' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

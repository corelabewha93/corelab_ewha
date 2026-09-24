import { useEffect, useMemo, useRef, useState } from 'react'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { uploadImage } from '../../admin/dataStore'
import { normalizeCrop } from '../../admin/photoCrop'
import { showToast } from '../../admin/toast'
import { resolveImageSrc } from '../SafeImage'
import CropEditor from './CropEditor'

/**
 * 모든 페이지가 함께 쓰는 관리자 입력/수정 창.
 *
 * fields 예시:
 *   { name: 'title', label: '제목', type: 'text', required: true }
 *   type: text | textarea | number | date | month | select | lines | tags | paragraphs | image | crop
 *   - lines      : 배열 ↔ 한 줄에 하나
 *   - tags       : 배열 ↔ 쉼표로 구분
 *   - paragraphs : 배열 ↔ 빈 줄로 문단 구분
 *   - image      : 사진 파일 선택 → 저장할 때 GitHub에 자동 업로드 (folder: 'news' 등)
 *   - crop       : 사진 위치/확대 조정 (imageField: 어떤 사진 필드를 조정할지)
 *   - showIf(values) : 조건부로 보이는 필드
 */

function toForm(field, value) {
  switch (field.type) {
    case 'lines':
      return Array.isArray(value) ? value.join('\n') : value ?? ''
    case 'tags':
      return Array.isArray(value) ? value.join(', ') : value ?? ''
    case 'paragraphs':
      return Array.isArray(value) ? value.join('\n\n') : value ?? ''
    case 'linklines':
      return Array.isArray(value) ? value.map((l) => `${l.label ?? ''} | ${l.url ?? ''}`).join('\n') : value ?? ''
    case 'crop':
      return normalizeCrop({ photoCrop: value })
    case 'number':
      return value == null ? '' : String(value)
    default:
      return value ?? (field.default ?? '')
  }
}

function fromForm(field, value) {
  switch (field.type) {
    case 'lines':
      return String(value)
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    case 'tags':
      return String(value)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    case 'paragraphs':
      return String(value)
        .split(/\n\s*\n/)
        .map((s) => s.replace(/\s*\n\s*/g, ' ').trim())
        .filter(Boolean)
    case 'linklines':
      return String(value)
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => {
          const idx = line.indexOf('|')
          if (idx === -1) return { label: line, url: line }
          return { label: line.slice(0, idx).trim(), url: line.slice(idx + 1).trim() }
        })
        .filter((l) => l.label || l.url)
    case 'number':
      return value === '' ? null : Number(value)
    case 'crop':
      return value
    case 'image':
      return value
    default:
      return typeof value === 'string' ? value.trim() : value
  }
}

export default function EditModal({ title, fields, initial = {}, onSave, onDelete, onClose, uploadName }) {
  const { token } = useAdminAuth()
  const [values, setValues] = useState(() => {
    const v = {}
    fields.forEach((f) => {
      v[f.name] = toForm(f, initial[f.name])
    })
    return v
  })
  const [files, setFiles] = useState({}) // image(단일) 필드 이름 -> File[]
  // 사진 여러 장(multiple) 필드: 기존 사진과 새로 고른 사진을 한 줄로 합쳐서 순서를 바꾸거나 뺄 수 있게 관리합니다.
  // entry: { id, kind: 'existing', src } | { id, kind: 'new', file, previewUrl }
  const [multiEntries, setMultiEntries] = useState(() => {
    const m = {}
    fields.forEach((f) => {
      if (f.type === 'image' && f.multiple) {
        const arr = Array.isArray(initial[f.name]) ? initial[f.name].filter(Boolean) : []
        m[f.name] = arr.map((src, i) => ({ id: `existing-${i}-${src}`, kind: 'existing', src }))
      }
    })
    return m
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const objectUrlsRef = useRef([])

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }))

  const addMultiFiles = (name, fileList) => {
    const added = Array.from(fileList ?? []).map((file, i) => {
      const previewUrl = URL.createObjectURL(file)
      objectUrlsRef.current.push(previewUrl)
      return { id: `new-${Date.now()}-${i}-${file.name}`, kind: 'new', file, previewUrl }
    })
    if (!added.length) return
    setMultiEntries((prev) => ({ ...prev, [name]: [...(prev[name] ?? []), ...added] }))
  }

  const removeMultiEntry = (name, id) => {
    setMultiEntries((prev) => ({ ...prev, [name]: (prev[name] ?? []).filter((en) => en.id !== id) }))
  }

  const moveMultiEntry = (name, index, dir) => {
    setMultiEntries((prev) => {
      const list = [...(prev[name] ?? [])]
      const target = index + dir
      if (target < 0 || target >= list.length) return prev
      ;[list[index], list[target]] = [list[target], list[index]]
      return { ...prev, [name]: list }
    })
  }

  useEffect(() => () => objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u)), [])

  // crop 미리보기를 위한 임시 주소 (새로 고른 사진이 있으면 그걸, 없으면 기존 사진)
  const previewUrls = useMemo(() => {
    const urls = {}
    Object.entries(files).forEach(([name, list]) => {
      if (list?.[0]) urls[name] = URL.createObjectURL(list[0])
    })
    return urls
  }, [files])

  useEffect(() => () => Object.values(previewUrls).forEach((u) => URL.revokeObjectURL(u)), [previewUrls])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const visibleFields = fields.filter((f) => !f.showIf || f.showIf(values))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    for (const f of visibleFields) {
      if (!f.required) continue
      let empty
      if (f.type === 'image' && f.multiple) {
        empty = !(multiEntries[f.name]?.length)
      } else if (f.type === 'image') {
        empty = !values[f.name] && !files[f.name]?.length
      } else {
        empty = !String(values[f.name] ?? '').trim()
      }
      if (empty) {
        setError(`"${f.label}" 항목을 입력해주세요.`)
        return
      }
    }

    setSaving(true)
    setError(null)
    try {
      const out = {}
      for (const f of visibleFields) {
        if (f.type === 'image' && f.multiple) {
          const base = uploadName?.(values) || f.folder
          const paths = []
          for (const entry of multiEntries[f.name] ?? []) {
            paths.push(entry.kind === 'existing' ? entry.src : await uploadImage(token, entry.file, f.folder, base))
          }
          out[f.name] = paths
        } else if (f.type === 'image' && files[f.name]?.length) {
          const base = uploadName?.(values) || f.folder
          out[f.name] = await uploadImage(token, files[f.name][0], f.folder, base)
        } else {
          out[f.name] = fromForm(f, values[f.name])
        }
      }
      // 화면에서 숨겨진 필드는 "지움" 표시로 넘깁니다 (undefined)
      fields.forEach((f) => {
        if (!(f.name in out)) out[f.name] = undefined
      })
      await onSave(out)
      showToast('저장했어요. 방문자 화면에는 1~2분 뒤 반영됩니다.')
      onClose()
    } catch (err) {
      setError(err.message || '저장 중 문제가 발생했습니다.')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onDelete()
      showToast('삭제했어요. 방문자 화면에는 1~2분 뒤 반영됩니다.')
      onClose()
    } catch (err) {
      setError(err.message || '삭제 중 문제가 발생했습니다.')
      setSaving(false)
    }
  }

  const renderField = (f) => {
    const value = values[f.name]
    const common = {
      className: 'modal-input',
      value,
      placeholder: f.placeholder,
      onChange: (e) => set(f.name, e.target.value),
    }

    switch (f.type) {
      case 'textarea':
      case 'lines':
      case 'paragraphs':
      case 'linklines':
        return <textarea {...common} className="modal-input modal-textarea" rows={f.rows ?? (f.type === 'paragraphs' ? 6 : 4)} />
      case 'number':
        return <input {...common} type="number" />
      case 'date':
        return <input {...common} type="date" />
      case 'month':
        return <input {...common} type="month" />
      case 'select':
        return (
          <select {...common}>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )
      case 'image': {
        if (f.multiple) {
          const entries = multiEntries[f.name] ?? []
          return (
            <div className="image-field image-field-multi">
              {entries.length > 0 && (
                <div className="image-field-thumbs">
                  {entries.map((entry, i) => {
                    const src = entry.kind === 'existing' ? resolveImageSrc(entry.src, true) : entry.previewUrl
                    return (
                      <div className="image-field-thumb image-field-thumb-sortable" key={entry.id}>
                        <img src={src} alt="" />
                        <div className="image-field-thumb-controls">
                          <button
                            type="button"
                            onClick={() => moveMultiEntry(f.name, i, -1)}
                            disabled={i === 0}
                            aria-label="앞으로 이동"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            className="image-field-thumb-remove"
                            onClick={() => removeMultiEntry(f.name, entry.id)}
                            aria-label="사진 빼기"
                          >
                            ×
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMultiEntry(f.name, i, 1)}
                            disabled={i === entries.length - 1}
                            aria-label="뒤로 이동"
                          >
                            ▶
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="image-field-actions">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    addMultiFiles(f.name, e.target.files)
                    e.target.value = ''
                  }}
                />
                <p className="field-hint">
                  사진을 고르면 뒤에 추가됩니다 (기존 사진은 그대로 남아요). ◀▶로 순서를 바꾸고, ×로 뺄 수 있어요.
                </p>
              </div>
            </div>
          )
        }

        const picked = files[f.name] ?? []
        const current = picked.length ? previewUrls[f.name] : resolveImageSrc(value, true)
        return (
          <div className="image-field">
            {current && (
              <div className="image-field-thumb">
                <img src={current} alt="" />
              </div>
            )}
            <div className="image-field-actions">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFiles((prev) => ({ ...prev, [f.name]: Array.from(e.target.files ?? []) }))}
              />
              {(value || picked.length > 0) && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    set(f.name, '')
                    setFiles((prev) => ({ ...prev, [f.name]: [] }))
                  }}
                >
                  사진 빼기
                </button>
              )}
            </div>
          </div>
        )
      }
      case 'crop': {
        const src = previewUrls[f.imageField] || resolveImageSrc(values[f.imageField], true)
        return <CropEditor src={src} value={value} onChange={(v) => set(f.name, v)} />
      }
      default:
        return <input {...common} type="text" />
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{title}</h2>

        <form onSubmit={handleSubmit}>
          {visibleFields.map((f) => (
            <div className="modal-field" key={f.name}>
              <span>
                {f.label}
                {f.required ? ' *' : ''}
              </span>
              {renderField(f)}
              {f.hint && <p className="field-hint">{f.hint}</p>}
            </div>
          ))}

          {error && <p className="modal-error">{error}</p>}
          {saving && <p className="modal-status">GitHub에 저장하는 중...</p>}

          <div className="modal-actions">
            {onDelete && (
              <button
                type="button"
                className={`modal-btn-danger${confirmDelete ? ' confirm' : ''}`}
                onClick={handleDelete}
                disabled={saving}
              >
                {confirmDelete ? '정말 삭제할까요? 한 번 더 누르세요' : '삭제'}
              </button>
            )}
            <span className="modal-actions-spacer" />
            <button type="button" className="modal-btn-secondary" onClick={onClose} disabled={saving}>
              취소
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

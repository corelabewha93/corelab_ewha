import { useEffect, useMemo, useRef, useState } from 'react'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { uploadImage } from '../../admin/dataStore'
import { DEFAULT_CROP, cropToStyle, normalizeCrop } from '../../admin/photoCrop'
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
 *   - crop       : 사진 위치/확대 조정 (imageField: 어떤 사진 필드를 조정할지) — 사진 한 장짜리 필드용
 *   - image + multiple + crop: true : 사진 여러 장 각각의 위치/확대 조정.
 *       cropField(예: 'imageCrops')에 사진 배열과 같은 순서로 crop 값이 저장됩니다.
 *       cropAspect: [4, 3] 처럼 실제 화면 비율을 넘기면 그 비율로 미리보기가 보입니다(생략 시 3:4).
 *   - members    : 참여연구진 [{ name, role }] — 이름 입력칸 + 신분 선택칸을 한 줄씩 추가/삭제 (roles: 선택지 배열)
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
    case 'members':
      return Array.isArray(value) ? value.map((m) => ({ name: m.name ?? '', role: m.role ?? field.roles?.[0] ?? '' })) : []
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
    case 'members':
      return (Array.isArray(value) ? value : [])
        .map((m) => ({ name: (m.name ?? '').trim(), role: m.role }))
        .filter((m) => m.name)
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
  // entry: { id, kind: 'existing', src, crop? } | { id, kind: 'new', file, previewUrl, crop? }
  // (f.crop이 true인 필드는 사진마다 위치·확대(crop) 값을 함께 들고 다닙니다 — f.cropField에 배열로 저장됩니다.)
  const [multiEntries, setMultiEntries] = useState(() => {
    const m = {}
    fields.forEach((f) => {
      if (f.type === 'image' && f.multiple) {
        const rawImages = Array.isArray(initial[f.name]) ? initial[f.name] : []
        const rawCrops = f.crop && Array.isArray(initial[f.cropField]) ? initial[f.cropField] : []
        m[f.name] = rawImages
          .map((src, i) => ({ src, crop: rawCrops[i] }))
          .filter((e) => e.src)
          .map((e, i) => ({
            id: `existing-${i}-${e.src}`,
            kind: 'existing',
            src: e.src,
            crop: f.crop ? normalizeCrop({ photoCrop: e.crop }) : undefined,
          }))
      }
    })
    return m
  })
  // 여러 장 사진 중 지금 위치·확대를 조정 중인 항목: { field, id } | null
  const [cropOpen, setCropOpen] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const objectUrlsRef = useRef([])

  const set = (name, value) => setValues((prev) => ({ ...prev, [name]: value }))

  const addMultiFiles = (name, fileList, withCrop) => {
    const added = Array.from(fileList ?? []).map((file, i) => {
      const previewUrl = URL.createObjectURL(file)
      objectUrlsRef.current.push(previewUrl)
      return { id: `new-${Date.now()}-${i}-${file.name}`, kind: 'new', file, previewUrl, crop: withCrop ? { ...DEFAULT_CROP } : undefined }
    })
    if (!added.length) return
    setMultiEntries((prev) => ({ ...prev, [name]: [...(prev[name] ?? []), ...added] }))
  }

  const removeMultiEntry = (name, id) => {
    setMultiEntries((prev) => ({ ...prev, [name]: (prev[name] ?? []).filter((en) => en.id !== id) }))
    setCropOpen((prev) => (prev?.field === name && prev?.id === id ? null : prev))
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

  const updateEntryCrop = (name, id, crop) => {
    setMultiEntries((prev) => ({
      ...prev,
      [name]: (prev[name] ?? []).map((en) => (en.id === id ? { ...en, crop } : en)),
    }))
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
          const crops = []
          for (const entry of multiEntries[f.name] ?? []) {
            paths.push(entry.kind === 'existing' ? entry.src : await uploadImage(token, entry.file, f.folder, base))
            if (f.crop) crops.push(entry.crop ?? DEFAULT_CROP)
          }
          out[f.name] = paths
          if (f.crop && f.cropField) out[f.cropField] = crops
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
      case 'members': {
        const rows = Array.isArray(value) ? value : []
        const roles = f.roles ?? []
        const update = (i, patch) => set(f.name, rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
        return (
          <div className="members-field">
            {rows.map((row, i) => (
              <div className="members-row" key={i}>
                <input
                  className="modal-input"
                  type="text"
                  value={row.name}
                  placeholder="이름"
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                <select className="modal-input" value={row.role} onChange={(e) => update(i, { role: e.target.value })}>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="members-remove"
                  onClick={() => set(f.name, rows.filter((_, j) => j !== i))}
                  aria-label="이 연구진 빼기"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="members-add"
              onClick={() => set(f.name, [...rows, { name: '', role: roles[1] ?? roles[0] ?? '' }])}
            >
              + 참여연구진 추가
            </button>
          </div>
        )
      }
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
                    const isCropOpen = f.crop && cropOpen?.field === f.name && cropOpen?.id === entry.id
                    const thumbImg = <img src={src} alt="" style={f.crop ? cropToStyle(entry.crop ?? DEFAULT_CROP) : undefined} />
                    return (
                      <div className="image-field-thumb image-field-thumb-sortable" key={entry.id}>
                        {f.crop ? (
                          <button
                            type="button"
                            className={`image-field-thumb-open${isCropOpen ? ' active' : ''}`}
                            onClick={() => setCropOpen(isCropOpen ? null : { field: f.name, id: entry.id })}
                            aria-label="사진 위치 · 확대 조정"
                            title="눌러서 사진 위치 · 확대 조정"
                          >
                            {thumbImg}
                          </button>
                        ) : (
                          thumbImg
                        )}
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

              {f.crop &&
                cropOpen?.field === f.name &&
                (() => {
                  const entry = entries.find((en) => en.id === cropOpen.id)
                  if (!entry) return null
                  const src = entry.kind === 'existing' ? resolveImageSrc(entry.src, true) : entry.previewUrl
                  const [aw, ah] = f.cropAspect ?? [4, 3]
                  const cropWidth = 200
                  return (
                    <div className="crop-editor-panel">
                      <CropEditor
                        src={src}
                        value={entry.crop}
                        onChange={(v) => updateEntryCrop(f.name, entry.id, v)}
                        width={cropWidth}
                        height={Math.round((cropWidth * ah) / aw)}
                      />
                      <button type="button" className="modal-btn-secondary crop-panel-done" onClick={() => setCropOpen(null)}>
                        완료
                      </button>
                    </div>
                  )
                })()}

              <div className="image-field-actions">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    addMultiFiles(f.name, e.target.files, f.crop)
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

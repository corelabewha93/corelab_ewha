import { useRef } from 'react'
import { DEFAULT_CROP, clamp, cropToStyle } from '../../admin/photoCrop'

const SIZE = 200

/**
 * 동그란 미리보기 안에서 사진을 드래그해서 위치를 옮기고, 슬라이더로 확대/세부 조정합니다.
 */
export default function CropEditor({ src, value, onChange }) {
  const crop = value ?? DEFAULT_CROP
  const dragRef = useRef(null)

  const update = (patch) => onChange({ ...crop, ...patch })

  const onPointerDown = (e) => {
    if (!src) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, crop }
  }

  const onPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const factor = 100 / SIZE / drag.crop.zoom
    onChange({
      ...drag.crop,
      x: Math.round(clamp(drag.crop.x - (e.clientX - drag.startX) * factor, 0, 100) * 10) / 10,
      y: Math.round(clamp(drag.crop.y - (e.clientY - drag.startY) * factor, 0, 100) * 10) / 10,
    })
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  if (!src) {
    return <p className="field-hint">사진을 넣으면 여기에서 위치와 확대를 조정할 수 있어요.</p>
  }

  return (
    <div className="crop-editor">
      <div
        className={`crop-preview${src ? '' : ' empty'}`}
        style={{ width: SIZE, height: SIZE }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {src ? (
          <img src={src} alt="" draggable={false} style={cropToStyle(crop)} />
        ) : (
          <span>사진을 먼저 선택하세요</span>
        )}
      </div>

      {src && (
        <div className="crop-controls">
          <p className="crop-help">사진을 마우스로 끌어서 위치를 맞추세요.</p>
          <label>
            <span>확대</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={crop.zoom}
              onChange={(e) => update({ zoom: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>좌우</span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={crop.x}
              onChange={(e) => update({ x: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>상하</span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={crop.y}
              onChange={(e) => update({ y: Number(e.target.value) })}
            />
          </label>
          <button type="button" className="modal-btn-secondary crop-reset" onClick={() => onChange({ ...DEFAULT_CROP })}>
            처음 상태로
          </button>
        </div>
      )}
    </div>
  )
}

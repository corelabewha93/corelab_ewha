/**
 * 사진 자르기(프레이밍) 값.
 *   x, y : 0~100. 사진의 어느 부분을 보여줄지 (0 = 왼쪽/위쪽 끝, 100 = 오른쪽/아래쪽 끝)
 *   zoom : 1 이상. 확대 배율
 * people.json 에는 "photoCrop": { "x": 50, "y": 30, "zoom": 1.4 } 형태로 저장됩니다.
 */
export const DEFAULT_CROP = { x: 50, y: 50, zoom: 1 }

const LEGACY_Y = { top: 20, center: 50, bottom: 80 }

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

export function normalizeCrop(person) {
  const c = person?.photoCrop
  if (c && typeof c === 'object') {
    return {
      x: clamp(Number(c.x ?? 50), 0, 100),
      y: clamp(Number(c.y ?? 50), 0, 100),
      zoom: clamp(Number(c.zoom ?? 1), 1, 4),
    }
  }
  if (person?.photoPosition && LEGACY_Y[person.photoPosition] != null) {
    return { ...DEFAULT_CROP, y: LEGACY_Y[person.photoPosition] }
  }
  return { ...DEFAULT_CROP }
}

export function cropToStyle(crop) {
  const { x, y, zoom } = crop
  return {
    objectPosition: `${x}% ${y}%`,
    transformOrigin: `${x}% ${y}%`,
    transform: zoom !== 1 ? `scale(${zoom})` : undefined,
  }
}

export { clamp }

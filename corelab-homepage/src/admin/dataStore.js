import { useEffect, useSyncExternalStore } from 'react'
import { useAdminAuth } from './AdminAuthContext'
import { getTextFile, putTextFile, putBase64File } from './githubApi'
import { DATA_PATH, PUBLIC_PATH } from './githubConfig'

/**
 * public/data/*.json 을 불러오고 저장하는 공용 저장소.
 *
 * - 일반 방문자: 배포된 사이트의 JSON을 읽습니다.
 * - 관리자(로그인 상태): GitHub 저장소에서 "최신" JSON을 직접 읽습니다.
 *   그래서 저장 직후 배포(1~2분)를 기다리지 않아도 관리자 화면에는 바로 반영됩니다.
 * - 같은 파일을 여러 컴포넌트가 써도(예: site.json을 About과 Footer가 같이 사용)
 *   한 곳에서 저장하면 모두 함께 갱신됩니다.
 */

const entries = new Map() // fileName -> { data, error, loading, mode }
const listeners = new Set()
let version = 0

function emit() {
  version += 1
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getVersion() {
  return version
}

async function fetchPublic(fileName) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/${fileName}`, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`${fileName}을(를) 불러오지 못했습니다 (${res.status})`)
  return res.json()
}

async function fetchAdmin(token, fileName) {
  const { content } = await getTextFile(token, `${DATA_PATH}/${fileName}`)
  return JSON.parse(content)
}

function load(fileName, token) {
  const mode = token ? 'admin' : 'public'
  const current = entries.get(fileName)
  if (current && current.mode === mode) return

  entries.set(fileName, { data: current?.data ?? null, error: null, loading: true, mode })
  emit()

  const request = token
    ? fetchAdmin(token, fileName).catch(() => fetchPublic(fileName))
    : fetchPublic(fileName)

  request
    .then((data) => {
      if (entries.get(fileName)?.mode !== mode) return
      entries.set(fileName, { data, error: null, loading: false, mode })
      emit()
    })
    .catch((err) => {
      if (entries.get(fileName)?.mode !== mode) return
      entries.set(fileName, { data: null, error: err.message, loading: false, mode })
      emit()
    })
}

const EMPTY = { data: null, error: null, loading: true }

export function useData(fileName) {
  const { token } = useAdminAuth()
  useSyncExternalStore(subscribe, getVersion)

  useEffect(() => {
    load(fileName, token)
  }, [fileName, token])

  const entry = entries.get(fileName)
  const expectedMode = token ? 'admin' : 'public'
  if (!entry || (entry.mode !== expectedMode && !entry.data)) return EMPTY
  return entry
}

/**
 * GitHub의 최신 JSON을 읽어 mutate(data)로 고친 뒤 저장(커밋)합니다.
 * 항상 저장 직전에 최신본을 다시 읽기 때문에, 다른 사람이 그사이 수정한 내용을 덮어쓰지 않습니다.
 */
export async function saveData(token, fileName, mutate, message) {
  const path = `${DATA_PATH}/${fileName}`
  const { content, sha } = await getTextFile(token, path)
  const current = JSON.parse(content)
  const next = mutate(current) ?? current
  await putTextFile(token, path, JSON.stringify(next, null, 2) + '\n', message, sha)
  entries.set(fileName, { data: next, error: null, loading: false, mode: 'admin' })
  emit()
  return next
}

function safeName(text) {
  return (
    String(text || 'file')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9가-힣_-]/g, '')
      .slice(0, 40) || 'file'
  )
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * 휴대폰으로 찍은 원본 사진은 보통 5~10MB가 넘어서, 그대로 올리면 사이트가 느려집니다.
 * 업로드 전에 브라우저에서 가로/세로를 적당히 줄이고 다시 압축해서 용량을 크게 낮춥니다.
 * - SVG나 이미 충분히 가벼운 파일(300KB 미만)은 그대로 둡니다.
 * - 투명 배경이 필요할 수 있는 PNG(로고 등)는 형식을 유지한 채 크기만 줄입니다.
 * - 사진(JPEG)은 최대 1600px, 품질 85%로 다시 인코딩합니다.
 * - 혹시라도 압축 결과가 원본보다 크면 원본을 그대로 사용합니다.
 */
async function compressImage(file, { maxDimension = 1600, quality = 0.85 } = {}) {
  if (file.type === 'image/svg+xml' || file.size < 300 * 1024) {
    return fileToDataUrl(file)
  }

  const original = await fileToDataUrl(file)

  try {
    const img = await loadImageElement(original)
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
    const isJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg'

    if (scale === 1 && !isJpeg) {
      return original
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const compressed = canvas.toDataURL(outType, outType === 'image/jpeg' ? quality : undefined)

    return compressed.length < original.length ? compressed : original
  } catch {
    // 압축 중 문제가 생기면(예: 브라우저 제약) 원본을 그대로 올립니다.
    return original
  }
}

/**
 * 이미지를 public/images/<folder>/ 에 올리고, JSON에 적을 경로(images/<folder>/파일명)를 돌려줍니다.
 * 파일명 끝에 시간값을 붙여서 매번 새 파일로 올리므로, 예전 사진이 캐시로 남아 보이는 문제가 없습니다.
 * 업로드 전에 자동으로 용량을 줄이므로(위 compressImage), 확장자가 jpg/jpeg가 아니어도
 * 실제 저장되는 파일이 JPEG로 바뀔 수 있어 파일명의 확장자도 그에 맞춥니다.
 */
export async function uploadImage(token, file, folder, baseName) {
  const dataUrl = await compressImage(file)
  const outExt = dataUrl.startsWith('data:image/png') ? 'png' : dataUrl.startsWith('data:image/jpeg') ? 'jpg' : null
  const ext = outExt || (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const fileName = `${safeName(baseName)}-${Date.now().toString(36)}.${ext}`
  await putBase64File(token, `${PUBLIC_PATH}/images/${folder}/${fileName}`, dataUrl, `사진 업로드: ${fileName}`)
  return `images/${folder}/${fileName}`
}

export function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

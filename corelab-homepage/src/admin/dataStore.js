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

/**
 * 이미지를 public/images/<folder>/ 에 올리고, JSON에 적을 경로(images/<folder>/파일명)를 돌려줍니다.
 * 파일명 끝에 시간값을 붙여서 매번 새 파일로 올리므로, 예전 사진이 캐시로 남아 보이는 문제가 없습니다.
 */
export async function uploadImage(token, file, folder, baseName) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const fileName = `${safeName(baseName)}-${Date.now().toString(36)}.${ext}`
  const dataUrl = await fileToDataUrl(file)
  await putBase64File(token, `${PUBLIC_PATH}/images/${folder}/${fileName}`, dataUrl, `사진 업로드: ${fileName}`)
  return `images/${folder}/${fileName}`
}

export function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

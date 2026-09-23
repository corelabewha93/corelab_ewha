import { OWNER, REPO, BRANCH } from './githubConfig'

const API_BASE = 'https://api.github.com'

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  }
}

// 한글 등 멀티바이트 문자가 포함된 텍스트를 안전하게 base64로 인코딩/디코딩합니다.
function encodeBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function decodeBase64Utf8(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

/**
 * 토큰이 이 저장소에 실제로 쓰기 권한이 있는지 확인합니다.
 * 성공하면 true, 실패하면 이유가 담긴 에러를 던집니다.
 */
export async function verifyToken(token) {
  const res = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('토큰이 올바르지 않습니다.')
    if (res.status === 404) throw new Error('저장소에 접근할 수 없습니다. 토큰 권한을 확인해주세요.')
    throw new Error(`GitHub 연결에 실패했습니다. (${res.status})`)
  }
  const json = await res.json()
  const perms = json.permissions || {}
  if (!perms.push) {
    throw new Error('이 토큰은 저장소에 쓰기 권한이 없습니다. Contents: Read and write 권한을 확인해주세요.')
  }
  return true
}

/**
 * 텍스트 파일(JSON 등)을 읽어옵니다. { content, sha }를 반환합니다.
 */
export async function getTextFile(token, path) {
  const res = await fetch(
    `${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: authHeaders(token) },
  )
  if (!res.ok) {
    throw new Error(`파일을 불러오지 못했습니다: ${path} (${res.status})`)
  }
  const json = await res.json()
  return { content: decodeBase64Utf8(json.content.replace(/\n/g, '')), sha: json.sha }
}

async function putRaw(token, path, base64Content, message, sha) {
  const res = await fetch(`${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: base64Content,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `저장에 실패했습니다: ${path} (${res.status})`)
  }
  return res.json()
}

/**
 * 텍스트 파일(JSON 등)을 저장합니다. sha를 전달하면 기존 파일을 덮어씁니다.
 */
export async function putTextFile(token, path, text, message, sha) {
  return putRaw(token, path, encodeBase64Utf8(text), message, sha)
}

/**
 * 해당 경로에 파일이 이미 있으면 그 sha를, 없으면(404) null을 반환합니다.
 * GitHub는 "이미 있는 파일을 덮어쓸 때" sha가 없으면 저장을 거부하기 때문에,
 * 사진처럼 같은 파일명으로 다시 업로드될 수 있는 파일은 미리 이걸로 확인해야 합니다.
 */
async function getFileShaIfExists(token, path) {
  const res = await fetch(
    `${API_BASE}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: authHeaders(token) },
  )
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`파일 확인에 실패했습니다: ${path} (${res.status})`)
  }
  const json = await res.json()
  return json.sha
}

/**
 * data URL(예: 사진 업로드 미리보기)로부터 바이너리 파일을 저장합니다.
 * 같은 경로에 파일이 이미 있으면(=사진 교체) 자동으로 기존 sha를 찾아 덮어씁니다.
 */
export async function putBase64File(token, path, dataUrl, message) {
  const base64Content = dataUrl.split(',')[1] || ''
  const existingSha = await getFileShaIfExists(token, path)
  return putRaw(token, path, base64Content, message, existingSha)
}

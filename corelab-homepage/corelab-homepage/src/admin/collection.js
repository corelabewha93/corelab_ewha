import { saveData } from './dataStore'

/**
 * JSON 안의 "목록"(배열)을 다루는 도우미.
 * key가 null이면 파일 자체가 배열(news.json, lablife.json),
 * 문자열이면 그 이름의 배열(research.json의 publications, people.json의 students 등).
 */
function listOf(data, key) {
  if (!key) return data
  if (!Array.isArray(data[key])) data[key] = []
  return data[key]
}

/** 새 항목 추가 또는 기존 항목(id 같음) 수정. otherKeys: 분류를 옮길 때 원래 있던 곳에서 빼기 위해 */
export function upsertItem(token, fileName, key, item, message, { otherKeys = [], prepend = false } = {}) {
  return saveData(
    token,
    fileName,
    (data) => {
      let previous = null
      otherKeys
        .filter((k) => k !== key)
        .forEach((k) => {
          const other = listOf(data, k)
          const idx = other.findIndex((x) => x.id === item.id)
          if (idx >= 0) {
            previous = other[idx]
            other.splice(idx, 1)
          }
        })

      const list = listOf(data, key)
      const idx = list.findIndex((x) => x.id === item.id)
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item }
      } else if (prepend) {
        list.unshift({ ...(previous ?? {}), ...item })
      } else {
        list.push({ ...(previous ?? {}), ...item })
      }
      return data
    },
    message,
  )
}

export function addItems(token, fileName, key, items, message) {
  return saveData(
    token,
    fileName,
    (data) => {
      listOf(data, key).push(...items)
      return data
    },
    message,
  )
}

export function deleteItem(token, fileName, key, id, message) {
  return saveData(
    token,
    fileName,
    (data) => {
      const list = listOf(data, key)
      const idx = list.findIndex((x) => x.id === id)
      if (idx >= 0) list.splice(idx, 1)
      return data
    },
    message,
  )
}

/** ids 순서대로 목록을 다시 정렬. ids에 없는(그사이 새로 추가된) 항목은 맨 뒤에 그대로 둡니다. */
export function reorderItems(token, fileName, key, ids, message) {
  return saveData(
    token,
    fileName,
    (data) => {
      const list = listOf(data, key)
      const rank = new Map(ids.map((id, i) => [id, i]))
      const sorted = [...list].sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9))
      list.splice(0, list.length, ...sorted)
      return data
    },
    message,
  )
}

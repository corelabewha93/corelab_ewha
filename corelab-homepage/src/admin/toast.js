import { useSyncExternalStore } from 'react'

let message = null
let timer = null
const listeners = new Set()

function emit() {
  listeners.forEach((fn) => fn())
}

export function showToast(text, ms = 3500) {
  message = text
  emit()
  clearTimeout(timer)
  timer = setTimeout(() => {
    message = null
    emit()
  }, ms)
}

export function useToast() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => message,
  )
}

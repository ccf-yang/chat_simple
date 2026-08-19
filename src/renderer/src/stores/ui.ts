import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ToastItem {
  id: number
  text: string
  type: 'success' | 'error' | 'info'
}

export const useUiStore = defineStore('ui', () => {
  const toasts = ref<ToastItem[]>([])
  let seq = 0

  function toast(text: string, type: ToastItem['type'] = 'info', duration = 3000): void {
    const id = ++seq
    toasts.value.push({ id, text, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, duration)
  }

  return { toasts, toast }
})

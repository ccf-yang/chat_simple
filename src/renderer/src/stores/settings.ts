import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<ChatSettings>({ ...DEFAULT_SETTINGS })
  const loaded = ref(false)

  async function load(): Promise<void> {
    settings.value = await window.api.settings.get()
    loaded.value = true
  }

  async function persist(): Promise<void> {
    settings.value = await window.api.settings.set(settings.value)
  }

  return { settings, loaded, load, persist }
})

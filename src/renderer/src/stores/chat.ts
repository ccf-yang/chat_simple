import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage, SessionSummary } from '@shared/types'
import { createId } from '@shared/chat'
import { useSettingsStore } from './settings'
import { useUiStore } from './ui'

export type ChatRequestStatus = 'idle' | 'connecting' | 'streaming'

export const useChatStore = defineStore('chat', () => {
  const summaries = ref<SessionSummary[]>([])
  const currentId = ref<string | null>(null)
  const messages = ref(new Map<string, ChatMessage[]>())
  const sending = ref(false)
  const status = ref<ChatRequestStatus>('idle')
  const sendingSessionId = ref<string | null>(null)
  let registered = false

  function currentMessages(): ChatMessage[] {
    if (!currentId.value) return []
    return messages.value.get(currentId.value) ?? []
  }

  function currentSummary(): SessionSummary | undefined {
    return summaries.value.find((s) => s.id === currentId.value)
  }

  async function ensureLoaded(id: string): Promise<void> {
    if (messages.value.has(id)) return
    const session = await window.api.sessions.get(id)
    if (session) messages.value.set(id, session.messages)
  }

  async function select(id: string): Promise<void> {
    currentId.value = id
    await ensureLoaded(id)
  }

  async function create(): Promise<void> {
    const summary = await window.api.sessions.create()
    summaries.value.unshift(summary)
    messages.value.set(summary.id, [])
    await select(summary.id)
  }

  async function init(): Promise<void> {
    summaries.value = await window.api.sessions.list()
    if (!registered) {
      registerListeners()
      registered = true
    }
    if (summaries.value.length > 0) {
      await select(summaries.value[0].id)
    } else {
      await create()
    }
  }

  async function remove(id: string): Promise<void> {
    if (sending.value && sendingSessionId.value === id) {
      sending.value = false
      sendingSessionId.value = null
      status.value = 'idle'
    }
    await window.api.sessions.remove(id)
    summaries.value = summaries.value.filter((s) => s.id !== id)
    messages.value.delete(id)
    if (currentId.value === id) {
      if (summaries.value.length > 0) {
        await select(summaries.value[0].id)
      } else {
        await create()
      }
    }
  }

  function syncSummary(summary: SessionSummary): void {
    const index = summaries.value.findIndex((s) => s.id === summary.id)
    if (index !== -1) summaries.value[index] = summary
  }

  function resetRequestState(sessionId: string): void {
    if (sendingSessionId.value === sessionId) {
      sending.value = false
      sendingSessionId.value = null
      status.value = 'idle'
    }
  }

  async function sendMessage(content: string): Promise<void> {
    if (!currentId.value || sending.value) return
    const sessionId = currentId.value
    const list = messages.value.get(sessionId) ?? []
    const settingsStore = useSettingsStore()
    const uiStore = useUiStore()

    if (!settingsStore.settings.baseUrl.trim()) {
      uiStore.toast('请先在设置中配置 Base URL', 'error')
      return
    }

    const userMsg: ChatMessage = {
      id: createId('msg'),
      role: 'user',
      content,
      createdAt: Date.now()
    }
    list.push(userMsg)
    const s1 = await window.api.sessions.appendMessage(sessionId, userMsg)
    if (s1) syncSummary(s1)

    const assistantMsg: ChatMessage = {
      id: createId('msg'),
      role: 'assistant',
      content: '',
      createdAt: Date.now()
    }
    list.push(assistantMsg)
    const s2 = await window.api.sessions.appendMessage(sessionId, assistantMsg)
    if (s2) syncSummary(s2)

    sending.value = true
    status.value = 'connecting'
    sendingSessionId.value = sessionId

    await window.api.chat.send({
      sessionId,
      messages: list,
      settings: settingsStore.settings
    })
  }

  function registerListeners(): void {
    window.api.chat.onDelta(({ sessionId, delta }) => {
      const list = messages.value.get(sessionId)
      if (!list) return
      const last = list[list.length - 1]
      if (last && last.role === 'assistant' && !last.error) {
        last.content += delta
      }
    })

    window.api.chat.onStatus(({ sessionId, state }) => {
      if (sendingSessionId.value === sessionId) {
        status.value = state
      }
    })

    window.api.chat.onDone(async ({ sessionId, content, model }) => {
      const list = messages.value.get(sessionId)
      const last = list?.[list.length - 1]
      resetRequestState(sessionId)
      if (last && last.role === 'assistant') {
        last.content = content
        last.model = model
        await window.api.sessions.updateMessage(sessionId, last.id, { content, model })
      }
    })

    window.api.chat.onError(async ({ sessionId, message }) => {
      const list = messages.value.get(sessionId)
      const last = list?.[list.length - 1]
      resetRequestState(sessionId)
      if (last && last.role === 'assistant') {
        last.content = message
        last.error = true
        await window.api.sessions.updateMessage(sessionId, last.id, {
          content: message,
          error: true
        })
      }
    })
  }

  return {
    summaries,
    currentId,
    sending,
    status,
    sendingSessionId,
    currentMessages,
    currentSummary,
    init,
    select,
    create,
    remove,
    sendMessage
  }
})

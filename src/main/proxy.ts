import { ipcMain, BrowserWindow } from 'electron'
import type { WebContents } from 'electron'
import type {
  ChatDeltaEvent,
  ChatDoneEvent,
  ChatErrorEvent,
  ChatStatusEvent,
  ChatSettings,
  ChatMessage
} from '@shared/types'
import {
  buildChatCompletionsUrl,
  buildChatPayload,
  parseSSELine,
  toErrorMessage
} from '@shared/chat'

const REQUEST_TIMEOUT_MS = 60_000

function sendToWebContents(
  contents: WebContents,
  channel: 'chat:delta' | 'chat:done' | 'chat:error' | 'chat:status',
  payload: ChatDeltaEvent | ChatDoneEvent | ChatErrorEvent | ChatStatusEvent
): void {
  if (!contents.isDestroyed()) {
    contents.send(channel, payload)
  }
}

async function handleStream(
  contents: WebContents,
  response: Response,
  sessionId: string
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) {
    sendToWebContents(contents, 'chat:error', { sessionId, message: '响应体为空，无法读取流' })
    return
  }
  sendToWebContents(contents, 'chat:status', { sessionId, state: 'streaming' })
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  let model: string | undefined

  const flushLine = (line: string): void => {
    const parsed = parseSSELine(line)
    if (!parsed) return
    if (parsed.done) return
    if (parsed.content) {
      full += parsed.content
      sendToWebContents(contents, 'chat:delta', { sessionId, delta: parsed.content })
    }
    if (parsed.model) model = parsed.model
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      flushLine(line)
    }
  }

  if (buffer.trim()) {
    flushLine(buffer)
  }

  sendToWebContents(contents, 'chat:done', { sessionId, content: full, model })
}

export interface ChatSendRequest {
  sessionId: string
  messages: ChatMessage[]
  settings: ChatSettings
}

export function registerChatProxy(): void {
  ipcMain.handle('chat:send', async (event, req: ChatSendRequest) => {
    const contents = event.sender
    const { sessionId, messages, settings } = req
    const url = buildChatCompletionsUrl(settings.baseUrl)
    const payload = buildChatPayload({
      messages,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      stream: settings.stream,
      contextSize: settings.contextSize
    })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (settings.apiKey) {
        headers['Authorization'] = `Bearer ${settings.apiKey}`
      }
      sendToWebContents(contents, 'chat:status', { sessionId, state: 'connecting' })
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      if (!response.ok) {
        const text = await response.text()
        sendToWebContents(contents, 'chat:error', {
          sessionId,
          message: toErrorMessage(response.status, text)
        })
        return
      }

      if (settings.stream) {
        await handleStream(contents, response, sessionId)
      } else {
        sendToWebContents(contents, 'chat:status', { sessionId, state: 'streaming' })
        const json = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
          model?: string
        }
        const content = json.choices?.[0]?.message?.content ?? ''
        sendToWebContents(contents, 'chat:done', {
          sessionId,
          content,
          model: json.model
        })
      }
    } catch (err) {
      let detail: string
      if (err instanceof Error && err.name === 'AbortError') {
        detail = '请求超时，请检查网络或接口响应速度'
      } else if (err instanceof Error) {
        const cause = (err as { cause?: unknown }).cause
        const causeMsg = cause instanceof Error ? cause.message : null
        detail = causeMsg ? `请求失败：${causeMsg}` : `请求失败：${err.message}`
      } else {
        detail = '请求失败，请检查网络连接'
      }
      sendToWebContents(contents, 'chat:error', { sessionId, message: detail })
    } finally {
      clearTimeout(timer)
    }
  })
}

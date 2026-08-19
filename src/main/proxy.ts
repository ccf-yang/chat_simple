import { ipcMain, BrowserWindow } from 'electron'
import type { WebContents } from 'electron'
import type { ChatDeltaEvent, ChatDoneEvent, ChatErrorEvent, ChatSettings, ChatMessage } from '@shared/types'
import {
  buildChatCompletionsUrl,
  buildChatPayload,
  parseSSELine,
  toErrorMessage
} from '@shared/chat'

const REQUEST_TIMEOUT_MS = 180_000

function sendToWebContents(
  contents: WebContents,
  channel: 'chat:delta' | 'chat:done' | 'chat:error',
  payload: ChatDeltaEvent | ChatDoneEvent | ChatErrorEvent
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
      const message =
        err instanceof Error && err.name === 'AbortError'
          ? '请求超时，请检查网络或接口响应速度'
          : err instanceof Error
            ? `请求失败：${err.message}`
            : '请求失败，请检查网络连接'
      sendToWebContents(contents, 'chat:error', { sessionId, message })
    } finally {
      clearTimeout(timer)
    }
  })
}

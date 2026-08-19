import type { ChatMessage, ChatRole } from './types'

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function normalizeBaseUrl(raw: string): string {
  const url = raw.trim().replace(/\/+$/, '')
  return url.endsWith('/chat/completions') ? url.slice(0, -'/chat/completions'.length) : url
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/chat/completions`
}

export interface BuildPayloadOptions {
  messages: ChatMessage[]
  model: string
  temperature: number
  maxTokens: number
  stream: boolean
  contextSize: number
}

export function buildChatPayload(options: BuildPayloadOptions): Record<string, unknown> {
  const { messages, model, temperature, maxTokens, stream, contextSize } = options
  const trimmed = trimMessages(messages, contextSize)
  return {
    model,
    temperature,
    max_tokens: maxTokens,
    stream,
    messages: trimmed.map((m) => ({ role: m.role, content: m.content }))
  }
}

export function trimMessages(messages: ChatMessage[], maxCount: number): ChatMessage[] {
  if (maxCount <= 0 || messages.length <= maxCount) return messages
  return messages.slice(messages.length - maxCount)
}

export function extractTitle(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim()
  if (!clean) return '新会话'
  return clean.length > 24 ? `${clean.slice(0, 24)}...` : clean
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 3.5)
}

export interface ParsedSSEChunk {
  content: string
  finishReason: string | null
  model: string | null
  done: boolean
}

export function parseSSELine(line: string): ParsedSSEChunk | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null
  const data = trimmed.slice(5).trim()
  if (!data) return null
  if (data === '[DONE]') {
    return { content: '', finishReason: null, model: null, done: true }
  }
  try {
    const json = JSON.parse(data)
    const choice = json?.choices?.[0]
    const delta = choice?.delta
    const content = typeof delta?.content === 'string' ? delta.content : ''
    const finishReason = typeof choice?.finish_reason === 'string' ? choice.finish_reason : null
    const model = typeof json?.model === 'string' ? json.model : null
    return { content, finishReason, model, done: false }
  } catch {
    return null
  }
}

export function toErrorMessage(status: number | null, body: string): string {
  if (status === null) return `网络请求失败，请检查 Base URL 与网络连接`
  if (status === 401 || status === 403) return `鉴权失败（HTTP ${status}），请检查 API Key`
  if (status === 404) return `接口不存在（HTTP 404），请检查 Base URL 是否以 /v1 结尾`
  if (status === 429) return `请求过于频繁或额度不足（HTTP 429）`
  if (status >= 500) return `服务端错误（HTTP ${status}）`
  try {
    const json = JSON.parse(body)
    const msg = json?.error?.message
    if (typeof msg === 'string') return msg
  } catch {
    // ignore parse failure
  }
  return `请求失败（HTTP ${status}）`
}

export const ROLE_LABELS: Record<ChatRole, string> = {
  system: '系统',
  user: '我',
  assistant: 'AI'
}

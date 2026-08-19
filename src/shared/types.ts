export interface ChatSettings {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  stream: boolean
  contextSize: number
}

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  model?: string
  error?: boolean
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

export interface SessionSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messageCount: number
}

export interface ChatDeltaEvent {
  sessionId: string
  delta: string
}

export interface ChatDoneEvent {
  sessionId: string
  content: string
  model?: string
}

export interface ChatErrorEvent {
  sessionId: string
  message: string
}

export interface SendChatRequest {
  sessionId: string
  messages: ChatMessage[]
}

export const DEFAULT_SETTINGS: ChatSettings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
  stream: true,
  contextSize: 20
}

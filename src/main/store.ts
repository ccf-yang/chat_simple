import { safeStorage, app } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import type { ChatMessage, ChatSession, ChatSettings, SessionSummary } from '@shared/types'
import { createId, extractTitle } from '@shared/chat'
import { DEFAULT_SETTINGS } from '@shared/types'

const DEFAULT_TITLE = '新会话'

interface StoredSettings {
  settings: ChatSettings
  apiKeyEncrypted: boolean
}

interface SessionsFile {
  version: number
  summaries: SessionSummary[]
  messages: Record<string, ChatMessage[]>
}

function dataDir(): string {
  return join(app.getPath('userData'), 'data')
}

function settingsPath(): string {
  return join(dataDir(), 'settings.json')
}

function sessionsPath(): string {
  return join(dataDir(), 'sessions.json')
}

async function ensureDataDir(): Promise<void> {
  await mkdir(dataDir(), { recursive: true })
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    if (!existsSync(file)) return fallback
    const raw = await readFile(file, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await ensureDataDir()
  await writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
}

function encryptApiKey(key: string): { value: string; encrypted: boolean } {
  if (key && safeStorage.isEncryptionAvailable()) {
    return { value: safeStorage.encryptString(key).toString('base64'), encrypted: true }
  }
  return { value: key, encrypted: false }
}

function decryptApiKey(stored: StoredSettings): string {
  const { settings, apiKeyEncrypted } = stored
  if (settings.apiKey && apiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(settings.apiKey, 'base64'))
    } catch {
      return settings.apiKey
    }
  }
  return settings.apiKey
}

export async function getSettings(): Promise<ChatSettings> {
  const stored = await readJson<StoredSettings | null>(settingsPath(), null)
  if (!stored) return { ...DEFAULT_SETTINGS }
  return { ...DEFAULT_SETTINGS, ...stored.settings, apiKey: decryptApiKey(stored) }
}

export async function saveSettings(settings: ChatSettings): Promise<ChatSettings> {
  const encrypted = encryptApiKey(settings.apiKey)
  const stored: StoredSettings = {
    settings: { ...settings, apiKey: encrypted.value },
    apiKeyEncrypted: encrypted.encrypted
  }
  await writeJson(settingsPath(), stored)
  return { ...settings, apiKey: decryptApiKey(stored) }
}

function emptySessions(): SessionsFile {
  return { version: 1, summaries: [], messages: {} }
}

export async function listSessions(): Promise<SessionSummary[]> {
  const data = await readJson<SessionsFile>(sessionsPath(), emptySessions())
  return data.summaries
}

export async function getSession(id: string): Promise<ChatSession | null> {
  const data = await readJson<SessionsFile>(sessionsPath(), emptySessions())
  const summary = data.summaries.find((s) => s.id === id)
  if (!summary) return null
  return { ...summary, messages: data.messages[id] ?? [] }
}

export async function createSession(): Promise<SessionSummary> {
  const data = await readJson<SessionsFile>(sessionsPath(), emptySessions())
  const now = Date.now()
  const summary: SessionSummary = {
    id: createId('sess'),
    title: DEFAULT_TITLE,
    createdAt: now,
    updatedAt: now,
    messageCount: 0
  }
  data.summaries.unshift(summary)
  data.messages[summary.id] = []
  await writeJson(sessionsPath(), data)
  return summary
}

export async function deleteSession(id: string): Promise<boolean> {
  const data = await readJson<SessionsFile>(sessionsPath(), emptySessions())
  const index = data.summaries.findIndex((s) => s.id === id)
  if (index === -1) return false
  data.summaries.splice(index, 1)
  delete data.messages[id]
  await writeJson(sessionsPath(), data)
  return true
}

export async function updateSessionTitle(id: string, title: string): Promise<boolean> {
  const data = await readJson<SessionsFile>(sessionsPath(), emptySessions())
  const summary = data.summaries.find((s) => s.id === id)
  if (!summary) return false
  summary.title = title
  summary.updatedAt = Date.now()
  await writeJson(sessionsPath(), data)
  return true
}

export async function appendMessage(id: string, message: ChatMessage): Promise<SessionSummary | null> {
  const data = await readJson<SessionsFile>(sessionsPath(), emptySessions())
  const summary = data.summaries.find((s) => s.id === id)
  if (!summary) return null
  const list = data.messages[id] ?? []
  list.push(message)
  data.messages[id] = list
  summary.messageCount = list.length
  summary.updatedAt = message.createdAt
  if (summary.title === DEFAULT_TITLE && message.role === 'user') {
    summary.title = extractTitle(message.content)
  }
  await writeJson(sessionsPath(), data)
  return summary
}

export async function updateMessage(id: string, messageId: string, patch: Partial<ChatMessage>): Promise<boolean> {
  const data = await readJson<SessionsFile>(sessionsPath(), emptySessions())
  const list = data.messages[id]
  if (!list) return false
  const index = list.findIndex((m) => m.id === messageId)
  if (index === -1) return false
  list[index] = { ...list[index], ...patch }
  await writeJson(sessionsPath(), data)
  return true
}

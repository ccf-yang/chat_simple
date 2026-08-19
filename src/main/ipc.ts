import { ipcMain } from 'electron'
import type { ChatMessage, ChatSettings, SessionSummary } from '@shared/types'
import {
  getSettings,
  saveSettings,
  listSessions,
  getSession,
  createSession,
  deleteSession,
  updateSessionTitle,
  appendMessage,
  updateMessage
} from './store'
import { registerChatProxy } from './proxy'

export function registerIpc(): void {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_event, settings: ChatSettings) => saveSettings(settings))

  ipcMain.handle('sessions:list', (): Promise<SessionSummary[]> => listSessions())
  ipcMain.handle('sessions:get', (_event, id: string) => getSession(id))
  ipcMain.handle('sessions:create', (): Promise<SessionSummary> => createSession())
  ipcMain.handle('sessions:delete', (_event, id: string) => deleteSession(id))
  ipcMain.handle('sessions:updateTitle', (_event, id: string, title: string) =>
    updateSessionTitle(id, title)
  )
  ipcMain.handle('sessions:appendMessage', (_event, id: string, message: ChatMessage) =>
    appendMessage(id, message)
  )
  ipcMain.handle('sessions:updateMessage', (_event, id: string, messageId: string, patch: Partial<ChatMessage>) =>
    updateMessage(id, messageId, patch)
  )

  registerChatProxy()
}

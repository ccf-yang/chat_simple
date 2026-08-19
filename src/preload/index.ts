import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type {
  ChatDeltaEvent,
  ChatDoneEvent,
  ChatErrorEvent,
  ChatMessage,
  ChatSettings,
  ChatSession,
  SessionSummary
} from '@shared/types'

interface ChatApi {
  send(req: {
    sessionId: string
    messages: ChatMessage[]
    settings: ChatSettings
  }): Promise<void>
  onDelta(cb: (event: ChatDeltaEvent) => void): () => void
  onDone(cb: (event: ChatDoneEvent) => void): () => void
  onError(cb: (event: ChatErrorEvent) => void): () => void
}

const api = {
  settings: {
    get(): Promise<ChatSettings> {
      return ipcRenderer.invoke('settings:get')
    },
    set(settings: ChatSettings): Promise<ChatSettings> {
      return ipcRenderer.invoke('settings:set', settings)
    }
  },
  sessions: {
    list(): Promise<SessionSummary[]> {
      return ipcRenderer.invoke('sessions:list')
    },
    get(id: string): Promise<ChatSession | null> {
      return ipcRenderer.invoke('sessions:get', id)
    },
    create(): Promise<SessionSummary> {
      return ipcRenderer.invoke('sessions:create')
    },
    remove(id: string): Promise<boolean> {
      return ipcRenderer.invoke('sessions:delete', id)
    },
    updateTitle(id: string, title: string): Promise<boolean> {
      return ipcRenderer.invoke('sessions:updateTitle', id, title)
    },
    appendMessage(id: string, message: ChatMessage): Promise<SessionSummary | null> {
      return ipcRenderer.invoke('sessions:appendMessage', id, message)
    },
    updateMessage(
      id: string,
      messageId: string,
      patch: Partial<ChatMessage>
    ): Promise<boolean> {
      return ipcRenderer.invoke('sessions:updateMessage', id, messageId, patch)
    }
  },
  chat: {
    send(req: {
      sessionId: string
      messages: ChatMessage[]
      settings: ChatSettings
    }): Promise<void> {
      return ipcRenderer.invoke('chat:send', req)
    },
    onDelta(cb: (event: ChatDeltaEvent) => void): () => void {
      const listener = (_e: IpcRendererEvent, event: ChatDeltaEvent): void => cb(event)
      ipcRenderer.on('chat:delta', listener)
      return () => ipcRenderer.removeListener('chat:delta', listener)
    },
    onDone(cb: (event: ChatDoneEvent) => void): () => void {
      const listener = (_e: IpcRendererEvent, event: ChatDoneEvent): void => cb(event)
      ipcRenderer.on('chat:done', listener)
      return () => ipcRenderer.removeListener('chat:done', listener)
    },
    onError(cb: (event: ChatErrorEvent) => void): () => void {
      const listener = (_e: IpcRendererEvent, event: ChatErrorEvent): void => cb(event)
      ipcRenderer.on('chat:error', listener)
      return () => ipcRenderer.removeListener('chat:error', listener)
    }
  }
}

export type DesktopApi = typeof api

contextBridge.exposeInMainWorld('api', api)

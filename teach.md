# Chat Simple 项目技术文档

## 项目概述

Chat Simple 是一个基于 Electron + Vue 3 + TypeScript 的桌面 AI 聊天应用。它提供了一个现代化的聊天界面，支持与 OpenAI 兼容的 API 进行对话，具有会话管理、流式响应、设置持久化等功能。

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron | 桌面应用框架 |
| Vue 3 | 前端 UI 框架 |
| TypeScript | 类型安全的开发语言 |
| Pinia | 状态管理 |
| Vite | 构建工具 |
| electron-builder | 打包工具 |

## 项目结构

```
chat_simple/
├── src/
│   ├── main/                    # 主进程代码
│   │   ├── index.ts             # 应用入口，窗口创建
│   │   ├── proxy.ts             # API 请求代理（SSE 流处理）
│   │   ├── ipc.ts               # IPC 通信注册
│   │   └── store.ts             # 本地数据持久化
│   ├── preload/                 # 预加载脚本
│   │   ├── index.ts             # contextBridge 安全桥接
│   │   └── index.d.ts           # 类型定义
│   ├── shared/                  # 共享代码（无 Electron 依赖）
│   │   ├── types.ts             # 类型定义和默认设置
│   │   └── chat.ts              # 纯业务逻辑
│   └── renderer/                # 渲染进程（Vue 3 应用）
│       └── src/
│           ├── App.vue          # 根组件
│           ├── main.ts          # Vue 应用入口
│           ├── styles/
│           │   └── main.css     # 全局样式
│           ├── components/      # UI 组件
│           │   ├── TabBar.vue          # 会话列表
│           │   ├── ChatWindow.vue      # 聊天窗口
│           │   ├── MessageItem.vue       # 消息渲染
│           │   ├── InputBox.vue        # 输入框
│           │   └── SettingsPanel.vue   # 设置面板
│           └── stores/          # Pinia 状态管理
│               ├── chat.ts      # 聊天状态
│               ├── settings.ts  # 设置状态
│               └── ui.ts        # UI 状态
├── package.json                 # 项目配置
├── tsconfig.json                # TypeScript 配置
├── vite.config.ts               # Vite 配置
└── electron-builder.yml         # 打包配置
```

## 核心模块详解

### 1. 主进程（Main Process）

#### `src/main/index.ts` - 应用入口

**职责**：创建应用窗口，管理应用生命周期

```typescript
// 创建浏览器窗口
function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1160,
    height: 800,
    // 安全配置
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,    // 启用上下文隔离
      nodeIntegration: false,     // 禁用 Node.js 集成
      sandbox: false
    }
  })
  // ...
}

// 应用就绪后创建窗口
app.whenReady().then(() => {
  registerIpc()  // 注册 IPC 处理器
  createWindow() // 创建窗口
})
```

**关键点**：
- 开发模式加载 Vite 开发服务器 URL
- 生产模式加载打包后的 HTML 文件
- 处理窗口关闭和激活事件

#### `src/main/ipc.ts` - IPC 通信注册

**职责**：注册所有 IPC 处理器，连接渲染进程和主进程

```typescript
export function registerIpc(): void {
  // 设置相关
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_event, settings) => saveSettings(settings))

  // 会话相关
  ipcMain.handle('sessions:list', () => listSessions())
  ipcMain.handle('sessions:get', (_event, id) => getSession(id))
  ipcMain.handle('sessions:create', () => createSession())
  // ...

  // 注册聊天代理
  registerChatProxy()
}
```

**IPC 通道列表**：

| 通道名称 | 方向 | 用途 |
|---------|------|------|
| `settings:get` | 渲染→主 | 获取设置 |
| `settings:set` | 渲染→主 | 保存设置 |
| `sessions:list` | 渲染→主 | 获取会话列表 |
| `sessions:get` | 渲染→主 | 获取单个会话 |
| `sessions:create` | 渲染→主 | 创建会话 |
| `sessions:delete` | 渲染→主 | 删除会话 |
| `sessions:updateTitle` | 渲染→主 | 更新会话标题 |
| `sessions:appendMessage` | 渲染→主 | 添加消息 |
| `sessions:updateMessage` | 渲染→主 | 更新消息 |
| `chat:send` | 渲染→主 | 发送聊天请求 |
| `chat:delta` | 主→渲染 | 流式响应增量 |
| `chat:done` | 主→渲染 | 响应完成 |
| `chat:error` | 主→渲染 | 错误通知 |
| `chat:status` | 主→渲染 | 状态更新 |

#### `src/main/proxy.ts` - 请求代理

**职责**：处理聊天请求，代理到 OpenAI 兼容 API

```typescript
export function registerChatProxy(): void {
  ipcMain.handle('chat:send', async (event, req: ChatSendRequest) => {
    // 1. 构建请求 URL 和 payload
    const url = buildChatCompletionsUrl(settings.baseUrl)
    const payload = buildChatPayload({...})

    // 2. 发送 HTTP 请求
    const response = await fetch(url, {
      method: 'POST',
      headers: {...},
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    // 3. 处理响应
    if (settings.stream) {
      await handleStream(contents, response, sessionId)  // 流式响应
    } else {
      // 非流式响应
    }
  })
}
```

**流式响应处理**：
```typescript
async function handleStream(contents, response, sessionId) {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // 按行解析 SSE 数据
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      flushLine(line)  // 解析并发送增量
    }
  }
}
```

#### `src/main/store.ts` - 数据持久化

**职责**：管理本地 JSON 文件存储和 API Key 加密

```typescript
// 数据存储位置
function dataDir(): string {
  return join(app.getPath('userData'), 'data')
}

// 设置存储
async function saveSettings(settings: ChatSettings) {
  const encrypted = encryptApiKey(settings.apiKey)  // 加密 API Key
  await writeJson(settingsPath(), stored)
}

// 会话存储
async function appendMessage(id: string, message: ChatMessage) {
  const data = await readJson<SessionsFile>(sessionsPath(), emptySessions())
  // 更新会话数据
  await writeJson(sessionsPath(), data)
}
```

**存储文件**：
- `settings.json` - 应用设置（API Key 加密存储）
- `sessions.json` - 会话和消息数据

### 2. 预加载脚本（Preload）

#### `src/preload/index.ts`

**职责**：通过 contextBridge 安全地暴露 API 给渲染进程

```typescript
const api = {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings) => ipcRenderer.invoke('settings:set', settings)
  },
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    // ...
  },
  chat: {
    send: (req) => ipcRenderer.invoke('chat:send', req),
    onDelta: (cb) => {
      const listener = (_e, event) => cb(event)
      ipcRenderer.on('chat:delta', listener)
      return () => ipcRenderer.removeListener('chat:delta', listener)
    }
    // ...
  }
}

contextBridge.exposeInMainWorld('api', api)
```

**安全特性**：
- 使用 `contextBridge` 隔离上下文
- 不直接暴露 `ipcRenderer`
- 提供类型安全的 API 接口

### 3. 共享代码（Shared）

#### `src/shared/types.ts`

**职责**：定义所有共享类型和默认设置

```typescript
export interface ChatSettings {
  baseUrl: string
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  stream: boolean
  contextSize: number
}

export const DEFAULT_SETTINGS: ChatSettings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 2048,
  stream: true,
  contextSize: 10
}
```

#### `src/shared/chat.ts`

**职责**：纯业务逻辑，无 Electron 依赖

```typescript
// 构建 API URL
export function buildChatCompletionsUrl(baseUrl: string): string

// 构建请求 payload
export function buildChatPayload(options): Record<string, unknown>

// 解析 SSE 行
export function parseSSELine(line: string): SSELineResult | null

// 错误消息映射
export function toErrorMessage(status: number, body: string): string
```

### 4. 渲染进程（Renderer）

#### `src/renderer/src/main.ts`

**职责**：Vue 应用入口

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'

createApp(App).use(createPinia()).mount('#app')
```

#### `src/renderer/src/App.vue`

**职责**：根组件，布局和初始化

```vue
<script setup lang="ts">
onMounted(async () => {
  await Promise.all([settings.load(), chat.init()])
})
</script>

<template>
  <div class="app">
    <div class="sidebar">
      <TabBar />
      <button @click="settingsOpen = true">设置</button>
    </div>
    <main class="main">
      <ChatWindow />
    </main>
    <SettingsPanel v-if="settingsOpen" />
  </div>
</template>
```

#### 状态管理（Pinia Stores）

**`stores/settings.ts`** - 设置状态
```typescript
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<ChatSettings>({ ...DEFAULT_SETTINGS })

  async function load() {
    const stored = await window.api.settings.get()
    settings.value = { ...DEFAULT_SETTINGS, ...stored }
  }

  async function save(newSettings: ChatSettings) {
    const saved = await window.api.settings.set(newSettings)
    settings.value = { ...saved }
  }

  return { settings, load, save }
})
```

**`stores/chat.ts`** - 聊天状态
```typescript
export const useChatStore = defineStore('chat', () => {
  const sessions = ref<SessionSummary[]>([])
  const currentSessionId = ref<string | null>(null)
  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)

  async function sendMessage(content: string) {
    // 1. 添加用户消息
    // 2. 设置事件监听
    // 3. 发送请求
    await window.api.chat.send({
      sessionId: currentSessionId.value,
      messages: plainMessages,
      settings: plainSettings
    })
  }

  return { sessions, messages, sendMessage, /* ... */ }
})
```

**`stores/ui.ts`** - UI 状态
```typescript
export const useUiStore = defineStore('ui', () => {
  const toasts = ref<Toast[]>([])

  function showToast(text: string, type: Toast['type'] = 'info') {
    // 显示 Toast 通知
  }

  return { toasts, showToast }
})
```

## 调用流程

### 1. 应用启动流程

```
1. Electron 启动
   ↓
2. app.whenReady()
   ↓
3. registerIpc() - 注册所有 IPC 处理器
   ↓
4. createWindow() - 创建窗口
   ↓
5. 加载渲染进程（Vue 应用）
   ↓
6. Vue 应用挂载
   ↓
7. App.vue onMounted
   ↓
8. 并行加载设置和会话
   ↓
9. 应用就绪
```

### 2. 发送消息流程

```
用户输入消息
   ↓
InputBox.vue 触发 handleSend()
   ↓
chatStore.sendMessage(content)
   ↓
1. 创建用户消息对象
2. 添加到本地消息列表
3. 持久化用户消息（IPC: sessions:appendMessage）
4. 创建 assistant 消息占位
5. 设置事件监听器（onDelta, onDone, onError）
   ↓
window.api.chat.send({...})
   ↓
preload 转发到主进程
   ↓
ipcMain.handle('chat:send')
   ↓
proxy.ts 处理请求
   ↓
1. 构建 URL 和 payload
2. 发送 HTTP 请求
3. 处理响应
   ↓
如果是流式响应：
   ↓
handleStream() 解析 SSE
   ↓
发送 chat:delta 事件
   ↓
渲染进程接收增量更新
   ↓
chatStore 更新消息内容
   ↓
UI 实时显示
   ↓
流结束
   ↓
发送 chat:done 事件
   ↓
chatStore 持久化 AI 消息
   ↓
完成
```

### 3. 设置保存流程

```
用户修改设置
   ↓
SettingsPanel.vue - handleSave()
   ↓
settingsStore.save(newSettings)
   ↓
window.api.settings.set(settings)
   ↓
IPC: settings:set
   ↓
主进程 saveSettings()
   ↓
加密 API Key
   ↓
写入 settings.json
   ↓
返回保存结果
   ↓
更新 UI
```

## 构建和打包

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

开发模式使用 Vite 开发服务器，支持热重载。

### 构建

```bash
# 构建渲染进程
npm run build

# 构建主进程
npm run build:main

# 完整构建
npm run build:all
```

### 打包成 EXE

```bash
# 打包 Windows 应用
npm run build:win

# 打包所有平台
npm run build:all
```

**打包配置**（`electron-builder.yml`）：

```yaml
appId: com.example.chatsimple
productName: Chat Simple
directories:
  output: release
files:
  - dist/**
  - dist-electron/**
win:
  target:
    - nsis
  icon: build/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

## 配置文件说明

### `package.json`

```json
{
  "main": "dist-electron/main/index.js",  // 主进程入口
  "scripts": {
    "dev": "electron-vite dev",           // 开发模式
    "build": "electron-vite build",       // 构建
    "build:win": "electron-vite build && electron-builder --win"  // 打包 Windows
  }
}
```

### `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer/src'),
      '@shared': path.resolve(__dirname, 'src/shared')
    }
  }
})
```

### `tsconfig.json`

TypeScript 配置，包含路径别名和编译选项。

## 安全考虑

1. **上下文隔离**：`contextIsolation: true`
2. **禁用 Node.js 集成**：`nodeIntegration: false`
3. **API Key 加密**：使用 Electron `safeStorage` API
4. **输入验证**：IPC 参数验证
5. **错误处理**：完善的错误捕获和用户提示

## 扩展指南

### 添加新功能

1. **添加新的 IPC 通道**：
   - 在 `src/main/ipc.ts` 注册处理器
   - 在 `src/preload/index.ts` 暴露 API
   - 在 `src/preload/index.d.ts` 更新类型

2. **添加新的 UI 组件**：
   - 在 `src/renderer/src/components/` 创建组件
   - 在需要的地方引入使用

3. **添加新的状态**：
   - 在 `src/renderer/src/stores/` 创建 store
   - 在组件中使用

4. **添加新的共享逻辑**：
   - 在 `src/shared/` 添加纯函数
   - 在主进程和渲染进程中使用

## 调试技巧

1. **主进程调试**：在 `src/main/` 中使用 `console.log`
2. **渲染进程调试**：打开开发者工具（Ctrl+Shift+I）
3. **IPC 调试**：在 `src/main/ipc.ts` 中添加日志
4. **网络请求调试**：在 `src/main/proxy.ts` 中添加日志

## 总结

这个项目采用 Electron 的三层架构：
- **主进程**：负责窗口管理、文件系统、网络请求
- **预加载脚本**：安全桥接主进程和渲染进程
- **渲染进程**：Vue 3 应用，负责 UI 和用户交互

通过 IPC 通信实现进程间数据传递，使用 Pinia 管理前端状态，使用 JSON 文件持久化数据，使用 SSE 实现流式响应。

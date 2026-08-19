# OpenAI Chat Desktop

一个基于 Electron 的 OpenAI 兼容接口聊天桌面客户端。支持自定义 Base URL / API Key / Model，多会话 Tab，流式输出，可打包为 Windows 双击即用的 exe。

## 功能特性

- 对接 OpenAI 兼容的 `/v1/chat/completions` 接口（OpenAI、DeepSeek、中转站、本地 vLLM/Ollama 均可）
- 设置面板可配置 Base URL、API Key、Model、Temperature、Max Tokens、上下文条数、流式开关
- 多 Tab 会话：新建、切换、删除，会话与消息本地持久化
- 每次请求自动携带最近 N 条历史消息作为上下文（条数可在设置中调整）
- SSE 流式输出，打字机效果
- 每条回答可一键复制
- API Key 使用 Electron safeStorage 加密落盘（无系统密钥环时自动降级为明文，仅本机可见）
- 主进程代理网络请求，无 CORS 困扰

## 架构

```
src/
├── main/       主进程：窗口创建、SSE 请求代理、IPC、本地存储
│   ├── index.ts
│   ├── proxy.ts     /chat/completions 请求代理（含 SSE 流透传）
│   ├── ipc.ts       IPC handler 注册
│   └── store.ts     设置与会话的 JSON 持久化 + API Key 加密
├── preload/     contextBridge 安全桥接，渲染进程通过 window.api 访问能力
├── shared/      纯业务逻辑，无 Electron 依赖，可独立单测
│   ├── types.ts     类型与默认设置
│   └── chat.ts      SSE 解析、payload 构建、上下文裁剪、错误映射
└── renderer/    Vue3 + Pinia UI
    └── src/
        ├── App.vue            布局与设置弹窗入口
        ├── components/
        │   ├── TabBar.vue     会话列表与新建/删除
        │   ├── ChatWindow.vue 会话标题、消息列表、自动滚动
        │   ├── MessageItem.vue 消息渲染（Markdown）与复制
        │   ├── InputBox.vue   输入框，Enter 发送 / Shift+Enter 换行
        │   └── SettingsPanel.vue 接口配置弹窗
        └── stores/
            ├── chat.ts        会话状态、消息缓存、流式事件分发
            └── settings.ts    设置状态
```

数据流：渲染进程 → `window.api` → IPC → 主进程代理 → OpenAI 兼容接口；SSE 流经主进程解析后按 chunk 推送回渲染进程，实现打字机效果。

## 快速开始

环境要求：Node.js 18+

```bash
npm install

# 开发调试（热更新）
npm run dev
```

## 打包

### Windows exe（在 Windows 机器上执行）

```bash
# 免安装单文件 exe（双击即用）
npm run build:win:portable

# 安装版 exe
npm run build:win
```

产物位于 `dist/` 目录。

### Linux

```bash
npm run build:linux
```

> 说明：Windows 包需在 Windows 环境产出（Linux 交叉打包依赖 wine）。打包配置见 `electron-builder.yml`。

## 使用

1. 启动应用后点击左下角「设置」
2. 填写 Base URL（只需填到 `/v1` 层级，如 `https://api.openai.com/v1`）、API Key、Model
3. 保存后在输入框提问即可，左侧「＋ 新建会话」可开启新 Tab 独立对话

数据保存位置：Electron `userData` 目录下的 `data/settings.json` 与 `data/sessions.json`。

## 常用命令

```bash
npm run dev            # 开发调试
npm run build          # 仅构建产物（out/）
npm run typecheck      # TypeScript 类型检查
npm run build:win      # 打 Windows 安装版
npm run build:win:portable  # 打 Windows 免安装版
npm run build:linux    # 打 Linux AppImage
```

## 目录约定

- 新增纯业务逻辑（如请求组装、数据转换）放 `src/shared/`，保持无 Electron 依赖，便于测试与复用
- 新增界面组件放 `src/renderer/src/components/`，全局样式在 `src/renderer/src/styles/main.css`
- 新增 IPC 通道时，同时在 `src/main/ipc.ts`、`src/preload/index.ts` 与 `src/shared/types.ts` 同步定义类型

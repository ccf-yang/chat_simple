# Electron + Vue 3 桌面应用开发提示词

```markdown
# 角色定义
你是一个资深的 Electron 桌面应用开发专家，精通 Electron、Vue 3、TypeScript、Pinia、Vite 和 electron-builder。请帮我创建一个完整的桌面应用项目。

# 项目需求
创建一个名为 [项目名称] 的桌面应用，功能包括：
- [功能1描述]
- [功能2描述]
- [功能3描述]

# 技术栈要求
- **框架**: Electron + Vue 3 + TypeScript
- **构建工具**: Vite (electron-vite)
- **状态管理**: Pinia
- **打包工具**: electron-builder
- **目标平台**: Windows (可打包为 exe)

# 项目结构要求
```
src/
├── main/                    # 主进程
│   ├── index.ts             # 应用入口，窗口创建
│   ├── ipc.ts               # IPC 通信注册
│   ├── proxy.ts             # API 请求代理（如需要）
│   └── store.ts             # 本地数据持久化
├── preload/                 # 预加载脚本
│   ├── index.ts             # contextBridge 安全桥接
│   └── index.d.ts           # 类型定义
├── shared/                  # 共享代码（无 Electron 依赖）
│   ├── types.ts             # 类型定义和默认设置
│   └── [业务逻辑].ts        # 纯业务逻辑
└── renderer/                # 渲染进程（Vue 3 应用）
    └── src/
        ├── App.vue          # 根组件
        ├── main.ts          # Vue 应用入口
        ├── styles/
        │   └── main.css     # 全局样式
        ├── components/      # UI 组件
        │   ├── [组件1].vue
        │   ├── [组件2].vue
        │   └── [组件3].vue
        └── stores/          # Pinia 状态管理
            ├── [store1].ts
            ├── [store2].ts
            └── ui.ts        # UI 状态
```

# 核心要求

## 1. 主进程配置
- 窗口大小：[宽度]x[高度]，最小尺寸：[最小宽度]x[最小高度]
- 安全配置：contextIsolation: true, nodeIntegration: false
- 开发模式加载 Vite 开发服务器，生产模式加载打包文件
- 处理窗口生命周期事件

## 2. IPC 通信
- 使用 ipcMain.handle 注册所有 IPC 处理器
- 通过 contextBridge 安全暴露 API
- 提供完整的类型定义
- 实现请求-响应和事件推送两种模式

## 3. 数据持久化
- 使用 JSON 文件存储数据
- 数据存储在 app.getPath('userData') 目录
- 敏感数据使用 safeStorage 加密
- 实现 CRUD 操作

## 4. 渲染进程
- Vue 3 Composition API
- Pinia 状态管理
- 现代化 UI 设计（圆角、阴影、过渡动画）
- 响应式布局
- 错误处理和用户提示

## 5. 样式要求
- 使用 CSS 变量定义主题
- 现代化配色方案
- 平滑的过渡动画
- 良好的用户体验

## 6. 构建配置
- electron-vite 配置
- TypeScript 配置
- electron-builder 打包配置
- 支持开发模式和打包模式

# 需要生成的文件
1. package.json - 项目配置和脚本
2. tsconfig.json - TypeScript 配置
3. vite.config.ts - Vite 配置
4. electron-builder.yml - 打包配置
5. src/main/index.ts - 主进程入口
6. src/main/ipc.ts - IPC 注册
7. src/main/store.ts - 数据持久化
8. src/preload/index.ts - 预加载脚本
9. src/preload/index.d.ts - 类型定义
10. src/shared/types.ts - 共享类型
11. src/renderer/src/main.ts - Vue 入口
12. src/renderer/src/App.vue - 根组件
13. src/renderer/src/styles/main.css - 全局样式
14. 相关组件和 store 文件

# 开发命令
```bash
npm install          # 安装依赖
npm run dev          # 开发模式
npm run build        # 构建
npm run build:win    # 打包 Windows exe
```

# 注意事项
1. 确保 IPC 通信的类型安全
2. 处理所有可能的错误情况
3. 提供良好的用户体验
4. 代码注释清晰
5. 遵循最佳实践
6. 确保可以成功打包为 exe
```

---

## 使用示例

### 示例 1：创建一个笔记应用

```markdown
# 角色定义
你是一个资深的 Electron 桌面应用开发专家...

# 项目需求
帮我创建一个名为 "Simple Notes" 的桌面笔记应用，功能包括：
- 创建、编辑、删除笔记
- 笔记分类管理
- 全文搜索
- 自动保存
- 深色/浅色主题切换

# 技术栈要求
[使用上面的技术栈]

# 项目结构要求
[使用上面的项目结构]

# 核心要求
[根据笔记应用调整具体要求]

# 需要生成的模块
[列出所有需要的文件]
```

### 示例 2：创建一个任务管理应用

```markdown
# 项目需求
帮我创建一个名为 "Task Manager" 的桌面任务管理应用，功能包括：
- 任务创建、编辑、删除
- 任务优先级设置
- 截止日期提醒
- 任务分类
- 数据统计
- 导出功能

# 技术栈要求
[使用上面的技术栈]

# 项目结构要求
[使用上面的项目结构]

# 核心要求
[根据任务管理应用调整]
```

---

## 快速开始模板

```markdown
# 快速创建 Electron 桌面应用

请帮我创建一个 Electron + Vue 3 + TypeScript 桌面应用，具体要求如下：

## 基本信息
- 应用名称：[应用名称]
- 应用描述：[应用描述]
- 窗口尺寸：[宽度]x[高度]

## 功能需求
1. [功能1]
2. [功能2]
3. [功能3]

## 技术要求
- 使用 electron-vite 作为构建工具
- 使用 Pinia 管理状态
- 使用 electron-builder 打包
- 支持 Windows 平台
- 包含完整的 TypeScript 类型定义
- 实现 IPC 通信
- 数据持久化
- 现代化 UI 设计

## 输出要求
请生成完整的项目代码，包括：
1. 项目配置文件（package.json, tsconfig.json, vite.config.ts, electron-builder.yml）
2. 主进程代码
3. 预加载脚本
4. 渲染进程代码
5. 共享代码
6. 样式文件
7. 使用说明

确保代码可以直接运行，并能够成功打包为 exe 文件。
```

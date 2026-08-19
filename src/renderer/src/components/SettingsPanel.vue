<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import type { ChatSettings } from '@shared/types'
import { DEFAULT_SETTINGS } from '@shared/types'

const emit = defineEmits<{ close: [] }>()

const store = useSettingsStore()
const ui = useUiStore()
const form = reactive<ChatSettings>({ ...DEFAULT_SETTINGS })

onMounted(async () => {
  if (!store.loaded) await store.load()
  Object.assign(form, store.settings)
})

async function save(): Promise<void> {
  if (!form.baseUrl.trim()) {
    ui.toast('请填写 Base URL', 'error')
    return
  }
  try {
    store.settings = { ...form }
    await store.persist()
    ui.toast('设置已保存', 'success')
    emit('close')
  } catch (err) {
    ui.toast(`保存失败：${err instanceof Error ? err.message : String(err)}`, 'error')
  }
}
</script>

<template>
  <div class="settings-overlay" @click.self="emit('close')">
    <div class="settings-panel">
      <header class="settings-header">
        <h3>接口设置</h3>
        <button class="close-btn" @click="emit('close')">×</button>
      </header>
      <div class="settings-body">
        <label class="field">
          <span class="field-label">Base URL</span>
          <input v-model="form.baseUrl" type="text" placeholder="https://api.openai.com/v1" spellcheck="false" />
          <span class="field-hint">只需填到 /v1 层级，接口地址自动拼接 /chat/completions</span>
        </label>

        <label class="field">
          <span class="field-label">API Key</span>
          <input v-model="form.apiKey" type="password" placeholder="sk-..." spellcheck="false" autocomplete="off" />
          <span class="field-hint">留空则以无鉴权方式请求（适用于本地服务）</span>
        </label>

        <label class="field">
          <span class="field-label">Model</span>
          <input v-model="form.model" type="text" placeholder="gpt-4o-mini" spellcheck="false" />
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field-label">Temperature: {{ form.temperature }}</span>
            <input v-model.number="form.temperature" type="range" min="0" max="2" step="0.1" />
          </label>
          <label class="field">
            <span class="field-label">Max Tokens</span>
            <input v-model.number="form.maxTokens" type="number" min="1" step="1" />
          </label>
        </div>

        <div class="field-row">
          <label class="field">
            <span class="field-label">上下文条数</span>
            <input v-model.number="form.contextSize" type="number" min="1" step="1" />
            <span class="field-hint">每次请求携带的最近消息条数</span>
          </label>
          <label class="field field--check">
            <input v-model="form.stream" type="checkbox" />
            <span>流式输出</span>
          </label>
        </div>
      </div>
      <footer class="settings-footer">
        <button class="btn-secondary" @click="emit('close')">取消</button>
        <button class="btn-primary" @click="save">保存</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.settings-panel {
  width: 460px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bg);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border);
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 20px;
  color: var(--text-secondary);
}

.close-btn:hover {
  color: var(--danger);
}

.settings-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.field-row {
  display: flex;
  gap: 14px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.field input[type='text'],
.field input[type='password'],
.field input[type='number'] {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  outline: none;
}

.field input:focus {
  border-color: var(--accent);
}

.field-hint {
  font-size: 12px;
  color: var(--text-placeholder);
}

.field--check {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}

.btn-primary {
  padding: 8px 18px;
  border: none;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-sidebar);
}
</style>

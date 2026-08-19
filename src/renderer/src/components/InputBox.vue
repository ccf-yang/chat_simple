<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'

const props = defineProps<{ disabled: boolean }>()

const store = useChatStore()
const text = ref('')

async function submit(): Promise<void> {
  const content = text.value.trim()
  if (!content || props.disabled) return
  text.value = ''
  await store.sendMessage(content)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void submit()
  }
}
</script>

<template>
  <div class="input-box">
    <textarea
      v-model="text"
      :disabled="disabled"
      rows="3"
      placeholder="输入问题，Enter 发送，Shift+Enter 换行"
      @keydown="onKeydown"
    />
    <button class="send-btn" :disabled="disabled || !text.trim()" @click="submit">
      {{ disabled ? '生成中' : '发送' }}
    </button>
  </div>
</template>

<style scoped>
.input-box {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.input-box textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  line-height: 1.6;
  outline: none;
  max-height: 180px;
}

.input-box textarea:focus {
  border-color: var(--accent);
}

.input-box textarea:disabled {
  background: var(--bg-sidebar);
  color: var(--text-placeholder);
}

.send-btn {
  flex-shrink: 0;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius);
  background: var(--accent);
  color: #fff;
  font-size: 14px;
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}
</style>

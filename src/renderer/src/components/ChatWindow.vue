<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import MessageItem from './MessageItem.vue'
import InputBox from './InputBox.vue'

const store = useChatStore()
const listEl = ref<HTMLElement | null>(null)

function scrollToBottom(): void {
  if (listEl.value) {
    listEl.value.scrollTo({ top: listEl.value.scrollHeight, behavior: 'smooth' })
  }
}

watch(
  () => store.currentMessages().length,
  async () => {
    await nextTick()
    scrollToBottom()
  }
)

watch(
  () => {
    const msgs = store.currentMessages()
    const last = msgs[msgs.length - 1]
    return last && last.role === 'assistant' ? last.content.length : 0
  },
  async () => {
    await nextTick()
    scrollToBottom()
  }
)
</script>

<template>
  <div class="chat-window">
    <header class="chat-header">
      <div class="chat-title" :title="store.currentSummary()?.title">
        {{ store.currentSummary()?.title ?? '新会话' }}
      </div>
      <div v-if="store.sending" class="chat-status">
        {{ store.status === 'connecting' ? '连接中...' : '生成中...' }}
      </div>
    </header>
    <div ref="listEl" class="chat-list">
      <div v-if="!store.currentMessages().length" class="chat-empty">
        <p class="chat-empty-title">开始新的对话</p>
        <p class="chat-empty-sub">支持自定义 OpenAI 兼容接口，点击右上角设置进行配置</p>
      </div>
      <MessageItem v-for="m in store.currentMessages()" :key="m.id" :message="m" />
    </div>
    <InputBox :disabled="store.sending" />
  </div>
</template>

<style scoped>
.chat-window {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}

.chat-title {
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chat-status {
  font-size: 12px;
  color: var(--accent);
}

.chat-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  background: #fafafa;
}

.chat-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.chat-empty-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
}

.chat-empty-sub {
  font-size: 13px;
  color: var(--text-placeholder);
  margin: 0;
}
</style>

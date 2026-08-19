<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { ChatMessage } from '@shared/types'
import { ROLE_LABELS } from '@shared/chat'

const props = defineProps<{ message: ChatMessage }>()

const isUser = computed(() => props.message.role === 'user')
const isError = computed(() => Boolean(props.message.error))
const isEmpty = computed(() => props.message.content.trim() === '')

const rendered = computed(() => {
  const raw = marked.parse(props.message.content, { async: false }) as string
  return DOMPurify.sanitize(raw)
})

async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.message.content)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = props.message.content
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
}
</script>

<template>
  <div class="message" :class="{ 'message--user': isUser, 'message--error': isError }">
    <div class="message-role">{{ ROLE_LABELS[message.role] }}</div>
    <div class="message-bubble">
      <div v-if="isEmpty && !isError" class="message-thinking">思考中...</div>
      <div v-else class="message-content" v-html="rendered"></div>
      <div class="message-meta">
        <span v-if="message.model" class="message-model">{{ message.model }}</span>
        <button class="copy-btn" title="复制答案" @click="copy">复制</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.message--user {
  flex-direction: row-reverse;
}

.message-role {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  background: var(--accent);
}

.message--user .message-role {
  background: #3b82f6;
}

.message-bubble {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: var(--radius);
  background: var(--assistant-bubble);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}

.message--user .message-bubble {
  background: var(--user-bubble);
  border-color: transparent;
}

.message--error .message-bubble {
  background: #fff3f3;
  border-color: #ffc9c9;
}

.message-thinking {
  color: var(--text-placeholder);
  font-style: italic;
}

.message-content {
  word-break: break-word;
  line-height: 1.7;
}

.message-content :deep(pre) {
  background: #f6f8fa;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  font-size: 13px;
}

.message-content :deep(code) {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.message-content :deep(p) {
  margin: 0.5em 0;
}

.message-content :deep(p:first-child) {
  margin-top: 0;
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.message-content :deep(a) {
  color: var(--accent);
}

.message-content :deep(ul),
.message-content :deep(ol) {
  padding-left: 1.4em;
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
  min-height: 20px;
}

.message-model {
  font-size: 11px;
  color: var(--text-placeholder);
}

.copy-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  visibility: hidden;
}

.message:hover .copy-btn {
  visibility: visible;
}

.copy-btn:hover {
  background: var(--border);
  color: var(--text-primary);
}
</style>

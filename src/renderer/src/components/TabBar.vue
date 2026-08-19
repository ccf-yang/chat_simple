<script setup lang="ts">
import { useChatStore } from '@/stores/chat'

const store = useChatStore()

async function onNew(): Promise<void> {
  await store.create()
}

async function onRemove(id: string): Promise<void> {
  if (window.confirm('确定删除该会话吗？删除后不可恢复。')) {
    await store.remove(id)
  }
}
</script>

<template>
  <div class="tab-bar">
    <div class="tab-list">
      <div
        v-for="s in store.summaries"
        :key="s.id"
        class="tab"
        :class="{ active: s.id === store.currentId }"
        @click="store.select(s.id)"
      >
        <span class="tab-title" :title="s.title">{{ s.title }}</span>
        <button class="tab-remove" title="删除会话" @click.stop="onRemove(s.id)">×</button>
      </div>
      <div v-if="!store.summaries.length" class="tab-empty">暂无会话</div>
    </div>
    <button class="tab-new" @click="onNew">＋ 新建会话</button>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 10px;
}

.tab-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius);
  color: var(--text-primary);
  cursor: pointer;
  border: 1px solid transparent;
}

.tab:hover {
  background: #ececec;
}

.tab.active {
  background: var(--bg);
  border-color: var(--accent);
  color: var(--accent);
}

.tab-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tab-remove {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  font-size: 16px;
  line-height: 1;
  visibility: hidden;
}

.tab:hover .tab-remove {
  visibility: visible;
}

.tab-remove:hover {
  background: #ffd9d9;
  color: var(--danger);
}

.tab-empty {
  color: var(--text-placeholder);
  text-align: center;
  padding: 16px 0;
}

.tab-new {
  margin-top: 10px;
  padding: 8px 12px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-secondary);
}

.tab-new:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--bg);
}
</style>

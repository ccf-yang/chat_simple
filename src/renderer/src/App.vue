<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import TabBar from '@/components/TabBar.vue'
import ChatWindow from '@/components/ChatWindow.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

const chat = useChatStore()
const settings = useSettingsStore()
const ui = useUiStore()
const settingsOpen = ref(false)

onMounted(async () => {
  await Promise.all([settings.load(), chat.init()])
})
</script>

<template>
  <div class="app">
    <div class="sidebar">
      <TabBar />
      <div class="sidebar-footer">
        <button class="settings-btn" @click="settingsOpen = true">设置</button>
      </div>
    </div>
    <main class="main">
      <ChatWindow />
    </main>
    <SettingsPanel v-if="settingsOpen" @close="settingsOpen = false" />
    <div class="toast-container">
      <div
        v-for="t in ui.toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
      >
        {{ t.text }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100%;
}

.sidebar {
  display: flex;
  flex-direction: column;
  width: 240px;
  min-width: 240px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
}

.settings-btn {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text-primary);
  text-align: left;
}

.settings-btn:hover {
  background: var(--bg-sidebar);
  border-color: var(--accent);
}
</style>

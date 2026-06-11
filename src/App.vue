<template>
  <div class="app">
    <!-- 顶部工具栏 -->
    <MainToolbar />

    <!-- 主内容区 -->
    <div class="app__main">
      <!-- 左侧：字段列表 -->
      <div class="app__sidebar">
        <FieldTree />
      </div>

      <!-- 中央：字节位视图 -->
      <div class="app__center">
        <ByteGrid />
      </div>
    </div>

    <!-- 底部：属性面板 -->
    <div class="app__bottom" v-if="hasSelectedField">
      <FieldEditor />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import MainToolbar from './components/Toolbar/MainToolbar.vue'
import FieldTree from './components/FieldList/FieldTree.vue'
import ByteGrid from './components/ByteView/ByteGrid.vue'
import FieldEditor from './components/PropertyPanel/FieldEditor.vue'
import { useSelectionStore } from './stores/selection'
import { useByteViewStore } from './stores/byteView'
import { useProtocolStore } from './stores/protocol'

const selectionStore = useSelectionStore()
const byteViewStore = useByteViewStore()
const protocolStore = useProtocolStore()

const hasSelectedField = computed(() => selectionStore.selectedFieldId !== null)

onMounted(() => {
  // 初始化默认数据：64字节的示例数据
  const sampleData = new Uint8Array(64)
  // 写入一些示例魔数
  sampleData[0] = 0xAA
  sampleData[1] = 0x55
  sampleData[2] = 0x03  // command
  sampleData[3] = 0x00
  sampleData[4] = 0x10  // length = 16
  for (let i = 5; i < 21; i++) {
    sampleData[i] = i & 0xFF
  }
  byteViewStore.setData(sampleData)

  // 全局快捷键
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

function onKeydown(e: KeyboardEvent) {
  // Ctrl+Z 撤销
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
    e.preventDefault()
    protocolStore.undo()
  }
  // Ctrl+Y 或 Ctrl+Shift+Z 重做
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
    e.preventDefault()
    protocolStore.redo()
  }
  // Delete 删除选中字段
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectionStore.selectedFieldId) {
      // 不在输入框中时才响应
      const tag = (e.target as HTMLElement)?.tagName
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault()
        protocolStore.removeField(selectionStore.selectedFieldId)
        selectionStore.selectField(null)
      }
    }
  }
}
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

body {
  background: #1e1e1e;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1e1e1e;
}

::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #666;
}
</style>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app__main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app__sidebar {
  width: 260px;
  min-width: 200px;
  border-right: 1px solid #333;
  overflow-y: auto;
  background: #252525;
}

.app__center {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.app__bottom {
  border-top: 1px solid #444;
  max-height: 200px;
  overflow-y: auto;
}
</style>

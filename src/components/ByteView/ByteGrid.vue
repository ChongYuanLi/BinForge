<template>
  <div class="byte-grid" @mouseup.left="onMouseUp">
    <!-- 表头 -->
    <div class="byte-grid__header">
      <div class="byte-grid__header-offset">Offset</div>
      <div class="byte-grid__header-hex">Hex</div>
      <div class="byte-grid__header-bits">
        <span v-for="bit in 8" :key="bit" class="bit-header">b{{ 8 - bit }}</span>
      </div>
      <div class="byte-grid__header-fields">Fields</div>
    </div>

    <!-- 字节行 -->
    <div class="byte-grid__body" ref="gridBody">
      <ByteRow
        v-for="offset in byteCount"
        :key="offset - 1"
        :byteOffset="offset - 1"
        @contextmenu="onRowContextMenu"
      />
    </div>

    <!-- 右键菜单 -->
    <ContextMenu ref="contextMenuRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import ByteRow from './ByteRow.vue'
import ContextMenu from './ContextMenu.vue'
import { useByteViewStore } from '../../stores/byteView'
import { useSelectionStore } from '../../stores/selection'

const byteViewStore = useByteViewStore()
const selectionStore = useSelectionStore()
const contextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)

/** 显示的字节数 */
const byteCount = computed(() => {
  return byteViewStore.data.length
})

/** 鼠标松开时结束拖选 */
function onMouseUp() {
  selectionStore.endDrag()
}

/** 右键菜单 */
function onRowContextMenu(byteOffset: number, bitIndex: number, x: number, y: number) {
  contextMenuRef.value?.show(byteOffset, bitIndex, x, y)
}

/** 全局mouseup确保拖选结束（仅左键） */
function onGlobalMouseUp(e: MouseEvent) {
  if (e.button === 0) {
    selectionStore.endDrag()
  }
}

onMounted(() => {
  document.addEventListener('mouseup', onGlobalMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', onGlobalMouseUp)
})
</script>

<style scoped>
.byte-grid {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  overflow: auto;
  max-height: 100%;
}

.byte-grid__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid #444;
  position: sticky;
  top: 0;
  background: #1e1e1e;
  z-index: 10;
  font-size: 11px;
  color: #888;
}

.byte-grid__header-offset {
  min-width: 64px;
  text-align: right;
  padding-right: 8px;
}

.byte-grid__header-hex {
  min-width: 28px;
  text-align: center;
}

.byte-grid__header-bits {
  display: flex;
  gap: 0;
}

.bit-header {
  display: inline-block;
  width: 36px;
  text-align: center;
  font-size: 10px;
  color: #666;
}

.byte-grid__header-fields {
  margin-left: 8px;
  flex: 1;
}

.byte-grid__body {
  padding: 4px 0;
}
</style>

<template>
  <div
    class="bit-cell"
    :class="{
      'bit-cell--selected': isSelected,
      'bit-cell--dragging': isDragSelected,
      'bit-cell--has-field': topOverlay !== null,
      'bit-cell--empty': topOverlay === null,
    }"
    :style="cellStyle"
    @mousedown="onMouseDown"
    @mouseenter="onMouseEnter"
    @contextmenu.prevent="onContextMenu"
    @click="onClick"
  >
    <span class="bit-cell__label" v-if="topOverlay">{{ getLabel(topOverlay) }}</span>
    <span class="bit-cell__empty" v-else>·</span>
    <span class="bit-cell__index">{{ bitLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSelectionStore } from '../../stores/selection'
import { useByteViewStore } from '../../stores/byteView'
import type { FieldOverlay } from '../../models/field'

const props = defineProps<{
  byteOffset: number
  bitIndex: number  // 0-7, 0=MSB, 7=LSB
}>()

const emit = defineEmits<{
  (e: 'contextmenu', byteOffset: number, bitIndex: number, x: number, y: number): void
}>()

const selectionStore = useSelectionStore()
const byteViewStore = useByteViewStore()

/** 此bit位置的字段覆盖 */
const fieldOverlays = computed(() => {
  return byteViewStore.getOverlaysAtBit(props.byteOffset, props.bitIndex)
})

/** 最上层（最深）的 overlay */
const topOverlay = computed(() => {
  if (fieldOverlays.value.length === 0) return null
  return fieldOverlays.value.reduce((a, b) => b.depth > a.depth ? b : a)
})

/** bit 位置标签 b7~b0 */
const bitLabel = computed(() => {
  return `b${7 - props.bitIndex}`
})

/** 是否被选中（字段选中） */
const isSelected = computed(() => {
  if (!selectionStore.selectedFieldId) return false
  return fieldOverlays.value.some(o => o.fieldId === selectionStore.selectedFieldId)
})

/** 是否在拖选范围内 */
const isDragSelected = computed(() => {
  if (!selectionStore.selectionBitRange) return false
  const globalBit = props.byteOffset * 8 + props.bitIndex
  return globalBit >= selectionStore.selectionBitRange[0] &&
         globalBit <= selectionStore.selectionBitRange[1]
})

/** 单元格样式 */
const cellStyle = computed(() => {
  if (topOverlay.value) {
    return { backgroundColor: topOverlay.value.color }
  }
  return {}
})

/** 获取显示标签：字段名前2~3个字符 */
function getLabel(overlay: FieldOverlay): string {
  const name = overlay.fieldName
  if (!name) return overlay.isBitField ? 'b' : '?'
  // 取字段名的前3个字符
  return name.length <= 3 ? name : name.slice(0, 3)
}

function onMouseDown(e: MouseEvent) {
  if (e.button === 0) {
    selectionStore.startDrag(props.byteOffset, props.bitIndex)
  }
}

function onMouseEnter() {
  if (selectionStore.isDragging) {
    selectionStore.updateDrag(props.byteOffset, props.bitIndex)
  }
}

function onContextMenu(e: MouseEvent) {
  emit('contextmenu', props.byteOffset, props.bitIndex, e.clientX, e.clientY)
}

function onClick(_e: MouseEvent) {
  if (topOverlay.value) {
    selectionStore.selectField(topOverlay.value.fieldId)
  }
}
</script>

<style scoped>
.bit-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 36px;
  border: 1px solid #3a3a3a;
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background-color 0.1s;
}

.bit-cell:hover {
  border-color: #888;
  z-index: 1;
}

.bit-cell--selected {
  border-color: #fff;
  border-width: 2px;
  z-index: 2;
}

.bit-cell--dragging {
  background-color: rgba(255, 255, 255, 0.15) !important;
  border-color: #4285f4;
}

.bit-cell--has-field {
  border-color: rgba(255, 255, 255, 0.15);
}

.bit-cell__label {
  font-size: 10px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: 600;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  padding: 0 2px;
}

.bit-cell__empty {
  font-size: 14px;
  color: #444;
}

.bit-cell__index {
  font-size: 8px;
  color: #666;
  position: absolute;
  bottom: 1px;
  right: 2px;
}
</style>

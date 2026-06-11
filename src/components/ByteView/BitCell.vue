<template>
  <div
    class="bit-cell"
    :class="{
      'bit-cell--selected': isSelected,
      'bit-cell--dragging': isDragSelected,
      'bit-cell--field-0': fieldColors.length === 1,
      'bit-cell--multi-field': fieldColors.length > 1,
    }"
    :style="cellStyle"
    @mousedown="onMouseDown"
    @mouseenter="onMouseEnter"
    @contextmenu.prevent="onContextMenu"
    @click="onClick"
  >
    <span class="bit-cell__value">{{ bitValue }}</span>
    <span class="bit-cell__index">{{ bitIndex }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSelectionStore } from '../../stores/selection'
import { useByteViewStore } from '../../stores/byteView'
const props = defineProps<{
  byteOffset: number
  bitIndex: number  // 0-7, 0=MSB, 7=LSB
}>()

const emit = defineEmits<{
  (e: 'contextmenu', byteOffset: number, bitIndex: number, x: number, y: number): void
}>()

const selectionStore = useSelectionStore()
const byteViewStore = useByteViewStore()

/** 当前bit的值 (0 或 1) */
const bitValue = computed(() => {
  const byte = byteViewStore.data[props.byteOffset]
  if (byte === undefined) return 0
  return (byte >> (7 - props.bitIndex)) & 1
})

/** 此bit位置的字段覆盖 */
const fieldOverlays = computed(() => {
  return byteViewStore.getOverlaysAtBit(props.byteOffset, props.bitIndex)
})

/** 字段颜色 */
const fieldColors = computed(() => {
  return fieldOverlays.value.map(o => o.color)
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
  if (fieldColors.value.length === 1) {
    return { backgroundColor: fieldColors.value[0] }
  }
  if (fieldColors.value.length > 1) {
    // 多个字段覆盖时，用最深层（最内层）的颜色
    const deepest = fieldOverlays.value.reduce((a, b) =>
      b.depth > a.depth ? b : a
    )
    return { backgroundColor: deepest.color }
  }
  return {}
})

function onMouseDown(e: MouseEvent) {
  if (e.button === 0) { // 左键
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
  // 点击时选中该位置所在的字段
  const overlay = fieldOverlays.value.length > 0
    ? fieldOverlays.value.reduce((a, b) => b.depth > a.depth ? b : a)
    : null
  if (overlay) {
    selectionStore.selectField(overlay.fieldId)
  }
}
</script>

<style scoped>
.bit-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 36px;
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

.bit-cell__value {
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-weight: bold;
  color: #e0e0e0;
}

.bit-cell__index {
  font-size: 9px;
  color: #888;
  position: absolute;
  bottom: 1px;
  right: 2px;
}
</style>

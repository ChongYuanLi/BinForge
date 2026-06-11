/**
 * 选择状态管理
 * 管理字节视图中的选中状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  /** 当前选中的字段ID */
  const selectedFieldId = ref<string | null>(null)

  /** 拖选的字节范围 [startByte, endByte] (inclusive) */
  const selectionByteRange = ref<[number, number] | null>(null)

  /** 拖选的位范围 [startBit, endBit] (inclusive, 全局bit偏移) */
  const selectionBitRange = ref<[number, number] | null>(null)

  /** 是否正在拖选 */
  const isDragging = ref(false)

  /** 拖选起始位置 */
  const dragStart = ref<{ byte: number; bit: number } | null>(null)

  /** 拖选当前位置 */
  const dragCurrent = ref<{ byte: number; bit: number } | null>(null)

  /** 高亮的字段ID列表（鼠标悬停时） */
  const hoveredFieldId = ref<string | null>(null)

  /** 选中字段 */
  function selectField(fieldId: string | null): void {
    selectedFieldId.value = fieldId
  }

  /** 开始拖选 */
  function startDrag(byteOffset: number, bitIndex: number): void {
    isDragging.value = true
    dragStart.value = { byte: byteOffset, bit: bitIndex }
    dragCurrent.value = { byte: byteOffset, bit: bitIndex }
    updateSelectionFromDrag()
  }

  /** 更新拖选 */
  function updateDrag(byteOffset: number, bitIndex: number): void {
    if (!isDragging.value) return
    dragCurrent.value = { byte: byteOffset, bit: bitIndex }
    updateSelectionFromDrag()
  }

  /** 结束拖选 */
  function endDrag(): void {
    isDragging.value = false
  }

  /** 从拖选位置计算选区 */
  function updateSelectionFromDrag(): void {
    if (!dragStart.value || !dragCurrent.value) return

    const startBit = dragStart.value.byte * 8 + dragStart.value.bit
    const endBit = dragCurrent.value.byte * 8 + dragCurrent.value.bit

    const minBit = Math.min(startBit, endBit)
    const maxBit = Math.max(startBit, endBit)

    selectionBitRange.value = [minBit, maxBit]
    selectionByteRange.value = [
      Math.floor(minBit / 8),
      Math.floor(maxBit / 8),
    ]
  }

  /** 清除选区 */
  function clearSelection(): void {
    selectionByteRange.value = null
    selectionBitRange.value = null
    dragStart.value = null
    dragCurrent.value = null
    isDragging.value = false
  }

  /** 悬停字段 */
  function hoverField(fieldId: string | null): void {
    hoveredFieldId.value = fieldId
  }

  /** 选区的位数 */
  const selectionBitCount = computed(() => {
    if (!selectionBitRange.value) return 0
    return selectionBitRange.value[1] - selectionBitRange.value[0] + 1
  })

  /** 选区的字节数 */
  const selectionByteCount = computed(() => {
    if (!selectionByteRange.value) return 0
    return selectionByteRange.value[1] - selectionByteRange.value[0] + 1
  })

  return {
    selectedFieldId,
    selectionByteRange,
    selectionBitRange,
    isDragging,
    dragStart,
    dragCurrent,
    hoveredFieldId,
    selectionBitCount,
    selectionByteCount,
    selectField,
    startDrag,
    updateDrag,
    endDrag,
    clearSelection,
    hoverField,
  }
})

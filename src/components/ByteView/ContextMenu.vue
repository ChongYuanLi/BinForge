<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @click.stop
    >
      <div class="context-menu__item" @click="onCreateField">
        <span class="context-menu__icon">+</span>
        新建字段
      </div>

      <div class="context-menu__divider"></div>
      <div class="context-menu__group">无符号</div>
      <div class="context-menu__item" @click="onQuickType('u1')">u1</div>
      <div class="context-menu__item" @click="onQuickType('u2')">u2</div>
      <div class="context-menu__item" @click="onQuickType('u4')">u4</div>
      <div class="context-menu__item" @click="onQuickType('u8')">u8</div>

      <div class="context-menu__divider"></div>
      <div class="context-menu__group">有符号</div>
      <div class="context-menu__item" @click="onQuickType('s1')">s1</div>
      <div class="context-menu__item" @click="onQuickType('s2')">s2</div>
      <div class="context-menu__item" @click="onQuickType('s4')">s4</div>
      <div class="context-menu__item" @click="onQuickType('s8')">s8</div>

      <div class="context-menu__divider"></div>
      <div class="context-menu__group">浮点</div>
      <div class="context-menu__item" @click="onQuickType('f4')">f4</div>
      <div class="context-menu__item" @click="onQuickType('f8')">f8</div>

      <div class="context-menu__divider"></div>
      <div class="context-menu__group">位字段</div>
      <div class="context-menu__item" @click="onQuickType('b1')">b1</div>
      <div class="context-menu__item" @click="onQuickType('b2')">b2</div>
      <div class="context-menu__item" @click="onQuickType('b4')">b4</div>
      <div class="context-menu__item" @click="onQuickType('b8')">b8</div>

      <div class="context-menu__divider"></div>
      <div class="context-menu__group">字符串/字节</div>
      <div class="context-menu__item" @click="onQuickType('str')">str</div>
      <div class="context-menu__item" @click="onQuickType('strz')">strz</div>
      <div class="context-menu__item" @click="onQuickType('bytes')">bytes</div>
      <template v-if="selectedFieldId || hasSelection">
        <div class="context-menu__divider"></div>
        <div class="context-menu__item context-menu__item--danger" @click="onDeleteField">
          <span class="context-menu__icon">✕</span>
          删除{{ hasSelection ? '选区内' : '' }}字段
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSelectionStore } from '../../stores/selection'
import { useProtocolStore } from '../../stores/protocol'
import { useByteViewStore } from '../../stores/byteView'
import type { FieldType, ProtocolField } from '../../models/field'
import { createEmptyField, isBitType, FIELD_TYPE_BYTES, FIELD_TYPE_BITS } from '../../models/field'

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const contextByteOffset = ref(0)
const contextBitIndex = ref(0)

const selectionStore = useSelectionStore()
const protocolStore = useProtocolStore()
const byteViewStore = useByteViewStore()

const selectedFieldId = ref<string | null>(null)
const hasSelection = ref(false)

function show(byteOffset: number, bitIndex: number, clientX: number, clientY: number) {
  contextByteOffset.value = byteOffset
  contextBitIndex.value = bitIndex
  x.value = clientX
  y.value = clientY
  visible.value = true
  selectedFieldId.value = selectionStore.selectedFieldId
  hasSelection.value = selectionStore.selectionBitRange !== null
}

function hide() {
  visible.value = false
}

/** 创建字段（使用当前选区） */
function onCreateField() {
  const range = selectionStore.selectionBitRange
  if (!range) {
    // 没有选区时，以当前点击位置创建1字节字段
    const field = createEmptyField(contextByteOffset.value)
    field.name = `field_${contextByteOffset.value}`
    protocolStore.addField(field)
  } else {
    const totalBits = range[1] - range[0] + 1
    const startByte = Math.floor(range[0] / 8)
    const startBitInByte = range[0] % 8
    const endByte = Math.floor(range[1] / 8)
    const endBitInByte = range[1] % 8

    // 判断是否选中了完整的字节 (从bit0的MSB到bit7的LSB)
    const isFullBytes = startBitInByte === 0 && endBitInByte === 7 && totalBits % 8 === 0

    if (isFullBytes) {
      // 完整字节选区 → 创建字节级字段
      const totalBytes = totalBits / 8
      let type: FieldType = 'u1'
      if (totalBytes === 1) type = 'u1'
      else if (totalBytes === 2) type = 'u2'
      else if (totalBytes === 4) type = 'u4'
      else if (totalBytes === 8) type = 'u8'
      else type = 'bytes'

      const field = createEmptyField(startByte)
      field.type = type
      field.size = totalBytes
      field.name = `field_${type}_${startByte}`
      if (type === 'bytes') {
        field.sizeExpr = `${totalBytes}`
      }
      protocolStore.addField(field)
    } else {
      // 非完整字节 → 创建 bit 字段 (可能跨字节)
      // createEmptyField 内部会根据全局 bit 范围计算 bN 类型
      const field = createEmptyField(startByte, startBitInByte, endByte, endBitInByte)
      field.name = `field_b${totalBits}_${startByte}`
      protocolStore.addField(field)
    }
  }
  hide()
}

/** 快速设置类型 */
function onQuickType(type: FieldType) {
  const byteOffset = contextByteOffset.value
  const bitIndex = contextBitIndex.value

  if (isBitType(type)) {
    const bitCount = FIELD_TYPE_BITS[type]
    const globalStart = byteOffset * 8 + bitIndex
    const globalEnd = globalStart + bitCount - 1
    const endByte = Math.floor(globalEnd / 8)
    const endBitInByte = globalEnd % 8
    const field = createEmptyField(byteOffset, bitIndex, endByte, endBitInByte)
    field.name = `field_b${bitCount}_${byteOffset}`
    protocolStore.addField(field)
  } else {
    const field = createEmptyField(byteOffset)
    field.type = type
    // str/strz/bytes 默认大小：用选区字节数，否则1
    const sel = selectionStore.selectionByteRange
    const defaultSize = sel ? (sel[1] - sel[0] + 1) : 1
    field.size = FIELD_TYPE_BYTES[type] || defaultSize
    field.name = `field_${type}_${byteOffset}`
    protocolStore.addField(field)
  }
  hide()
}

/** 删除字段 — 删除选区内所有字段，或当前选中的单个字段 */
function onDeleteField() {
  const range = selectionStore.selectionBitRange
  if (range) {
    // 有拖选范围 → 删除所有与选区重叠的字段
    const selStart = range[0]
    const selEnd = range[1]
    const fieldsToDelete: string[] = []

    for (const field of protocolStore.protocol.fields) {
      const fieldRange = getFieldGlobalBitRange(field)
      if (!fieldRange) continue
      // 判断是否重叠
      if (fieldRange[0] <= selEnd && fieldRange[1] >= selStart) {
        fieldsToDelete.push(field.id)
      }
    }

    for (const id of fieldsToDelete) {
      protocolStore.removeField(id)
    }
    selectionStore.clearSelection()
    selectionStore.selectField(null)
  } else if (selectedFieldId.value) {
    // 无拖选范围 → 删除当前选中的字段
    protocolStore.removeField(selectedFieldId.value)
    selectionStore.selectField(null)
  }
  hide()
}

/** 获取字段的全局 bit 范围 [start, end] */
function getFieldGlobalBitRange(field: ProtocolField): [number, number] | null {
  if (field.bitRange) {
    return field.bitRange
  }
  const overlays = byteViewStore.fieldOverlays.filter(o => o.fieldId === field.id)
  if (overlays.length === 0) return null
  const minByte = Math.min(...overlays.map(o => o.byteStart))
  const maxByte = Math.max(...overlays.map(o => o.byteEnd))
  const minBit = overlays[0].bitStart ?? 0
  const maxBit = overlays[overlays.length - 1].bitEnd ?? 7
  return [minByte * 8 + minBit, maxByte * 8 + maxBit]
}

// 点击外部关闭菜单
function onDocumentClick() {
  hide()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

defineExpose({ show, hide })
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: #2d2d2d;
  border: 1px solid #555;
  border-radius: 6px;
  padding: 4px 0;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 10000;
}

.context-menu__item {
  padding: 6px 14px;
  font-size: 13px;
  color: #e0e0e0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.context-menu__item:hover {
  background-color: #404040;
}

.context-menu__item--danger {
  color: #ef5350;
}

.context-menu__item--danger:hover {
  background-color: rgba(239, 83, 80, 0.15);
}

.context-menu__icon {
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.context-menu__divider {
  height: 1px;
  background: #444;
  margin: 4px 0;
}

.context-menu__group {
  padding: 4px 14px 2px;
  font-size: 10px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>

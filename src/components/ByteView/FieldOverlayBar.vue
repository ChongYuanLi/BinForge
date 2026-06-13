<template>
  <div class="field-overlay-bar" v-if="overlays.length > 0">
    <div
      v-for="overlay in overlays"
      :key="overlay.fieldId"
      class="field-tag"
      :style="{ backgroundColor: overlay.color, borderColor: getBorderColor(overlay.color) }"
      @click="selectField(overlay.fieldId)"
      @mouseenter="hoverField(overlay.fieldId)"
      @mouseleave="hoverField(null)"
    >
      <span class="field-tag__name">{{ overlay.fieldName }}</span>
      <span class="field-tag__value" v-if="getFieldValue(overlay) !== null">
        = {{ getFieldValue(overlay) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSelectionStore } from '../../stores/selection'
import { useProtocolStore } from '../../stores/protocol'
import { useByteViewStore } from '../../stores/byteView'
import { isBitType } from '../../models/field'
import type { FieldOverlay, ProtocolField } from '../../models/field'

defineProps<{
  overlays: FieldOverlay[]
}>()

const selectionStore = useSelectionStore()
const protocolStore = useProtocolStore()
const byteViewStore = useByteViewStore()

function selectField(fieldId: string) {
  selectionStore.selectField(fieldId)
}

function hoverField(fieldId: string | null) {
  selectionStore.hoverField(fieldId)
}

/** 根据 overlay 查找字段定义（递归搜索子字段） */
function findField(fieldId: string): ProtocolField | undefined {
  function search(fields: ProtocolField[]): ProtocolField | undefined {
    for (const f of fields) {
      if (f.id === fieldId) return f
      if (f.children) {
        const found = search(f.children)
        if (found) return found
      }
    }
    return undefined
  }
  return search(protocolStore.protocol.fields)
}

/** 获取字段的解析值（仅在字段第一字节显示） */
function getFieldValue(overlay: FieldOverlay): string | null {
  const field = findField(overlay.fieldId)
  if (!field) return null

  // bit字段显示 bit 值
  if (isBitType(field.type)) {
    if (overlay.bitStart === undefined || overlay.bitEnd === undefined) return null
    const byte = byteViewStore.data[overlay.byteStart]
    if (byte === undefined) return null
    const bitCount = overlay.bitEnd - overlay.bitStart + 1
    const mask = (1 << bitCount) - 1
    const shift = 7 - overlay.bitEnd
    const val = (byte >> shift) & mask
    return `0x${val.toString(16).toUpperCase()}`
  }

  // 多字节字段只在第一字节显示数值
  const size = field.size
  if (size <= 0) return null

  // 找到该字段的所有 overlay，取最小 byteStart 作为起始字节
  const allOverlays = byteViewStore.fieldOverlays.filter(o => o.fieldId === overlay.fieldId)
  const firstByte = Math.min(...allOverlays.map(o => o.byteStart))
  if (overlay.byteStart !== firstByte) return null

  const endian = protocolStore.protocol.endian

  if (field.type.startsWith('f')) {
    const val = byteViewStore.readFieldFloatValue(firstByte, size, endian)
    return val.toFixed(2)
  }

  if (field.type.startsWith('s')) {
    const val = byteViewStore.readFieldSignedValue(firstByte, size, endian)
    return `0x${(val >>> 0).toString(16).toUpperCase()} (${val})`
  }

  const val = byteViewStore.readFieldValue(firstByte, size, endian)
  return `0x${val.toString(16).toUpperCase()}`
}

/** 从rgba背景色提取更深的边框色 */
function getBorderColor(bgColor: string): string {
  const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return '#666'
  const r = Math.max(0, parseInt(match[1]) - 40)
  const g = Math.max(0, parseInt(match[2]) - 40)
  const b = Math.max(0, parseInt(match[3]) - 40)
  return `rgb(${r}, ${g}, ${b})`
}
</script>

<style scoped>
.field-overlay-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: 8px;
  align-items: center;
}

.field-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid;
  color: #e0e0e0;
  display: flex;
  gap: 4px;
}

.field-tag:hover {
  filter: brightness(1.3);
}

.field-tag__value {
  color: #aaa;
  font-family: 'Consolas', monospace;
}
</style>

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
import { useProtocolStore } from '../../stores/protocol'
import { isBitType, getFieldBits, getFieldBytes } from '../../models/field'
import { getFieldColor } from '../../services/colorPalette'
import type { FieldOverlay, ProtocolField } from '../../models/field'

const props = defineProps<{
  byteOffset: number
  bitIndex: number
}>()

const emit = defineEmits<{
  (e: 'contextmenu', byteOffset: number, bitIndex: number, x: number, y: number): void
}>()

const selectionStore = useSelectionStore()
const protocolStore = useProtocolStore()

/**
 * 直接从 protocolStore.protocol.fields 计算此 bit 位置的 overlay。
 * 不使用 byteViewStore 的 computed，避免跨 store 缓存问题。
 */
const fieldOverlays = computed(() => {
  // 读取 reactive 依赖
  const fields = protocolStore.protocol.fields
  const allOverlays: FieldOverlay[] = []
  let off = 0
  let bitOff = 0

  function collect(list: ProtocolField[], depth: number) {
    for (const field of list) {
      const color = getFieldColor(field.id)
      if (isBitType(field.type)) {
        const bitCount = getFieldBits(field.type)
        if (field.bitRange) {
          const [gs, ge] = field.bitRange
          const sb = Math.floor(gs / 8), eb = Math.floor(ge / 8)
          for (let b = sb; b <= eb; b++) {
            allOverlays.push({
              fieldId: field.id, fieldName: field.name || field.type, color: color.bg,
              byteStart: b, byteEnd: b,
              bitStart: b === sb ? gs % 8 : 0,
              bitEnd: b === eb ? ge % 8 : 7,
              depth, isBitField: true,
            })
          }
          off = eb; bitOff = (ge % 8) + 1
          while (bitOff >= 8) { bitOff -= 8; off++ }
        } else {
          const s = bitOff, e = bitOff + bitCount - 1
          if (Math.floor(s / 8) === Math.floor(e / 8)) {
            allOverlays.push({
              fieldId: field.id, fieldName: field.name || field.type, color: color.bg,
              byteStart: off, byteEnd: off,
              bitStart: s % 8, bitEnd: e % 8,
              depth, isBitField: true,
            })
          } else {
            const gs2 = off * 8 + s, ge2 = gs2 + bitCount - 1
            const sb2 = Math.floor(gs2 / 8), eb2 = Math.floor(ge2 / 8)
            for (let b = sb2; b <= eb2; b++) {
              allOverlays.push({
                fieldId: field.id, fieldName: field.name || field.type, color: color.bg,
                byteStart: b, byteEnd: b,
                bitStart: b === sb2 ? gs2 % 8 : 0,
                bitEnd: b === eb2 ? ge2 % 8 : 7,
                depth, isBitField: true,
              })
            }
          }
          bitOff += bitCount
          while (bitOff >= 8) { bitOff -= 8; off++ }
        }
      } else {
        if (bitOff > 0) { bitOff = 0; off++ }
        let fb = getFieldBytes(field.type)
        if (field.type === 'str' || field.type === 'strz' || field.type === 'bytes') fb = field.size
        else if (field.type === 'custom' && field.children) {
          allOverlays.push({
            fieldId: field.id, fieldName: field.name || field.customTypeName || 'custom', color: color.bg,
            byteStart: off, byteEnd: off + field.size - 1,
            depth, isBitField: false,
          })
          collect(field.children, depth + 1)
          off += field.size
          continue
        } else { fb = field.size }
        if (fb > 0) {
          allOverlays.push({
            fieldId: field.id, fieldName: field.name || field.type, color: color.bg,
            byteStart: off, byteEnd: off + fb - 1,
            depth, isBitField: false,
          })
          off += fb
        }
      }
    }
  }

  collect(fields, 0)

  // 过滤出此 bit 位置的 overlay
  return allOverlays.filter(o => {
    if (props.byteOffset < o.byteStart || props.byteOffset > o.byteEnd) return false
    if (o.isBitField && o.bitStart !== undefined && o.bitEnd !== undefined) {
      return o.byteStart === props.byteOffset && props.bitIndex >= o.bitStart && props.bitIndex <= o.bitEnd
    }
    return true
  })
})

const topOverlay = computed(() => {
  if (fieldOverlays.value.length === 0) return null
  return fieldOverlays.value.reduce((a, b) => b.depth >= a.depth ? b : a)
})

const bitLabel = computed(() => `b${7 - props.bitIndex}`)

const isSelected = computed(() => {
  if (!selectionStore.selectedFieldId) return false
  return fieldOverlays.value.some(o => o.fieldId === selectionStore.selectedFieldId)
})

const isDragSelected = computed(() => {
  if (!selectionStore.selectionBitRange) return false
  const globalBit = props.byteOffset * 8 + props.bitIndex
  return globalBit >= selectionStore.selectionBitRange[0] &&
         globalBit <= selectionStore.selectionBitRange[1]
})

const cellStyle = computed(() => {
  if (topOverlay.value) {
    return { backgroundColor: topOverlay.value.color }
  }
  return {}
})

function getLabel(overlay: FieldOverlay): string {
  const name = overlay.fieldName
  if (!name) return overlay.isBitField ? 'b' : '?'
  return name.length <= 3 ? name : name.slice(0, 3)
}

function onMouseDown(e: MouseEvent) {
  if (e.button === 0) selectionStore.startDrag(props.byteOffset, props.bitIndex)
}
function onMouseEnter() {
  if (selectionStore.isDragging) selectionStore.updateDrag(props.byteOffset, props.bitIndex)
}
function onContextMenu(e: MouseEvent) {
  emit('contextmenu', props.byteOffset, props.bitIndex, e.clientX, e.clientY)
}
function onClick() {
  if (topOverlay.value) selectionStore.selectField(topOverlay.value.fieldId)
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
.bit-cell:hover { border-color: #888; z-index: 1; }
.bit-cell--selected {
  border-color: #fff;
  border-width: 2px;
  z-index: 2;
  box-shadow: 0 0 8px 2px rgba(255, 255, 255, 0.3);
  filter: brightness(1.4);
}
.bit-cell--selected .bit-cell__label {
  color: #fff;
  font-weight: 700;
}
.bit-cell--dragging { background-color: rgba(255, 255, 255, 0.15) !important; border-color: #4285f4; }
.bit-cell--has-field { border-color: rgba(255, 255, 255, 0.15); }
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
.bit-cell__empty { font-size: 14px; color: #444; }
.bit-cell__index {
  font-size: 8px;
  color: #666;
  position: absolute;
  bottom: 1px;
  right: 2px;
}
</style>

<template>
  <div
    class="field-item"
    :class="{ 'field-item--selected': isSelected, 'field-item--hovered': isHovered }"
    :style="{ borderLeftColor: fieldColor }"
    @click="onClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @dblclick="onDoubleClick"
  >
    <div class="field-item__header">
      <span class="field-item__name">{{ field.name || '(未命名)' }}</span>
      <span class="field-item__type">{{ displayType }}</span>
      <span class="field-item__range">{{ displayRange }}</span>
    </div>
    <div class="field-item__meta" v-if="field.description || field.enumName">
      <span v-if="field.enumName" class="field-item__enum">enum: {{ field.enumName }}</span>
      <span v-if="field.description" class="field-item__desc">{{ field.description }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSelectionStore } from '../../stores/selection'
import { getFieldColor } from '../../services/colorPalette'
import type { ProtocolField } from '../../models/field'
import { isBitType, FIELD_TYPE_BITS, FIELD_TYPE_BYTES } from '../../models/field'

const props = defineProps<{
  field: ProtocolField
  byteOffset: number
}>()

const selectionStore = useSelectionStore()

const isSelected = computed(() => selectionStore.selectedFieldId === props.field.id)
const isHovered = computed(() => selectionStore.hoveredFieldId === props.field.id)
const fieldColor = computed(() => getFieldColor(props.field.id).border)

/** 显示的类型 */
const displayType = computed(() => {
  if (isBitType(props.field.type)) {
    return `${props.field.type} (${FIELD_TYPE_BITS[props.field.type]}bit)`
  }
  if (props.field.type === 'custom') {
    return props.field.customTypeName || 'custom'
  }
  return props.field.type
})

/** 显示的范围 */
const displayRange = computed(() => {
  if (isBitType(props.field.type)) {
    if (props.field.bitRange) {
      // 跨字节 bit 字段: 显示全局 bit 范围
      const startByte = Math.floor(props.field.bitRange[0] / 8)
      const startBit = props.field.bitRange[0] % 8
      const endByte = Math.floor(props.field.bitRange[1] / 8)
      const endBit = props.field.bitRange[1] % 8
      if (startByte === endByte) {
        return `${startByte}[b${startBit}..b${endBit}]`
      }
      return `${startByte}:b${startBit}..${endByte}:b${endBit}`
    }
    return `b${props.byteOffset * 8}[${props.byteOffset}]`
  }
  const bytes = props.field.size || FIELD_TYPE_BYTES[props.field.type]
  if (bytes === 1) return `[${props.byteOffset}]`
  return `[${props.byteOffset}..${props.byteOffset + bytes - 1}]`
})

function onClick() {
  selectionStore.selectField(props.field.id)
}

function onMouseEnter() {
  selectionStore.hoverField(props.field.id)
}

function onMouseLeave() {
  selectionStore.hoverField(null)
}

function onDoubleClick() {
  // TODO: 打开编辑面板
}
</script>

<style scoped>
.field-item {
  padding: 6px 10px;
  border-left: 3px solid;
  margin: 2px 0;
  cursor: pointer;
  border-radius: 0 4px 4px 0;
  transition: background-color 0.15s;
}

.field-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.field-item--selected {
  background-color: rgba(66, 133, 244, 0.15);
}

.field-item--hovered {
  background-color: rgba(255, 255, 255, 0.08);
}

.field-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-item__name {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0e0;
}

.field-item__type {
  font-size: 11px;
  color: #888;
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 5px;
  border-radius: 3px;
}

.field-item__range {
  font-size: 11px;
  color: #666;
  font-family: 'Consolas', monospace;
}

.field-item__meta {
  margin-top: 3px;
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #888;
}

.field-item__enum {
  color: #ab47bc;
}

.field-item__desc {
  color: #888;
  font-style: italic;
}
</style>

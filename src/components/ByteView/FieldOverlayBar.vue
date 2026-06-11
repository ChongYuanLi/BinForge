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
      {{ overlay.fieldName }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSelectionStore } from '../../stores/selection'
import type { FieldOverlay } from '../../models/field'

defineProps<{
  overlays: FieldOverlay[]
}>()

const selectionStore = useSelectionStore()

function selectField(fieldId: string) {
  selectionStore.selectField(fieldId)
}

function hoverField(fieldId: string | null) {
  selectionStore.hoverField(fieldId)
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
}

.field-tag:hover {
  filter: brightness(1.3);
}
</style>

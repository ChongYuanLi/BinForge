<template>
  <div class="byte-row">
    <!-- 偏移地址 -->
    <div class="byte-row__offset">{{ offsetHex }}</div>

    <!-- 字节十六进制值 -->
    <div class="byte-row__hex">{{ hexValue }}</div>

    <!-- 8个bit格子 -->
    <div class="byte-row__bits">
      <BitCell
        v-for="bit in 8"
        :key="bit - 1"
        :byteOffset="byteOffset"
        :bitIndex="bit - 1"
        @contextmenu="onBitContextMenu"
      />
    </div>

    <!-- 字段标签 -->
    <FieldOverlayBar :overlays="fieldOverlays" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BitCell from './BitCell.vue'
import FieldOverlayBar from './FieldOverlayBar.vue'
import { useByteViewStore } from '../../stores/byteView'

const props = defineProps<{
  byteOffset: number
}>()

const emit = defineEmits<{
  (e: 'contextmenu', byteOffset: number, bitIndex: number, x: number, y: number): void
}>()

const byteViewStore = useByteViewStore()

/** 偏移地址 (hex) */
const offsetHex = computed(() => {
  return '0x' + props.byteOffset.toString(16).toUpperCase().padStart(4, '0')
})

/** 字节的十六进制值 */
const hexValue = computed(() => {
  const byte = byteViewStore.data[props.byteOffset]
  if (byte === undefined) return '--'
  return byte.toString(16).toUpperCase().padStart(2, '0')
})

/** 此字节处的字段覆盖 */
const fieldOverlays = computed(() => {
  return byteViewStore.getOverlaysAtByte(props.byteOffset)
})

function onBitContextMenu(byteOffset: number, bitIndex: number, x: number, y: number) {
  emit('contextmenu', byteOffset, bitIndex, x, y)
}
</script>

<style scoped>
.byte-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 0;
  min-height: 42px;
}

.byte-row:hover {
  background-color: rgba(255, 255, 255, 0.03);
}

.byte-row__offset {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #888;
  min-width: 64px;
  text-align: right;
  padding-right: 8px;
}

.byte-row__hex {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  font-weight: bold;
  color: #b0b0b0;
  min-width: 28px;
  text-align: center;
}

.byte-row__bits {
  display: flex;
  gap: 0;
}
</style>

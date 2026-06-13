<template>
  <div class="field-tree">
    <div class="field-tree__header">
      <span class="field-tree__title">协议字段</span>
      <span class="field-tree__count">{{ fields.length }} 个字段</span>
    </div>

    <div class="field-tree__list" v-if="fields.length > 0">
      <FieldItem
        v-for="item in fieldEntries"
        :key="item.field.id"
        :field="item.field"
        :byteOffset="item.byteOffset"
        :depth="item.depth"
      />
    </div>

    <div class="field-tree__empty" v-else>
      <p>暂无字段定义</p>
      <p class="field-tree__hint">在右侧字节视图中拖选位范围，然后右键创建字段</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FieldItem from './FieldItem.vue'
import { useProtocolStore } from '../../stores/protocol'
import type { ProtocolField } from '../../models/field'
import { isBitType, FIELD_TYPE_BYTES, FIELD_TYPE_BITS } from '../../models/field'

const protocolStore = useProtocolStore()

const fields = computed(() => protocolStore.protocol.fields)

/** 计算每个字段的字节偏移（递归展开子字段） */
const fieldEntries = computed(() => {
  const entries: { field: ProtocolField; byteOffset: number; depth: number }[] = []
  let byteOffset = 0
  let bitOffset = 0

  function collect(list: ProtocolField[], depth: number) {
    for (const field of list) {
      if (isBitType(field.type)) {
        if (field.bitRange) {
          entries.push({ field, byteOffset: Math.floor(field.bitRange[0] / 8), depth })
          const endByte = Math.floor(field.bitRange[1] / 8)
          byteOffset = endByte
          bitOffset = (field.bitRange[1] % 8) + 1
          while (bitOffset >= 8) { bitOffset -= 8; byteOffset++ }
        } else {
          entries.push({ field, byteOffset, depth })
          const bitCount = FIELD_TYPE_BITS[field.type]
          bitOffset += bitCount
          while (bitOffset >= 8) { bitOffset -= 8; byteOffset++ }
        }
      } else {
        if (bitOffset > 0) { bitOffset = 0; byteOffset++ }
        entries.push({ field, byteOffset, depth })
        // 递归展开子字段
        if (field.children && field.children.length > 0) {
          collect(field.children, depth + 1)
        } else {
          byteOffset += field.size || FIELD_TYPE_BYTES[field.type]
        }
      }
    }
  }

  collect(fields.value, 0)
  return entries
})
</script>

<style scoped>
.field-tree {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.field-tree__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
}

.field-tree__title {
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}

.field-tree__count {
  font-size: 11px;
  color: #888;
}

.field-tree__list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.field-tree__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  text-align: center;
  padding: 20px;
}

.field-tree__empty p {
  margin: 4px 0;
}

.field-tree__hint {
  font-size: 12px;
  color: #555;
}
</style>

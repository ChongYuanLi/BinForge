<template>
  <div class="enum-editor">
    <div class="enum-editor__header">
      <span class="enum-editor__title">枚举定义</span>
      <button class="enum-editor__add" @click="onAddEnum" title="新建枚举">+</button>
    </div>

    <div class="enum-editor__list" v-if="enumNames.length > 0">
      <div
        v-for="name in enumNames"
        :key="name"
        class="enum-item"
      >
        <div class="enum-item__header" @click="toggleExpand(name)">
          <span class="enum-item__toggle">{{ expanded.has(name) ? '▼' : '▶' }}</span>
          <span class="enum-item__name">{{ name }}</span>
          <span class="enum-item__count">{{ getEnumValues(name).length }} 项</span>
          <button class="enum-item__delete" @click.stop="onDeleteEnum(name)" title="删除枚举">✕</button>
        </div>

        <div class="enum-item__body" v-if="expanded.has(name)">
          <div
            v-for="(val, idx) in getEnumValues(name)"
            :key="idx"
            class="enum-row"
          >
            <input
              class="enum-row__value"
              type="number"
              :model-value="val.value"
              @change="onValueChange(name, idx, $event)"
              placeholder="值"
            />
            <input
              class="enum-row__id"
              :model-value="val.id"
              @change="onIdChange(name, idx, $event)"
              placeholder="名称"
            />
            <button class="enum-row__delete" @click="onDeleteValue(name, idx)">✕</button>
          </div>
          <button class="enum-item__add-value" @click="onAddValue(name)">+ 添加值</button>
        </div>
      </div>
    </div>

    <div class="enum-editor__empty" v-else>
      <p>暂无枚举定义</p>
      <p class="enum-editor__hint">点击 + 创建枚举</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProtocolStore } from '../../stores/protocol'
import type { EnumValue } from '../../models/field'

const protocolStore = useProtocolStore()
const expanded = ref(new Set<string>())

const enumNames = computed(() => {
  return Array.from(protocolStore.protocol.enums.keys())
})

function getEnumValues(name: string): EnumValue[] {
  return protocolStore.protocol.enums.get(name)?.values || []
}

function toggleExpand(name: string) {
  if (expanded.value.has(name)) {
    expanded.value.delete(name)
  } else {
    expanded.value.add(name)
  }
  // 触发响应式
  expanded.value = new Set(expanded.value)
}

function onAddEnum() {
  const name = prompt('枚举名称:')
  if (!name || !name.trim()) return
  const cleanName = name.trim()
  if (protocolStore.protocol.enums.has(cleanName)) {
    alert('枚举已存在')
    return
  }
  protocolStore.addEnum({ name: cleanName, values: [] })
  expanded.value.add(cleanName)
  expanded.value = new Set(expanded.value)
}

function onDeleteEnum(name: string) {
  if (confirm(`确定删除枚举 "${name}"？`)) {
    protocolStore.removeEnum(name)
    expanded.value.delete(name)
    expanded.value = new Set(expanded.value)
  }
}

function onAddValue(enumName: string) {
  const enumDef = protocolStore.protocol.enums.get(enumName)
  if (!enumDef) return
  const newValues = [...enumDef.values, { value: 0, id: '' }]
  protocolStore.updateEnum(enumName, { ...enumDef, values: newValues })
}

function onDeleteValue(enumName: string, idx: number) {
  const enumDef = protocolStore.protocol.enums.get(enumName)
  if (!enumDef) return
  const newValues = enumDef.values.filter((_, i) => i !== idx)
  protocolStore.updateEnum(enumName, { ...enumDef, values: newValues })
}

function onValueChange(enumName: string, idx: number, e: Event) {
  const enumDef = protocolStore.protocol.enums.get(enumName)
  if (!enumDef) return
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  if (isNaN(val)) return
  const newValues = [...enumDef.values]
  newValues[idx] = { ...newValues[idx], value: val }
  protocolStore.updateEnum(enumName, { ...enumDef, values: newValues })
}

function onIdChange(enumName: string, idx: number, e: Event) {
  const enumDef = protocolStore.protocol.enums.get(enumName)
  if (!enumDef) return
  const id = (e.target as HTMLInputElement).value
  const newValues = [...enumDef.values]
  newValues[idx] = { ...newValues[idx], id }
  protocolStore.updateEnum(enumName, { ...enumDef, values: newValues })
}
</script>

<style scoped>
.enum-editor {
  background: #252525;
  border-top: 1px solid #333;
}

.enum-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
}

.enum-editor__title {
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}

.enum-editor__add {
  background: #3a3a3a;
  border: 1px solid #555;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 16px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.enum-editor__add:hover {
  background: #4a4a4a;
}

.enum-editor__list {
  max-height: 300px;
  overflow-y: auto;
}

.enum-editor__empty {
  padding: 16px;
  text-align: center;
  color: #666;
}

.enum-editor__empty p {
  margin: 4px 0;
}

.enum-editor__hint {
  font-size: 12px;
  color: #555;
}

.enum-item {
  border-bottom: 1px solid #2a2a2a;
}

.enum-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
}

.enum-item__header:hover {
  background: rgba(255, 255, 255, 0.04);
}

.enum-item__toggle {
  font-size: 10px;
  color: #888;
  width: 12px;
}

.enum-item__name {
  font-size: 13px;
  color: #e0e0e0;
  font-weight: 500;
}

.enum-item__count {
  font-size: 11px;
  color: #888;
  margin-left: auto;
}

.enum-item__delete {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
}

.enum-item__delete:hover {
  color: #ef5350;
}

.enum-item__body {
  padding: 4px 12px 8px 28px;
}

.enum-row {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
  align-items: center;
}

.enum-row__value {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 3px;
  padding: 3px 6px;
  color: #e0e0e0;
  font-size: 12px;
  font-family: 'Consolas', monospace;
  width: 70px;
}

.enum-row__id {
  background: #1e1e1e;
  border: 1px solid #444;
  border-radius: 3px;
  padding: 3px 6px;
  color: #e0e0e0;
  font-size: 12px;
  flex: 1;
  min-width: 60px;
}

.enum-row__value:focus,
.enum-row__id:focus {
  border-color: #4285f4;
  outline: none;
}

.enum-row__delete {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 11px;
  padding: 2px 4px;
}

.enum-row__delete:hover {
  color: #ef5350;
}

.enum-item__add-value {
  background: none;
  border: 1px dashed #444;
  border-radius: 3px;
  color: #888;
  font-size: 11px;
  padding: 4px 8px;
  cursor: pointer;
  width: 100%;
  margin-top: 4px;
}

.enum-item__add-value:hover {
  border-color: #4285f4;
  color: #4285f4;
}
</style>

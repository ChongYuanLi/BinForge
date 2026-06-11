<template>
  <div class="field-editor" v-if="field">
    <div class="field-editor__header">
      <span class="field-editor__title">字段属性</span>
      <button class="field-editor__close" @click="onClose">✕</button>
    </div>

    <div class="field-editor__form">
      <div class="field-editor__row">
        <label>名称</label>
        <input
          v-model="editName"
          class="field-editor__input"
          placeholder="字段名称"
          @change="onNameChange"
        />
      </div>

      <div class="field-editor__row">
        <label>类型</label>
        <select v-model="editType" class="field-editor__select" @change="onTypeChange">
          <optgroup label="无符号整数">
            <option value="u1">u1 (1字节)</option>
            <option value="u2">u2 (2字节)</option>
            <option value="u4">u4 (4字节)</option>
            <option value="u8">u8 (8字节)</option>
          </optgroup>
          <optgroup label="有符号整数">
            <option value="s1">s1 (1字节)</option>
            <option value="s2">s2 (2字节)</option>
            <option value="s4">s4 (4字节)</option>
            <option value="s8">s8 (8字节)</option>
          </optgroup>
          <optgroup label="浮点数">
            <option value="f4">f4 (4字节)</option>
            <option value="f8">f8 (8字节)</option>
          </optgroup>
          <optgroup label="位字段">
            <option value="b1">b1 (1位)</option>
            <option value="b2">b2 (2位)</option>
            <option value="b3">b3 (3位)</option>
            <option value="b4">b4 (4位)</option>
            <option value="b5">b5 (5位)</option>
            <option value="b6">b6 (6位)</option>
            <option value="b7">b7 (7位)</option>
            <option value="b8">b8 (8位)</option>
          </optgroup>
          <optgroup label="其他">
            <option value="str">str (字符串)</option>
            <option value="strz">strz (null结尾)</option>
            <option value="bytes">bytes (原始字节)</option>
          </optgroup>
        </select>
      </div>

      <div class="field-editor__row" v-if="needsSize">
        <label>大小</label>
        <input
          v-model="editSize"
          class="field-editor__input"
          type="number"
          min="1"
          @change="onSizeChange"
        />
        <span class="field-editor__unit">字节</span>
      </div>

      <div class="field-editor__row" v-if="needsSizeExpr">
        <label>大小表达式</label>
        <input
          v-model="editSizeExpr"
          class="field-editor__input"
          placeholder="如: header.length - 4"
          @change="onSizeExprChange"
        />
      </div>

      <div class="field-editor__row">
        <label>字节序</label>
        <select v-model="editEndian" class="field-editor__select" @change="onEndianChange">
          <option value="">跟随协议</option>
          <option value="be">Big-Endian</option>
          <option value="le">Little-Endian</option>
        </select>
      </div>

      <div class="field-editor__row">
        <label>枚举</label>
        <input
          v-model="editEnumName"
          class="field-editor__input"
          placeholder="枚举名称"
          @change="onEnumChange"
        />
      </div>

      <div class="field-editor__row">
        <label>描述</label>
        <input
          v-model="editDescription"
          class="field-editor__input"
          placeholder="字段描述"
          @change="onDescChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSelectionStore } from '../../stores/selection'
import { useProtocolStore } from '../../stores/protocol'
import { isBitType, FIELD_TYPE_BYTES } from '../../models/field'
import type { FieldType } from '../../models/field'

const selectionStore = useSelectionStore()
const protocolStore = useProtocolStore()

const field = computed(() => {
  if (!selectionStore.selectedFieldId) return null
  return protocolStore.protocol.fields.find(f => f.id === selectionStore.selectedFieldId) || null
})

// 编辑状态
const editName = ref('')
const editType = ref<FieldType>('u1')
const editSize = ref(1)
const editSizeExpr = ref('')
const editEndian = ref('')
const editEnumName = ref('')
const editDescription = ref('')

// 当字段变化时同步编辑状态
watch(field, (f) => {
  if (f) {
    editName.value = f.name
    editType.value = f.type
    editSize.value = f.size
    editSizeExpr.value = f.sizeExpr || ''
    editEndian.value = f.endian || ''
    editEnumName.value = f.enumName || ''
    editDescription.value = f.description || ''
  }
}, { immediate: true })

/** 是否需要大小输入 */
const needsSize = computed(() => {
  return ['str', 'strz', 'bytes', 'custom'].includes(editType.value)
})

/** 是否需要大小表达式 */
const needsSizeExpr = computed(() => {
  return needsSize.value
})

function onNameChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { name: editName.value })
  }
}

function onTypeChange() {
  if (field.value) {
    const updates: Partial<typeof field.value> = { type: editType.value }
    if (!isBitType(editType.value) && editType.value !== 'str' && editType.value !== 'strz' && editType.value !== 'bytes') {
      updates.size = FIELD_TYPE_BYTES[editType.value]
    }
    protocolStore.updateField(field.value.id, updates)
  }
}

function onSizeChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { size: editSize.value })
  }
}

function onSizeExprChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { sizeExpr: editSizeExpr.value })
  }
}

function onEndianChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, {
      endian: editEndian.value as 'be' | 'le' | undefined,
    })
  }
}

function onEnumChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { enumName: editEnumName.value })
  }
}

function onDescChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { description: editDescription.value })
  }
}

function onClose() {
  selectionStore.selectField(null)
}
</script>

<style scoped>
.field-editor {
  background: #252525;
  border-top: 1px solid #444;
  padding: 0;
}

.field-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #333;
}

.field-editor__title {
  font-size: 13px;
  font-weight: 600;
  color: #ccc;
}

.field-editor__close {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
}

.field-editor__close:hover {
  color: #fff;
}

.field-editor__form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 12px;
}

.field-editor__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-editor__row label {
  font-size: 12px;
  color: #888;
  min-width: 60px;
  text-align: right;
}

.field-editor__input {
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 4px 8px;
  color: #e0e0e0;
  font-size: 13px;
  font-family: 'Consolas', monospace;
  min-width: 120px;
}

.field-editor__input:focus {
  border-color: #4285f4;
  outline: none;
}

.field-editor__select {
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 4px 8px;
  color: #e0e0e0;
  font-size: 13px;
}

.field-editor__select:focus {
  border-color: #4285f4;
  outline: none;
}

.field-editor__unit {
  font-size: 12px;
  color: #666;
}
</style>

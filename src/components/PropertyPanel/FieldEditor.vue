<template>
  <div class="field-editor" v-if="field">
    <div class="field-editor__header">
      <span class="field-editor__title">字段属性</span>
      <button class="field-editor__close" @click="onClose">✕</button>
    </div>

    <div class="field-editor__form">
      <!-- 名称 -->
      <div class="field-editor__row">
        <label>名称</label>
        <input
          v-model="editName"
          class="field-editor__input"
          placeholder="字段名称"
          @change="onNameChange"
        />
      </div>

      <!-- 类型 -->
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
            <option value="b4">b4 (4位)</option>
            <option value="b8">b8 (8位)</option>
            <option value="b16">b16 (16位)</option>
            <option value="b32">b32 (32位)</option>
          </optgroup>
          <optgroup label="字符串/字节">
            <option value="str">str (字符串)</option>
            <option value="strz">strz (null结尾)</option>
            <option value="bytes">bytes (原始字节)</option>
          </optgroup>
          <optgroup label="自定义类型" v-if="customTypeNames.length > 0">
            <option v-for="name in customTypeNames" :key="name" :value="'custom:' + name">{{ name }}</option>
          </optgroup>
        </select>
      </div>

      <!-- 大小 -->
      <div class="field-editor__row" v-if="needsSize">
        <label>大小</label>
        <input
          v-model="editSize"
          class="field-editor__input"
          type="number"
          min="1"
          :disabled="editSizeEos"
          @change="onSizeChange"
        />
        <span class="field-editor__unit">字节</span>
      </div>

      <!-- 大小表达式 -->
      <div class="field-editor__row" v-if="needsSizeExpr">
        <label>大小表达式</label>
        <input
          v-model="editSizeExpr"
          class="field-editor__input"
          placeholder="如: header.length - 4"
          @change="onSizeExprChange"
        />
      </div>

      <!-- 读到末尾 -->
      <div class="field-editor__row" v-if="canSizeEos">
        <label>读到末尾</label>
        <input
          type="checkbox"
          v-model="editSizeEos"
          @change="onSizeEosChange"
        />
        <span class="field-editor__hint">size-eos</span>
      </div>

      <!-- 魔数字节 -->
      <div class="field-editor__row">
        <label>魔数字节</label>
        <input
          v-model="editContents"
          class="field-editor__input"
          placeholder="AA 55 或 0xAA,0x55"
          @change="onContentsChange"
        />
      </div>

      <!-- 字符串编码 -->
      <div class="field-editor__row" v-if="needsEncoding">
        <label>编码</label>
        <select v-model="editEncoding" class="field-editor__select" @change="onEncodingChange">
          <option value="UTF-8">UTF-8</option>
          <option value="ASCII">ASCII</option>
          <option value="ISO-8859-1">ISO-8859-1</option>
          <option value="UTF-16LE">UTF-16LE</option>
          <option value="UTF-16BE">UTF-16BE</option>
          <option value="Shift_JIS">Shift_JIS</option>
          <option value="EUC-JP">EUC-JP</option>
          <option value="Windows-1252">Windows-1252</option>
        </select>
      </div>

      <!-- 字节序 -->
      <div class="field-editor__row" v-if="!isBitField">
        <label>字节序</label>
        <select v-model="editEndian" class="field-editor__select" @change="onEndianChange">
          <option value="">跟随协议</option>
          <option value="be">Big-Endian</option>
          <option value="le">Little-Endian</option>
        </select>
      </div>

      <!-- 位序 -->
      <div class="field-editor__row" v-if="isBitField">
        <label>位序</label>
        <select v-model="editBitEndian" class="field-editor__select" @change="onBitEndianChange">
          <option value="">跟随协议</option>
          <option value="be">Big-Endian (MSB先)</option>
          <option value="le">Little-Endian (LSB先)</option>
        </select>
      </div>

      <!-- 条件表达式 -->
      <div class="field-editor__row">
        <label>条件 (if)</label>
        <input
          v-model="editCondition"
          class="field-editor__input"
          placeholder="如: header.version > 2"
          @change="onConditionChange"
        />
      </div>

      <!-- 重复模式 -->
      <div class="field-editor__row">
        <label>重复</label>
        <select v-model="editRepeatMode" class="field-editor__select" @change="onRepeatChange">
          <option value="">不重复</option>
          <option value="eos">重复到末尾 (eos)</option>
          <option value="expr">按次数重复 (expr)</option>
          <option value="until">条件重复 (until)</option>
        </select>
      </div>

      <div class="field-editor__row" v-if="editRepeatMode === 'expr'">
        <label>重复次数</label>
        <input
          v-model="editRepeatExpr"
          class="field-editor__input"
          placeholder="如: count 或 10"
          @change="onRepeatChange"
        />
      </div>

      <div class="field-editor__row" v-if="editRepeatMode === 'until'">
        <label>终止条件</label>
        <input
          v-model="editRepeatUntilExpr"
          class="field-editor__input"
          placeholder="如: _.len == 0"
          @change="onRepeatChange"
        />
      </div>

      <!-- 枚举 -->
      <div class="field-editor__row">
        <label>枚举</label>
        <select
          v-if="enumOptions.length > 0"
          v-model="editEnumName"
          class="field-editor__select"
          @change="onEnumChange"
        >
          <option value="">无</option>
          <option v-for="name in enumOptions" :key="name" :value="name">{{ name }}</option>
        </select>
        <input
          v-else
          v-model="editEnumName"
          class="field-editor__input"
          placeholder="枚举名称"
          @change="onEnumChange"
        />
      </div>

      <!-- 描述 -->
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
import type { RepeatConfig } from '../../models/field'

const selectionStore = useSelectionStore()
const protocolStore = useProtocolStore()

const field = computed(() => {
  if (!selectionStore.selectedFieldId) return null
  // 递归查找
  const allFields = protocolStore.allFields
  return allFields.find(f => f.id === selectionStore.selectedFieldId) || null
})

// 编辑状态
const editName = ref('')
const editType = ref('u1')
const editSize = ref(1)
const editSizeExpr = ref('')
const editSizeEos = ref(false)
const editEndian = ref('')
const editBitEndian = ref('')
const editEnumName = ref('')
const editDescription = ref('')
const editEncoding = ref('UTF-8')
const editContents = ref('')
const editCondition = ref('')
const editRepeatMode = ref('')
const editRepeatExpr = ref('')
const editRepeatUntilExpr = ref('')

// 当字段变化时同步编辑状态
watch(field, (f) => {
  if (f) {
    editName.value = f.name
    editType.value = f.type === 'custom' && f.customTypeName ? `custom:${f.customTypeName}` : f.type
    editSize.value = f.size
    editSizeExpr.value = f.sizeExpr || ''
    editSizeEos.value = f.sizeEos || false
    editEndian.value = f.endian || ''
    editBitEndian.value = f.bitEndian || ''
    editEnumName.value = f.enumName || ''
    editDescription.value = f.description || ''
    editEncoding.value = f.encoding || 'UTF-8'
    editContents.value = f.contents
      ? f.contents.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')
      : ''
    editCondition.value = f.condition || ''
    editRepeatMode.value = f.repeat?.mode || ''
    editRepeatExpr.value = f.repeat?.expr || ''
    editRepeatUntilExpr.value = f.repeat?.untilExpr || ''
  }
}, { immediate: true })

// 计算属性
const isBitField = computed(() => isBitType(editType.value))
const needsEncoding = computed(() => ['str', 'strz'].includes(editType.value))
const canSizeEos = computed(() => ['str', 'bytes'].includes(editType.value))
const needsSize = computed(() => {
  return ['str', 'strz', 'bytes', 'custom'].includes(editType.value) && !editSizeEos.value
})
const needsSizeExpr = computed(() => needsSize.value)

const enumOptions = computed(() => {
  return Array.from(protocolStore.protocol.enums.keys())
})

const customTypeNames = computed(() => {
  return Array.from(protocolStore.protocol.types.keys())
})

// 事件处理
function onNameChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { name: editName.value })
  }
}

function onTypeChange() {
  if (field.value) {
    const updates: Record<string, any> = {}
    const typeVal = editType.value

    // 处理自定义类型 custom:xxx
    if (typeVal.startsWith('custom:')) {
      const customName = typeVal.substring(7)
      updates.type = 'custom'
      updates.customTypeName = customName
      // 展开子字段
      const typeFields = protocolStore.protocol.types.get(customName)
      if (typeFields) {
        updates.children = typeFields.map(f => ({ ...f, id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }))
        updates.size = updates.children.reduce((sum: number, f: any) => sum + (f.size || 0), 0)
      }
    } else {
      updates.type = typeVal
      if (isBitType(typeVal)) {
        updates.size = 0
      } else if (['str', 'strz', 'bytes'].includes(typeVal)) {
        if (field.value.size <= 0) {
          updates.size = 1
          editSize.value = 1
        }
      } else {
        updates.size = FIELD_TYPE_BYTES[typeVal]
      }
    }

    // 切换类型时清除 contents
    if (editContents.value) {
      editContents.value = ''
      updates.contents = undefined
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
    protocolStore.updateField(field.value.id, { sizeExpr: editSizeExpr.value || undefined })
  }
}

function onSizeEosChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { sizeEos: editSizeEos.value })
  }
}

function onEndianChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, {
      endian: editEndian.value as 'be' | 'le' | undefined,
    })
  }
}

function onBitEndianChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, {
      bitEndian: editBitEndian.value as 'be' | 'le' | undefined,
    })
  }
}

function onEnumChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { enumName: editEnumName.value || undefined })
  }
}

function onDescChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { description: editDescription.value || undefined })
  }
}

function onEncodingChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { encoding: editEncoding.value })
  }
}

function onContentsChange() {
  if (field.value) {
    if (!editContents.value.trim()) {
      protocolStore.updateField(field.value.id, { contents: undefined })
      return
    }
    // 解析 hex 字符串: "AA 55" 或 "0xAA,0x55" 或 "AA55"
    const cleaned = editContents.value.replace(/0x/gi, '').replace(/[,;\s]+/g, ' ').trim()
    const bytes = cleaned.split(' ').filter(Boolean).map(s => parseInt(s, 16))
    if (bytes.every(b => !isNaN(b) && b >= 0 && b <= 255)) {
      protocolStore.updateField(field.value.id, { contents: bytes })
    }
  }
}

function onConditionChange() {
  if (field.value) {
    protocolStore.updateField(field.value.id, { condition: editCondition.value || undefined })
  }
}

function onRepeatChange() {
  if (field.value) {
    let repeat: RepeatConfig | undefined
    if (editRepeatMode.value) {
      repeat = {
        mode: editRepeatMode.value as 'eos' | 'expr' | 'until',
        expr: editRepeatExpr.value || undefined,
        untilExpr: editRepeatUntilExpr.value || undefined,
      }
    }
    protocolStore.updateField(field.value.id, { repeat })
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
  min-width: 70px;
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

.field-editor__input:disabled {
  opacity: 0.5;
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

.field-editor__hint {
  font-size: 11px;
  color: #666;
}

input[type="checkbox"] {
  accent-color: #4285f4;
}
</style>

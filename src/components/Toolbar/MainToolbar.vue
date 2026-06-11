<template>
  <div class="toolbar">
    <div class="toolbar__group">
      <button class="toolbar__btn" @click="onNewProtocol" title="新建协议">
        <span class="toolbar__icon">📄</span> 新建
      </button>
      <button class="toolbar__btn" @click="onImportKsy" title="导入 .ksy 文件">
        <span class="toolbar__icon">📂</span> 导入.ksy
      </button>
      <button class="toolbar__btn" @click="onExportKsy" title="导出 .ksy 文件">
        <span class="toolbar__icon">💾</span> 导出.ksy
      </button>
    </div>

    <div class="toolbar__divider"></div>

    <div class="toolbar__group">
      <button class="toolbar__btn" @click="onImportData" title="导入二进制数据">
        <span class="toolbar__icon">📥</span> 导入数据
      </button>
      <button class="toolbar__btn" @click="onParseData" title="使用协议解析数据">
        <span class="toolbar__icon">▶</span> 解析
      </button>
    </div>

    <div class="toolbar__divider"></div>

    <div class="toolbar__group">
      <button class="toolbar__btn" @click="onUndo" :disabled="undoCount === 0" title="撤销">
        <span class="toolbar__icon">↩</span> 撤销
      </button>
      <button class="toolbar__btn" @click="onRedo" :disabled="redoCount === 0" title="重做">
        <span class="toolbar__icon">↪</span> 重做
      </button>
    </div>

    <div class="toolbar__spacer"></div>

    <!-- 协议元信息 -->
    <div class="toolbar__meta">
      <input
        v-model="protocolTitle"
        class="toolbar__title-input"
        placeholder="协议名称"
        @change="onTitleChange"
      />
      <select v-model="endian" class="toolbar__endian-select" @change="onEndianChange">
        <option value="be">Big-Endian</option>
        <option value="le">Little-Endian</option>
      </select>
    </div>

    <!-- 隐藏的文件输入 -->
    <input ref="fileInputRef" type="file" accept=".ksy,.yaml,.yml" style="display:none" @change="onFileSelected" />
    <input ref="dataInputRef" type="file" accept=".bin,.dat,.hex,.*" style="display:none" @change="onDataFileSelected" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProtocolStore } from '../../stores/protocol'
import { useByteViewStore } from '../../stores/byteView'
import { createEmptyProtocol } from '../../models/protocol'
import { parseKsyFile, generateKsy } from '../../services/ksyGenerator'

const protocolStore = useProtocolStore()
const byteViewStore = useByteViewStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const dataInputRef = ref<HTMLInputElement | null>(null)

const protocolTitle = ref(protocolStore.protocol.title)
const endian = ref(protocolStore.protocol.endian)

const undoCount = computed(() => protocolStore.undoStack.length)
const redoCount = computed(() => protocolStore.redoStack.length)

function onNewProtocol() {
  if (confirm('确定新建协议？当前未保存的更改将丢失。')) {
    protocolStore.loadProtocol(createEmptyProtocol())
    protocolTitle.value = ''
    endian.value = 'be'
  }
}

function onImportKsy() {
  fileInputRef.value?.click()
}

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const content = reader.result as string
      const protocol = parseKsyFile(content)
      protocolStore.loadProtocol(protocol)
      protocolTitle.value = protocol.title
      endian.value = protocol.endian
    } catch (err) {
      alert('解析 .ksy 文件失败: ' + (err as Error).message)
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function onExportKsy() {
  try {
    const ksyContent = generateKsy(protocolStore.protocol)
    const blob = new Blob([ksyContent], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${protocolStore.protocol.id}.ksy`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    alert('导出失败: ' + (err as Error).message)
  }
}

function onImportData() {
  dataInputRef.value?.click()
}

function onDataFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const buffer = reader.result as ArrayBuffer
    byteViewStore.setData(new Uint8Array(buffer))
  }
  reader.readAsArrayBuffer(file)
  input.value = ''
}

function onParseData() {
  // TODO: Phase 4 - 使用协议解析数据
  alert('解析功能将在 Phase 4 实现')
}

function onUndo() {
  protocolStore.undo()
}

function onRedo() {
  protocolStore.redo()
}

function onTitleChange() {
  protocolStore.updateMeta({ title: protocolTitle.value })
}

function onEndianChange() {
  protocolStore.updateMeta({ endian: endian.value as 'be' | 'le' })
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #2d2d2d;
  border-bottom: 1px solid #444;
  flex-wrap: wrap;
}

.toolbar__group {
  display: flex;
  gap: 4px;
}

.toolbar__btn {
  background: #3a3a3a;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 5px 10px;
  color: #e0e0e0;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.toolbar__btn:hover:not(:disabled) {
  background: #4a4a4a;
  border-color: #666;
}

.toolbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar__icon {
  font-size: 13px;
}

.toolbar__divider {
  width: 1px;
  height: 24px;
  background: #555;
  margin: 0 4px;
}

.toolbar__spacer {
  flex: 1;
}

.toolbar__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar__title-input {
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 4px 8px;
  color: #e0e0e0;
  font-size: 13px;
  width: 150px;
}

.toolbar__title-input:focus {
  border-color: #4285f4;
  outline: none;
}

.toolbar__endian-select {
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 4px 8px;
  color: #e0e0e0;
  font-size: 12px;
}
</style>

/**
 * 协议状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProtocolField, EnumDefinition } from '../models/field'
import { createEmptyProtocol } from '../models/protocol'
import type { Protocol as ProtocolType } from '../models/protocol'

export const useProtocolStore = defineStore('protocol', () => {
  // 当前协议
  const protocol = ref<ProtocolType>(createEmptyProtocol())

  // 撤销栈
  const undoStack = ref<string[]>([])
  const redoStack = ref<string[]>([])

  /** 序列化当前状态 */
  function serialize(): string {
    return JSON.stringify({
      ...protocol.value,
      types: Array.from(protocol.value.types.entries()),
      enums: Array.from(protocol.value.enums.entries()),
    })
  }

  /** 保存快照到撤销栈 */
  function saveSnapshot(): void {
    undoStack.value.push(serialize())
    if (undoStack.value.length > 50) {
      undoStack.value.shift()
    }
    redoStack.value = []
  }

  /** 撤销 */
  function undo(): void {
    if (undoStack.value.length === 0) return
    redoStack.value.push(serialize())
    const snapshot = undoStack.value.pop()!
    const data = JSON.parse(snapshot)
    protocol.value = {
      ...data,
      types: new Map(data.types),
      enums: new Map(data.enums),
    }
  }

  /** 重做 */
  function redo(): void {
    if (redoStack.value.length === 0) return
    undoStack.value.push(serialize())
    const snapshot = redoStack.value.pop()!
    const data = JSON.parse(snapshot)
    protocol.value = {
      ...data,
      types: new Map(data.types),
      enums: new Map(data.enums),
    }
  }

  /** 添加字段 */
  function addField(field: ProtocolField, index?: number): void {
    saveSnapshot()
    if (index !== undefined) {
      protocol.value.fields.splice(index, 0, field)
    } else {
      protocol.value.fields.push(field)
    }
  }

  /** 更新字段 */
  function updateField(fieldId: string, updates: Partial<ProtocolField>): void {
    saveSnapshot()
    const idx = protocol.value.fields.findIndex(f => f.id === fieldId)
    if (idx !== -1) {
      protocol.value.fields[idx] = { ...protocol.value.fields[idx], ...updates }
    }
  }

  /** 删除字段 */
  function removeField(fieldId: string): void {
    saveSnapshot()
    const idx = protocol.value.fields.findIndex(f => f.id === fieldId)
    if (idx !== -1) {
      protocol.value.fields.splice(idx, 1)
    }
  }

  /** 获取所有字段（扁平化，包括子类型） */
  const allFields = computed(() => {
    const result: ProtocolField[] = []
    function collect(fields: ProtocolField[]) {
      for (const f of fields) {
        result.push(f)
        if (f.children && f.children.length > 0) {
          collect(f.children)
        }
      }
    }
    collect(protocol.value.fields)
    return result
  })

  /** 添加枚举定义 */
  function addEnum(enumDef: EnumDefinition): void {
    saveSnapshot()
    protocol.value.enums.set(enumDef.name, enumDef)
  }

  /** 删除枚举定义 */
  function removeEnum(name: string): void {
    saveSnapshot()
    protocol.value.enums.delete(name)
  }

  /** 更新协议元信息 */
  function updateMeta(updates: Partial<Pick<ProtocolType, 'id' | 'title' | 'endian' | 'bitEndian' | 'encoding'>>): void {
    saveSnapshot()
    Object.assign(protocol.value, updates)
  }

  /** 加载协议 */
  function loadProtocol(p: ProtocolType): void {
    saveSnapshot()
    protocol.value = p
  }

  return {
    protocol,
    undoStack,
    redoStack,
    allFields,
    saveSnapshot,
    undo,
    redo,
    addField,
    updateField,
    removeField,
    addEnum,
    removeEnum,
    updateMeta,
    loadProtocol,
  }
})

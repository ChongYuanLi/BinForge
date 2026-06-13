/**
 * 协议状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProtocolField, EnumDefinition } from '../models/field'
import { createEmptyProtocol } from '../models/protocol'
import type { Protocol as ProtocolType } from '../models/protocol'
import { resetColors } from '../services/colorPalette'

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

  /** 递归查找字段 */
  function findFieldRecursive(
    fields: ProtocolField[],
    fieldId: string,
  ): { field: ProtocolField; index: number; siblings: ProtocolField[] } | null {
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].id === fieldId) {
        return { field: fields[i], index: i, siblings: fields }
      }
      if (fields[i].children) {
        const found = findFieldRecursive(fields[i].children!, fieldId)
        if (found) return found
      }
    }
    return null
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

  /** 更新字段（递归搜索） */
  function updateField(fieldId: string, updates: Partial<ProtocolField>): void {
    saveSnapshot()
    const found = findFieldRecursive(protocol.value.fields, fieldId)
    if (found) {
      found.siblings[found.index] = { ...found.siblings[found.index], ...updates }
    }
  }

  /** 删除字段（递归搜索） */
  function removeField(fieldId: string): void {
    saveSnapshot()
    const found = findFieldRecursive(protocol.value.fields, fieldId)
    if (found) {
      found.siblings.splice(found.index, 1)
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

  /** 更新枚举定义 */
  function updateEnum(name: string, enumDef: EnumDefinition): void {
    saveSnapshot()
    protocol.value.enums.set(name, enumDef)
  }

  /** 添加自定义子类型 */
  function addCustomType(name: string): void {
    saveSnapshot()
    protocol.value.types.set(name, [])
  }

  /** 删除自定义子类型 */
  function removeCustomType(name: string): void {
    saveSnapshot()
    protocol.value.types.delete(name)
  }

  /** 加载协议 */
  function loadProtocol(p: ProtocolType): void {
    saveSnapshot()
    resetColors()
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
    updateEnum,
    addCustomType,
    removeCustomType,
    updateMeta,
    loadProtocol,
  }
})

/**
 * 协议状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProtocolField, EnumDefinition, FieldType } from '../models/field'
import { isBitType, getFieldBits, getFieldBytes } from '../models/field'
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

  /**
   * 计算字段的全局 bit 起始位置（用于排序）
   * 注意：调用前需要知道字段的字节偏移，这里用 fields 数组顺序推算
   */
  function getFieldsSortedInsertIndex(fields: ProtocolField[], newField: ProtocolField): number {
    // 计算新字段的起始 bit 位置
    const newStart = newField.bitRange
      ? newField.bitRange[0]
      : 0 // 无 bitRange 的字段暂时追加到末尾

    let byteOffset = 0
    let bitOffset = 0

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i]
      let fieldStart: number

      if (f.bitRange) {
        fieldStart = f.bitRange[0]
      } else if (isBitType(f.type)) {
        fieldStart = byteOffset * 8 + bitOffset
      } else {
        if (bitOffset > 0) { bitOffset = 0; byteOffset++ }
        fieldStart = byteOffset * 8
      }

      if (newStart < fieldStart) return i

      // 推进偏移
      if (isBitType(f.type)) {
        const bits = f.bitRange
          ? f.bitRange[1] - f.bitRange[0] + 1
          : getFieldBits(f.type)
        bitOffset += bits
        while (bitOffset >= 8) { bitOffset -= 8; byteOffset++ }
      } else {
        if (bitOffset > 0) { bitOffset = 0; byteOffset++ }
        byteOffset += f.size || getFieldBytes(f.type)
      }
    }

    return fields.length // 追加到末尾
  }

  /**
   * 添加字段，自动处理与已有字段的重叠，并按位置插入到正确顺序
   */
  function addField(field: ProtocolField, index?: number): void {
    saveSnapshot()

    // 计算新字段的全局 bit 范围
    const newRange: [number, number] | null = field.bitRange
      ? [field.bitRange[0], field.bitRange[1] + 1]
      : null

    if (newRange) {
      resolveOverlaps(protocol.value.fields, newRange)
    }

    if (index !== undefined) {
      protocol.value.fields.splice(index, 0, field)
    } else {
      // 按位置插入到正确的顺序
      const insertIndex = getFieldsSortedInsertIndex(protocol.value.fields, field)
      protocol.value.fields.splice(insertIndex, 0, field)
    }
  }

  /**
   * 获取单个字段的全局 bit 范围 [start, end)
   * 基于字段在 fields 数组中的顺序位置推算
   */
  function computeFieldRange(
    fields: ProtocolField[], fieldIndex: number,
  ): [number, number] | null {
    let byteOffset = 0
    let bitOffset = 0
    for (let i = 0; i <= fieldIndex; i++) {
      const f = fields[i]
      if (i === fieldIndex) {
        // 计算当前字段的范围
        if (f.bitRange) {
          return [f.bitRange[0], f.bitRange[1] + 1]
        }
        if (isBitType(f.type)) {
          const bits = getFieldBits(f.type)
          const start = byteOffset * 8 + bitOffset
          return [start, start + bits]
        }
        if (bitOffset > 0) { bitOffset = 0; byteOffset++ }
        const bytes = f.size || getFieldBytes(f.type)
        if (bytes > 0) {
          return [byteOffset * 8, byteOffset * 8 + bytes * 8]
        }
        return null
      }
      // 推进偏移
      if (f.bitRange) {
        const endByte = Math.floor(f.bitRange[1] / 8)
        byteOffset = endByte
        bitOffset = (f.bitRange[1] % 8) + 1
        while (bitOffset >= 8) { bitOffset -= 8; byteOffset++ }
      } else if (isBitType(f.type)) {
        bitOffset += getFieldBits(f.type)
        while (bitOffset >= 8) { bitOffset -= 8; byteOffset++ }
      } else {
        if (bitOffset > 0) { bitOffset = 0; byteOffset++ }
        byteOffset += f.size || getFieldBytes(f.type)
      }
    }
    return null
  }

  /**
   * 解决重叠：调整已有字段，使其不与新字段的范围重叠
   * 每次修改后重新计算所有范围，确保后续字段位置正确
   */
  function resolveOverlaps(fields: ProtocolField[], newRange: [number, number]): void {
    const [ns, ne] = newRange
    let changed = true

    // 循环检测，因为缩小一个字段后可能产生新的重叠
    while (changed) {
      changed = false
      for (let i = 0; i < fields.length; i++) {
        const range = computeFieldRange(fields, i)
        if (!range) continue
        const [fs, fe] = range

        if (fs >= ne || ns >= fe) continue // 无重叠

        const f = fields[i]

        if (ns <= fs && ne >= fe) {
          // 新字段完全覆盖 → 删除
          fields.splice(i, 1)
          changed = true
          break // 重新开始扫描
        } else if (ns <= fs && ne < fe) {
          // 新字段覆盖左侧 → 保留右侧
          const remainBits = fe - ne
          f.type = `b${remainBits}` as FieldType
          f.bitRange = [ne, fe - 1]
          f.size = 0
          changed = true
          break
        } else if (ns > fs && ne >= fe) {
          // 新字段覆盖右侧 → 保留左侧
          const remainBits = ns - fs
          f.type = `b${remainBits}` as FieldType
          f.bitRange = [fs, ns - 1]
          f.size = 0
          changed = true
          break
        } else {
          // 新字段在中间 → 分割成左右两个
          const leftBits = ns - fs
          const rightBits = fe - ne
          const left: ProtocolField = {
            ...f, id: `field_${Date.now()}_L`,
            type: `b${leftBits}` as FieldType, size: 0, bitRange: [fs, ns - 1],
          }
          const right: ProtocolField = {
            ...f, id: `field_${Date.now()}_R`,
            type: `b${rightBits}` as FieldType, size: 0, bitRange: [ne, fe - 1],
          }
          const validFields = [left, right].filter(g =>
            isBitType(g.type) ? getFieldBits(g.type) > 0 : (g.size || getFieldBytes(g.type)) > 0
          )
          fields.splice(i, 1, ...validFields)
          changed = true
          break
        }
      }
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

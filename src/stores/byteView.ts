/**
 * 字节视图状态管理
 * 管理二进制数据和字段覆盖信息
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useProtocolStore } from './protocol'
import type { FieldOverlay, ProtocolField } from '../models/field'
import { isBitType, FIELD_TYPE_BITS, FIELD_TYPE_BYTES } from '../models/field'
import { getFieldColor } from '../services/colorPalette'

export const useByteViewStore = defineStore('byteView', () => {
  /** 原始二进制数据 */
  const data = ref<Uint8Array>(new Uint8Array(64))

  /** 每行显示的字节数 */
  const bytesPerRow = ref(1)

  /** 设置数据 */
  function setData(newData: Uint8Array): void {
    data.value = newData
  }

  /** 从hex字符串设置数据 */
  function setHexString(hex: string): void {
    const clean = hex.replace(/\s+/g, '').replace(/^0x/i, '')
    const bytes = new Uint8Array(clean.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
    }
    data.value = bytes
  }

  /** 计算字段覆盖信息 */
  const fieldOverlays = computed<FieldOverlay[]>(() => {
    const protocolStore = useProtocolStore()
    const overlays: FieldOverlay[] = []
    let byteOffset = 0
    let bitOffset = 0 // 当前字节内的bit偏移 (0=MSB, 7=LSB)

    function processFields(fields: ProtocolField[], depth: number): void {
      for (const field of fields) {
        const color = getFieldColor(field.id)
        if (isBitType(field.type)) {
          const bitCount = FIELD_TYPE_BITS[field.type]

          if (field.bitRange) {
            // 有显式 bitRange（可能跨字节）→ 按字节拆分生成 overlay
            const [globalStart, globalEnd] = field.bitRange
            const startByte = Math.floor(globalStart / 8)
            const endByte = Math.floor(globalEnd / 8)

            for (let b = startByte; b <= endByte; b++) {
              const localStart = (b === startByte) ? (globalStart % 8) : 0
              const localEnd = (b === endByte) ? (globalEnd % 8) : 7
              overlays.push({
                fieldId: field.id,
                fieldName: field.name || field.type,
                color: color.bg,
                byteStart: b,
                byteEnd: b,
                bitStart: localStart,
                bitEnd: localEnd,
                depth,
                isBitField: true,
              })
            }

            // 同步 byteOffset / bitOffset 到字段结束位置
            byteOffset = endByte
            bitOffset = (globalEnd % 8) + 1
            while (bitOffset >= 8) {
              bitOffset -= 8
              byteOffset++
            }
          } else {
            // 无显式 bitRange → 按顺序流式布局（兼容旧逻辑）
            const startBit = bitOffset
            const endBit = bitOffset + bitCount - 1

            // 检查是否跨字节
            if (Math.floor(startBit / 8) === Math.floor(endBit / 8)) {
              // 同一字节内
              overlays.push({
                fieldId: field.id,
                fieldName: field.name || field.type,
                color: color.bg,
                byteStart: byteOffset,
                byteEnd: byteOffset,
                bitStart: startBit % 8,
                bitEnd: endBit % 8,
                depth,
                isBitField: true,
              })
            } else {
              // 跨字节：拆分为多段
              const globalStart = byteOffset * 8 + startBit
              const globalEnd = globalStart + bitCount - 1
              const sByte = Math.floor(globalStart / 8)
              const eByte = Math.floor(globalEnd / 8)
              for (let b = sByte; b <= eByte; b++) {
                const localStart = (b === sByte) ? (globalStart % 8) : 0
                const localEnd = (b === eByte) ? (globalEnd % 8) : 7
                overlays.push({
                  fieldId: field.id,
                  fieldName: field.name || field.type,
                  color: color.bg,
                  byteStart: b,
                  byteEnd: b,
                  bitStart: localStart,
                  bitEnd: localEnd,
                  depth,
                  isBitField: true,
                })
              }
            }

            bitOffset += bitCount
            while (bitOffset >= 8) {
              bitOffset -= 8
              byteOffset++
            }
          }
        } else {
          // 非bit字段，先对齐到字节边界
          if (bitOffset > 0) {
            bitOffset = 0
            byteOffset++
          }

          let fieldBytes = FIELD_TYPE_BYTES[field.type]
          if (field.type === 'str' || field.type === 'strz' || field.type === 'bytes') {
            fieldBytes = field.size
          } else if (field.type === 'custom' && field.children) {
            // 子类型：递归处理子字段
            overlays.push({
              fieldId: field.id,
              fieldName: field.name || field.customTypeName || 'custom',
              color: color.bg,
              byteStart: byteOffset,
              byteEnd: byteOffset + field.size - 1,
              depth,
              isBitField: false,
            })
            processFields(field.children, depth + 1)
            byteOffset += field.size
            continue
          } else {
            fieldBytes = field.size
          }

          if (fieldBytes > 0) {
            overlays.push({
              fieldId: field.id,
              fieldName: field.name || field.type,
              color: color.bg,
              byteStart: byteOffset,
              byteEnd: byteOffset + fieldBytes - 1,
              depth,
              isBitField: false,
            })
            byteOffset += fieldBytes
          }
        }
      }
    }

    processFields(protocolStore.protocol.fields, 0)
    return overlays
  })

  /** 获取指定字节偏移处的字段覆盖 */
  function getOverlaysAtByte(byteOffset: number): FieldOverlay[] {
    return fieldOverlays.value.filter(
      o => byteOffset >= o.byteStart && byteOffset <= o.byteEnd
    )
  }

  /** 获取指定bit位置的字段覆盖 */
  function getOverlaysAtBit(byteOffset: number, bitIndex: number): FieldOverlay[] {
    return fieldOverlays.value.filter(o => {
      if (byteOffset < o.byteStart || byteOffset > o.byteEnd) return false
      if (o.isBitField && o.bitStart !== undefined && o.bitEnd !== undefined) {
        return o.byteStart === byteOffset && bitIndex >= o.bitStart && bitIndex <= o.bitEnd
      }
      return true
    })
  }

  /** 修改单个字节 */
  function setByte(offset: number, value: number): void {
    if (offset >= 0 && offset < data.value.length) {
      const newData = new Uint8Array(data.value)
      newData[offset] = value & 0xFF
      data.value = newData
    }
  }

  /** 修改单个bit */
  function setBit(byteOffset: number, bitIndex: number, value: boolean): void {
    if (byteOffset >= 0 && byteOffset < data.value.length) {
      const newData = new Uint8Array(data.value)
      if (value) {
        newData[byteOffset] |= (1 << (7 - bitIndex))
      } else {
        newData[byteOffset] &= ~(1 << (7 - bitIndex))
      }
      data.value = newData
    }
  }

  /** 扩展数据大小 */
  function ensureSize(minSize: number): void {
    if (data.value.length < minSize) {
      const newData = new Uint8Array(minSize)
      newData.set(data.value)
      data.value = newData
    }
  }

  return {
    data,
    bytesPerRow,
    fieldOverlays,
    setData,
    setHexString,
    getOverlaysAtByte,
    getOverlaysAtBit,
    setByte,
    setBit,
    ensureSize,
  }
})

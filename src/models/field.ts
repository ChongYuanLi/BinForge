/**
 * 字段数据模型
 * 定义协议中每个字段的结构
 */

/** 字段类型 — bN 支持任意位宽 (b1~b64) */
export type FieldType = string

/** 字段类型的字节大小，bit类型返回0 */
export function getFieldBytes(type: string): number {
  if (isBitType(type)) return 0
  const map: Record<string, number> = {
    u1: 1, u2: 2, u4: 4, u8: 8,
    s1: 1, s2: 2, s4: 4, s8: 8,
    f4: 4, f8: 8,
    str: 0, strz: 0,
    bytes: 0, custom: 0,
  }
  return map[type] ?? 0
}

/** 字段类型的位大小 */
export function getFieldBits(type: string): number {
  if (isBitType(type)) {
    const n = parseInt(type.substring(1), 10)
    return isNaN(n) ? 0 : n
  }
  const map: Record<string, number> = {
    u1: 8, u2: 16, u4: 32, u8: 64,
    s1: 8, s2: 16, s4: 32, s8: 64,
    f4: 32, f8: 64,
  }
  return map[type] ?? 0
}

/** 是否是bit类型 (b1, b4, b37, b64 等) */
export function isBitType(type: string): boolean {
  return /^b\d+$/.test(type)
}

// 兼容旧代码的常量导出（通过 Proxy 支持任意 bN 访问）
const _bytes: Record<string, number> = { u1: 1, u2: 2, u4: 4, u8: 8, s1: 1, s2: 2, s4: 4, s8: 8, f4: 4, f8: 8, str: 0, strz: 0, bytes: 0, custom: 0 }
const _bits: Record<string, number> = { u1: 8, u2: 16, u4: 32, u8: 64, s1: 8, s2: 16, s4: 32, s8: 64, f4: 32, f8: 64 }
export const FIELD_TYPE_BYTES: Record<string, number> = new Proxy(_bytes, {
  get: (t, p: string) => (p in t) ? t[p] : (isBitType(p) ? 0 : 0),
})
export const FIELD_TYPE_BITS: Record<string, number> = new Proxy(_bits, {
  get: (t, p: string) => (p in t) ? t[p] : (isBitType(p) ? parseInt(p.substring(1), 10) || 0 : 0),
})

/** 枚举值定义 */
export interface EnumValue {
  value: number
  id: string
  doc?: string
}

/** 枚举定义 */
export interface EnumDefinition {
  name: string
  values: EnumValue[]
}

/** 重复配置 */
export interface RepeatConfig {
  mode: 'eos' | 'expr' | 'until'
  expr?: string
  untilExpr?: string
}

/** 协议字段 */
export interface ProtocolField {
  id: string
  name: string
  description?: string
  type: FieldType
  /** 字节数，bit类型时为0，str/bytes时可能是表达式引用 */
  size: number
  /** size表达式，如 "header.length - 4" */
  sizeExpr?: string
  /** 是否读到末尾 */
  sizeEos?: boolean
  /** bit范围 [startBit, endBit]，相对于当前字节偏移 */
  bitRange?: [number, number]
  /** 字节序 */
  endian?: 'be' | 'le'
  /** 位序 */
  bitEndian?: 'be' | 'le'
  /** 枚举定义引用 */
  enumName?: string
  /** 固定魔数字节 */
  contents?: number[]
  /** 子类型名称 */
  customTypeName?: string
  /** 子字段（用于子类型展开） */
  children?: ProtocolField[]
  /** 重复配置 */
  repeat?: RepeatConfig
  /** 条件表达式 */
  condition?: string
  /** 字符串编码 */
  encoding?: string
  /** 是否已折叠（UI状态） */
  collapsed?: boolean
}

/** 字段在字节视图中的覆盖信息 */
export interface FieldOverlay {
  fieldId: string
  fieldName: string
  color: string
  byteStart: number
  byteEnd: number
  bitStart?: number
  bitEnd?: number
  depth: number
  isBitField: boolean
}

/**
 * 创建空字段
 * @param startByte 起始字节偏移
 * @param startBitInByte 起始字节内的bit位置 (0=MSB, 7=LSB)
 * @param endByte 结束字节偏移
 * @param endBitInByte 结束字节内的bit位置 (0=MSB, 7=LSB)
 */
export function createEmptyField(
  startByte: number,
  startBitInByte?: number,
  endByte?: number,
  endBitInByte?: number,
): ProtocolField {
  const hasBits = startBitInByte !== undefined && endBitInByte !== undefined && endByte !== undefined
  let type: FieldType = 'u1'
  let size = 1
  let bitRange: [number, number] | undefined

  if (hasBits) {
    // 将 bitInByte (0=MSB) 转换为全局 bit 偏移
    const globalStart = startByte * 8 + startBitInByte!
    const globalEnd = endByte! * 8 + endBitInByte!
    const minBit = Math.min(globalStart, globalEnd)
    const maxBit = Math.max(globalStart, globalEnd)
    const bitCount = maxBit - minBit + 1
    type = `b${bitCount}` as FieldType
    size = 0
    // bitRange 存储全局 bit 偏移范围
    bitRange = [minBit, maxBit]
  }

  return {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    type,
    size,
    bitRange,
  }
}

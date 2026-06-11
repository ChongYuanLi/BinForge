/**
 * Kaitai Struct .ksy 文件生成器和解析器
 * 协议模型 <-> .ksy YAML 互转
 */

import yaml from 'js-yaml'
import type { Protocol } from '../models/protocol'
import { createEmptyProtocol } from '../models/protocol'
import type { ProtocolField, FieldType, EnumDefinition, EnumValue } from '../models/field'
import { isBitType, FIELD_TYPE_BYTES } from '../models/field'

// ============================================================
// .ksy 生成
// ============================================================

interface KsyField {
  id: string
  type?: string
  size?: number | string
  'size-eos'?: boolean
  contents?: number[] | string
  encoding?: string
  endian?: string
  enum?: string
  if?: string
  repeat?: string
  'repeat-expr'?: string | number
  'repeat-until'?: string
  doc?: string
}

interface KsyType {
  seq: KsyField[]
  types?: Record<string, KsyType>
  enums?: Record<string, Record<number, string | { id: string; doc?: string }>>
}

interface KsyRoot {
  meta: {
    id: string
    title: string
    endian: string
    'bit-endian': string
    encoding?: string
    'ks-version': string
  }
  seq: KsyField[]
  types?: Record<string, KsyType>
  enums?: Record<string, Record<number, string | { id: string; doc?: string }>>
}

/** 将协议模型转换为 .ksy YAML 字符串 */
export function generateKsy(protocol: Protocol): string {
  const root: KsyRoot = {
    meta: {
      id: protocol.id || 'new_protocol',
      title: protocol.title || 'New Protocol',
      endian: protocol.endian,
      'bit-endian': protocol.bitEndian,
      'ks-version': '0.9',
    },
    seq: [],
  }

  // 生成 seq
  root.seq = protocol.fields.map(f => fieldToKsy(f))

  // 生成 types
  if (protocol.types.size > 0) {
    root.types = {}
    for (const [name, fields] of protocol.types) {
      root.types[name] = {
        seq: fields.map(f => fieldToKsy(f)),
      }
    }
  }

  // 生成 enums
  if (protocol.enums.size > 0) {
    root.enums = {}
    for (const [name, enumDef] of protocol.enums) {
      root.enums[name] = enumToKsy(enumDef)
    }
  }

  // 转为 YAML
  return yaml.dump(root, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  })
}

/** 将字段转换为 ksy 字段定义 */
function fieldToKsy(field: ProtocolField): KsyField {
  const ksy: KsyField = { id: field.name || field.id }

  // 固定内容
  if (field.contents && field.contents.length > 0) {
    ksy.contents = field.contents
    return ksy
  }

  // 类型
  if (field.type === 'str') {
    ksy.type = 'str'
    ksy.encoding = field.encoding || 'UTF-8'
    if (field.sizeExpr) {
      ksy.size = field.sizeExpr
    } else if (field.sizeEos) {
      ksy['size-eos'] = true
    } else {
      ksy.size = field.size
    }
  } else if (field.type === 'strz') {
    ksy.type = 'strz'
    ksy.encoding = field.encoding || 'UTF-8'
  } else if (field.type === 'bytes') {
    if (field.sizeExpr) {
      ksy.size = field.sizeExpr
    } else if (field.sizeEos) {
      ksy['size-eos'] = true
    } else {
      ksy.size = field.size
    }
  } else if (field.type === 'custom') {
    ksy.type = field.customTypeName || 'unknown'
    if (field.sizeExpr) {
      ksy.size = field.sizeExpr
    } else if (field.size > 0) {
      ksy.size = field.size
    }
  } else if (isBitType(field.type)) {
    ksy.type = field.type
  } else {
    // 标量类型 (u1, u2, s4, f8, etc.)
    ksy.type = field.type
  }

  // 字节序覆盖
  if (field.endian) {
    ksy.endian = field.endian
  }

  // 枚举
  if (field.enumName) {
    ksy.enum = field.enumName
  }

  // 条件
  if (field.condition) {
    ksy.if = field.condition
  }

  // 重复
  if (field.repeat) {
    ksy.repeat = field.repeat.mode
    if (field.repeat.mode === 'expr' && field.repeat.expr) {
      ksy['repeat-expr'] = field.repeat.expr
    }
    if (field.repeat.mode === 'until' && field.repeat.untilExpr) {
      ksy['repeat-until'] = field.repeat.untilExpr
    }
  }

  // 描述
  if (field.description) {
    ksy.doc = field.description
  }

  return ksy
}

/** 将枚举定义转换为 ksy 格式 */
function enumToKsy(enumDef: EnumDefinition): Record<number, string | { id: string; doc?: string }> {
  const result: Record<number, string | { id: string; doc?: string }> = {}
  for (const v of enumDef.values) {
    if (v.doc) {
      result[v.value] = { id: v.id, doc: v.doc }
    } else {
      result[v.value] = v.id
    }
  }
  return result
}

// ============================================================
// .ksy 解析
// ============================================================

/** 解析 .ksy YAML 字符串为协议模型 */
export function parseKsyFile(content: string): Protocol {
  const ksy = yaml.load(content) as any
  if (!ksy || !ksy.meta) {
    throw new Error('无效的 .ksy 文件：缺少 meta 段')
  }

  const protocol = createEmptyProtocol()

  // 解析 meta
  protocol.id = ksy.meta.id || 'imported_protocol'
  protocol.title = ksy.meta.title || ksy.meta.id || 'Imported Protocol'
  protocol.endian = ksy.meta.endian === 'le' ? 'le' : 'be'
  protocol.bitEndian = ksy.meta['bit-endian'] === 'le' ? 'le' : 'be'
  protocol.encoding = ksy.meta.encoding || 'UTF-8'

  // 解析 enums
  if (ksy.enums) {
    for (const [name, enumData] of Object.entries(ksy.enums)) {
      protocol.enums.set(name, parseKsyEnum(name, enumData as any))
    }
  }

  // 解析 types
  if (ksy.types) {
    for (const [name, typeData] of Object.entries(ksy.types)) {
      const typeObj = typeData as any
      if (typeObj.seq) {
        protocol.types.set(name, typeObj.seq.map((f: any) => parseKsyField(f, protocol)))
      }
    }
  }

  // 解析 seq
  if (ksy.seq) {
    protocol.fields = ksy.seq.map((f: any) => parseKsyField(f, protocol))
  }

  return protocol
}

/** 解析单个 ksy 字段 */
function parseKsyField(ksyField: any, protocol: Protocol): ProtocolField {
  const field: ProtocolField = {
    id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: ksyField.id || '',
    type: 'u1',
    size: 1,
  }

  // 固定内容
  if (ksyField.contents) {
    if (typeof ksyField.contents === 'string') {
      field.contents = Array.from(ksyField.contents as string).map((c: string) => c.charCodeAt(0))
    } else if (Array.isArray(ksyField.contents)) {
      field.contents = ksyField.contents
    }
    field.size = field.contents!.length
    field.type = 'bytes'
    return field
  }

  // 类型解析
  if (ksyField.type) {
    const typeStr = ksyField.type as string
    if (isBitType(typeStr as FieldType)) {
      field.type = typeStr as FieldType
      field.size = 0
    } else if (['u1', 'u2', 'u4', 'u8', 's1', 's2', 's4', 's8', 'f4', 'f8'].includes(typeStr)) {
      field.type = typeStr as FieldType
      field.size = FIELD_TYPE_BYTES[field.type]
    } else if (typeStr === 'str') {
      field.type = 'str'
      field.encoding = ksyField.encoding || 'UTF-8'
    } else if (typeStr === 'strz') {
      field.type = 'strz'
      field.encoding = ksyField.encoding || 'UTF-8'
    } else {
      // 自定义类型
      field.type = 'custom'
      field.customTypeName = typeStr
      // 如果有 types 定义，尝试展开子字段
      if (protocol.types.has(typeStr)) {
        field.children = protocol.types.get(typeStr)!.map(f => ({ ...f }))
      }
    }
  }

  // 大小
  if (ksyField.size !== undefined) {
    if (typeof ksyField.size === 'string') {
      field.sizeExpr = ksyField.size
      field.size = 0
    } else {
      field.size = ksyField.size
    }
  }

  if (ksyField['size-eos']) {
    field.sizeEos = true
  }

  // 字节序
  if (ksyField.endian) {
    field.endian = ksyField.endian
  }

  // 枚举
  if (ksyField.enum) {
    field.enumName = ksyField.enum
  }

  // 条件
  if (ksyField.if) {
    field.condition = ksyField.if
  }

  // 重复
  if (ksyField.repeat) {
    field.repeat = {
      mode: ksyField.repeat,
      expr: ksyField['repeat-expr']?.toString(),
      untilExpr: ksyField['repeat-until'],
    }
  }

  // 描述
  if (ksyField.doc) {
    field.description = ksyField.doc
  }

  return field
}

/** 解析枚举定义 */
function parseKsyEnum(name: string, data: Record<string, any>): EnumDefinition {
  const values: EnumValue[] = []
  for (const [key, val] of Object.entries(data)) {
    const numKey = parseInt(key, 10)
    if (typeof val === 'string') {
      values.push({ value: numKey, id: val })
    } else if (typeof val === 'object' && val.id) {
      values.push({ value: numKey, id: val.id, doc: val.doc })
    }
  }
  return { name, values }
}

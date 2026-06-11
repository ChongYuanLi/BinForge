/**
 * 协议数据模型
 * 对应一个 .ksy 文件的完整定义
 */

import type { ProtocolField, EnumDefinition } from './field'

/** 协议定义 */
export interface Protocol {
  id: string
  title: string
  endian: 'be' | 'le'
  bitEndian: 'be' | 'le'
  encoding: string
  fields: ProtocolField[]
  types: Map<string, ProtocolField[]>
  enums: Map<string, EnumDefinition>
}

/** 创建空协议 */
export function createEmptyProtocol(): Protocol {
  return {
    id: 'new_protocol',
    title: 'New Protocol',
    endian: 'be',
    bitEndian: 'be',
    encoding: 'UTF-8',
    fields: [],
    types: new Map(),
    enums: new Map(),
  }
}

/** 深拷贝协议 */
export function cloneProtocol(protocol: Protocol): Protocol {
  return {
    ...protocol,
    fields: JSON.parse(JSON.stringify(protocol.fields)),
    types: new Map(
      Array.from(protocol.types.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
    ),
    enums: new Map(
      Array.from(protocol.enums.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
    ),
  }
}

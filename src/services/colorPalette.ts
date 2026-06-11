/**
 * 字段颜色分配服务
 * 为每个字段分配可区分的半透明颜色
 */

// 调色板：HSL色相均匀分布，饱和度和亮度适中
// 每个颜色带 alpha 通道用于半透明覆盖
const PALETTE = [
  { bg: 'rgba(66, 133, 244, 0.25)',  border: '#4285f4', text: '#4285f4' },   // 蓝
  { bg: 'rgba(234, 67, 53, 0.25)',   border: '#ea4335', text: '#ea4335' },   // 红
  { bg: 'rgba(52, 168, 83, 0.25)',   border: '#34a853', text: '#34a853' },   // 绿
  { bg: 'rgba(251, 188, 4, 0.25)',   border: '#fbbc04', text: '#b08800' },   // 黄
  { bg: 'rgba(171, 71, 188, 0.25)',  border: '#ab47bc', text: '#ab47bc' },   // 紫
  { bg: 'rgba(255, 112, 67, 0.25)',  border: '#ff7043', text: '#ff7043' },   // 橙
  { bg: 'rgba(38, 198, 218, 0.25)',  border: '#26c6da', text: '#00838f' },   // 青
  { bg: 'rgba(239, 83, 80, 0.25)',   border: '#ef5350', text: '#ef5350' },   // 浅红
  { bg: 'rgba(126, 87, 194, 0.25)',  border: '#7e57c2', text: '#7e57c2' },   // 深紫
  { bg: 'rgba(77, 208, 225, 0.25)',  border: '#4dd0e1', text: '#00838f' },   // 天蓝
  { bg: 'rgba(156, 204, 101, 0.25)', border: '#9ccc65', text: '#558b2f' },   // 草绿
  { bg: 'rgba(255, 167, 38, 0.25)',  border: '#ffa726', text: '#e65100' },   // 深橙
  { bg: 'rgba(186, 104, 200, 0.25)', border: '#ba68c8', text: '#ba68c8' },   // 淡紫
  { bg: 'rgba(77, 182, 172, 0.25)',  border: '#4db6ac', text: '#00695c' },   // 蓝绿
  { bg: 'rgba(255, 138, 128, 0.25)', border: '#ff8a80', text: '#c62828' },   // 粉红
  { bg: 'rgba(129, 212, 250, 0.25)', border: '#81d4fa', text: '#0277bd' },   // 浅蓝
]

let colorIndex = 0

/** 重置颜色索引 */
export function resetColors(): void {
  colorIndex = 0
}

/** 获取下一个颜色 */
export function getNextColor(): { bg: string; border: string; text: string } {
  const color = PALETTE[colorIndex % PALETTE.length]
  colorIndex++
  return color
}

/** 根据字段ID获取颜色（稳定映射） */
export function getFieldColor(fieldId: string): { bg: string; border: string; text: string } {
  // 用 fieldId 的 hash 值来选择颜色，保证同一个字段总是同一颜色
  let hash = 0
  for (let i = 0; i < fieldId.length; i++) {
    hash = ((hash << 5) - hash) + fieldId.charCodeAt(i)
    hash |= 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

/** 预设颜色列表供外部使用 */
export const colors = PALETTE

# BinForge

可视化自定义协议编辑器，支持 Kaitai Struct 格式。

## 功能

- **字节位视图**：每字节一行，8 个 bit 格子，直观展示二进制数据
- **鼠标拖选**：左键拖选 bit 范围，支持跨字节选择
- **字段定义**：右键菜单快速创建字段，支持 u1/u2/u4/u8/s1-s8/f4/f8/b1-b16/str/bytes 等类型
- **跨字节 bit 字段**：支持跨字节的 bit 级字段定义（如 byte0 的 b0~b4 + byte1 的 b5~b7）
- **字段颜色覆盖**：半透明彩色背景标记字段占位，字段列表与字节视图双向高亮联动
- **属性编辑**：编辑字段名称、类型、大小、字节序、枚举、描述
- **.ksy 导入/导出**：基于 Kaitai Struct 标准格式，可直接对接 Kaitai 生态工具
- **二进制数据导入**：导入 .bin/.dat 等二进制文件进行解析
- **撤销/重做**：完整的编辑历史

## 技术栈

- **前端**：Vue 3 + TypeScript + Pinia
- **桌面**：Tauri 2.x (Rust + 系统 WebView2)
- **协议格式**：Kaitai Struct (.ksy)

## 开发

```bash
# 安装依赖
npm install

# 浏览器开发模式
npm run dev

# Tauri 桌面开发模式（热更新）
npm run tauri:dev

# 构建 Vue 前端
npm run build

# 构建桌面应用 exe
npm run tauri:build
```

## 项目结构

```
BinForge/
├── src/                          # Vue 前端源码
│   ├── models/                   # 数据模型
│   │   ├── field.ts              #   字段定义 (FieldType, ProtocolField, FieldOverlay)
│   │   └── protocol.ts           #   协议定义 (Protocol, createEmptyProtocol)
│   ├── stores/                   # Pinia 状态管理
│   │   ├── protocol.ts           #   协议状态 (字段增删改, 撤销重做)
│   │   ├── selection.ts          #   选择状态 (拖选, 字段选中, 高亮联动)
│   │   └── byteView.ts           #   字节视图状态 (二进制数据, 字段覆盖计算)
│   ├── services/                 # 业务服务
│   │   ├── ksyGenerator.ts       #   .ksy 生成器 + 解析器 (协议模型 ↔ YAML 互转)
│   │   └── colorPalette.ts       #   字段颜色分配 (16色调色板, hash 稳定映射)
│   ├── components/               # Vue 组件
│   │   ├── ByteView/             #   字节位视图
│   │   │   ├── BitCell.vue       #     单个位格子 (显示 0/1, 拖选, 字段颜色覆盖)
│   │   │   ├── ByteRow.vue       #     一行 = 1 字节 = 8 位
│   │   │   ├── ByteGrid.vue      #     字节网格容器
│   │   │   ├── FieldOverlayBar.vue #   字段标签条
│   │   │   └── ContextMenu.vue   #     右键菜单 (新建/快速类型/设置值/删除)
│   │   ├── FieldList/            #   左侧字段列表
│   │   │   ├── FieldTree.vue     #     字段树
│   │   │   └── FieldItem.vue     #     字段项 (颜色标识, 类型, 范围)
│   │   ├── PropertyPanel/        #   底部属性面板
│   │   │   └── FieldEditor.vue   #     字段属性编辑器
│   │   └── Toolbar/              #   顶部工具栏
│   │       └── MainToolbar.vue   #     新建/导入导出.ksy/导入数据/撤销重做
│   ├── App.vue                   # 主布局
│   └── main.ts                   # 入口
├── src-tauri/                    # Tauri (Rust) 桌面壳
│   ├── src/
│   │   ├── main.rs               #   Windows 入口
│   │   └── lib.rs                #   Tauri 应用初始化
│   ├── tauri.conf.json           #   Tauri 配置
│   └── Cargo.toml                #   Rust 依赖
├── index.html                    # HTML 入口
├── vite.config.ts                # Vite 配置
├── package.json                  # Node 依赖和脚本
└── tsconfig.json                 # TypeScript 配置
```

## 交互说明

| 操作 | 效果 |
|---|---|
| 左键拖选 bit | 选中 bit 范围，用于创建字段 |
| 右键点击 | 弹出菜单：新建字段 / 快速设置类型 / 设置字节值 / 删除字段 |
| 左键点击已有字段 | 选中该字段，底部显示属性编辑面板 |
| 左键列表中的字段 | 字节视图高亮对应区域 |
| Ctrl+Z / Ctrl+Y | 撤销 / 重做 |

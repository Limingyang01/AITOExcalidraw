# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## 项目概述

AI + Excalidraw 手绘风格绘图工具，通过 AI 对话生成 Excalidraw 图形，支持流式输出和实时渲染。

## 技术架构

- **Next.js 15.5.12** (App Router) - 全栈框架
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **@excalidraw/excalidraw** - 手绘风格画板
- **OpenAI SDK** - AI 服务（兼容智谱、阿里百炼）
- **Winston** - 日志服务

## 目录结构

```
src/
├── app/
│   ├── page.tsx           # 主页面
│   ├── layout.tsx         # 布局
│   ├── globals.css        # 全局样式
│   └── api/chat/route.ts  # AI 对话 API
├── components/
│   ├── Canvas.tsx         # Excalidraw 画布
│   ├── ChatPanel.tsx      # AI 对话面板
│   └── Header.tsx         # 顶部导航
├── services/
│   ├── aiService.ts       # AI 服务入口
│   ├── logger.ts          # 日志服务
│   └── aiProviders/       # AI 提供商兼容层
│       ├── index.ts       # 统一接口
│       ├── openai.ts     # OpenAI 实现
│       ├── zhipu.ts      # 智谱实现
│       └── aliyun.ts     # 阿里百炼实现
├── utils/
│   ├── jsonParser.ts      # 流式 JSON 解析器
│   ├── elementDefaults.ts # 元素默认字段补全
│   └── storage.ts         # localStorage 存储
└── types/index.ts         # TypeScript 类型定义
```

## 核心功能

| 功能 | 状态 |
|------|------|
| Excalidraw 画板集成 | ✅ |
| AI 对话生成图形 | ✅ |
| 流式输出 + 实时渲染 | ✅ |
| 多 AI 提供商支持 | ✅ |
| localStorage 持久化 | ✅ |
| 请求日志记录 | ✅ |

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEFAULT_PROVIDER` | 默认 AI 提供商 |
| `OPENAI_API_KEY` | OpenAI API Key |
| `ZHIPU_API_KEY` | 智谱 API Key |
| `ALIYUN_API_KEY` | 阿里百炼 API Key |
| `ALIYUN_BASE_URL` | 阿里百炼 Base URL |

## 核心模块

### AI 服务层 (`src/services/`)

- `aiService.ts` - 统一的 AI 服务入口，构建消息并调用提供商
- `aiProviders/` - 抽象的 AI 提供商接口，支持 OpenAI、智谱、阿里百炼

### 流式解析器 (`src/utils/jsonParser.ts`)

逐字符处理 AI 流式输出：
- 维护花括号嵌套计数
- 检测字符串内的花括号（跳过）
- 识别完整的 JSON 对象后立即返回

### 元素补全 (`src/utils/elementDefaults.ts`)

为 AI 生成的元素补全 Excalidraw 必需字段：
- `id`, `version`, `versionNonce`
- `seed`, `isDeleted`, `boundElements`
- 样式字段、箭头/文字特定字段

## 编码规范

- 使用 TypeScript，保持类型安全
- 组件分离：Canvas、ChatPanel、Header
- 服务层分离：AI 服务、日志、存储
- 使用 `any` 类型处理 Excalidraw 复杂类型（因官方类型定义变更频繁）

## API 路由

### POST /api/chat

请求：
```json
{
  "messages": [
    { "role": "user", "content": "画一个圆形" }
  ]
}
```

响应：SSE 流式输出

请求头：
- `x-ai-provider`: AI 提供商类型 (openai/zhipu/aliyun)

## 数据持久化

- **localStorage**:
  - `chatHistory` - 对话历史
  - `excalidrawData` - 画布数据


## 文档维护规则

**重要**：每次代码改动后，必须同步更新项目文档：

1. **PROJECT.md** - 项目功能清单、技术细节、版本历史

更新 PROJECT.md 时，确保：
- 功能状态栏更新（✅已完成 / ⚠️部分 / ⏳进行中）
- 版本历史记录本次改动
- 技术实现细节与代码保持一致

## 常用命令

```bash
npm run dev    # 开发服务器
npm run build  # 生产构建
npm run start  # 生产运行
```

# AI + Excalidraw 手绘绘图工具

智谱 AI / OpenAI / 阿里百炼 + Excalidraw 手绘风格画板，通过自然语言对话生成图形。

## 功能清单

| 功能 | 状态 |
|------|------|
| Excalidraw 画板集成 | ✅ 已完成 |
| AI 对话生成图形 | ✅ 已完成 |
| 流式输出 + 实时渲染 | ✅ 已完成 |
| 多 AI 提供商支持 | ✅ 已完成 |
| localStorage 画布持久化 | ✅ 已完成 |
| IndexedDB 对话历史持久化 | ✅ 已完成 |
| 请求日志记录 | ✅ 已完成 |
| SSE 流式传输 | ✅ 已完成 |
| 画布元素管理 | ✅ 已完成 |
| 工作空间（多项目管理） | ✅ 已完成 |

## 技术实现

### 技术栈

- **前端框架**: Next.js 15.5.12 (App Router) + React 19
- **类型系统**: TypeScript
- **样式框架**: Tailwind CSS + Ant Design
- **画板库**: @excalidraw/excalidraw
- **AI 服务**: OpenAI SDK (兼容智谱、阿里百炼)
- **日志服务**: Winston

### 核心模块

| 模块 | 路径 | 说明 |
|------|------|------|
| AI 服务入口 | `src/services/aiService.ts` | 统一消息构建，调用提供商 |
| AI 提供商兼容层 | `src/services/aiProviders/` | OpenAI / 智谱 / 阿里百炼 |
| 流式 JSON 解析器 | `src/utils/jsonParser.ts` | 逐字符解析，处理嵌套和字符串内花括号 |
| 元素默认字段补全 | `src/utils/elementDefaults.ts` | 补全 Excalidraw 必需字段 |
| 画布组件 | `src/components/Canvas.tsx` | Excalidraw 集成 |
| 对话面板 | `src/components/ChatPanel.tsx` | AI 对话 + 消息渲染 |
| API 路由 | `src/app/api/chat/route.ts` | 服务端 AI 调用 + 日志记录 |

### API 设计

**POST /api/chat**

请求头:
- `x-ai-provider`: `openai` | `zhipu` | `aliyun`

请求体:
```json
{
  "messages": [
    { "role": "user", "content": "画一个圆形" }
  ]
}
```

响应: SSE 流式输出，逐个 JSON 元素返回

### 数据持久化

| 数据 | 存储方式 | 键名 |
|------|----------|------|
| 对话历史 | IndexedDB | `chatHistory` |
| 项目管理 | IndexedDB | `projects` |
| 画布数据 | localStorage | `excalidrawData` |

### 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `DEFAULT_PROVIDER` | 默认 AI 提供商 | 是 |
| `OPENAI_API_KEY` | OpenAI API Key | 否 |
| `ZHIPU_API_KEY` | 智谱 API Key | 否 |
| `ALIYUN_API_KEY` | 阿里百炼 API Key | 否 |
| `ALIYUN_BASE_URL` | 阿里百炼 Base URL | 否 |

## AI 绘图提示词设计

System Prompt 核心要点：
- 输出格式：纯 JSON 数组，禁止代码块标记
- 形状元素使用 `type: "rectangle" | "ellipse" | "diamond" | "arrow"`
- 文字元素使用 `type: "text"`，支持中英文宽度计算
- 箭头使用 `type: "arrow"`，points 为相对坐标数组
- 颜色使用 Excalidraw 内置调色板
- 每个元素必须补全 id、version、versionNonce、seed 等字段

## 版本历史

- v1.0.0: 初始版本
- v1.0.1: 修复 React key 重复问题，使用 generateMessageId() 生成唯一 ID
- v1.0.2: 修复对话历史持久化问题，使用 IndexedDB 存储
- v1.0.3: 改进流式 JSON 解析器，添加备选解析方案和 flush 方法
- v1.0.4: 修复对话聊天占位问题
- v1.0.5: 解决流式绘制 bug
- v1.0.6: 修复 logo size warning bug
- v1.0.7: 修复 AI 对话占位数据异常问题
- v1.1.0: 新增工作空间功能，支持多项目管理（创建/编辑/删除项目）
- v1.1.1: 首页直接作为工作空间页面，UI 样式与详情页保持一致
- v1.2.0: UI 组件库从 shadcn/ui 切换为 Ant Design

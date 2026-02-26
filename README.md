# AI Excalidraw

通过 AI 对话生成 Excalidraw 手绘风格图形的 Web 应用。

## 功能特性

- 🎨 **Excalidraw 画板** - 纯手绘风格图形
- 🤖 **AI 绘图** - 通过对话描述生成图形
- ⚡ **流式渲染** - 实时显示 AI 生成的图形
- 🔄 **多提供商支持** - OpenAI、智谱 AI、阿里百炼
- 💾 **数据持久化** - 对话历史和画布数据保存在本地

## 技术栈

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS
- @excalidraw/excalidraw
- OpenAI SDK

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.local.example .env.local
```

编辑 `.env.local`，填入你的 API Key：

```env
# 默认 AI 提供商 (openai | zhipu | aliyun)
DEFAULT_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# 智谱 AI (可选)
ZHIPU_API_KEY=your-zhipu-api-key

# 阿里百炼 (可选)
ALIYUN_API_KEY=your-aliyun-api-key
ALIYUN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 使用方法

1. 在对话框中描述你想画的图形，例如：
   - "画一个圆形"
   - "画一个业务流程图，包含开始、审批、结束三个节点"
   - "画一个数据库架构图"

2. AI 会生成对应的 Excalidraw 图形元素

3. 图形会实时显示在画布上

4. 你可以：
   - 切换 AI 提供商
   - 编辑和移动图形元素
   - 导出图片

## 项目结构

```
src/
├── app/
│   ├── page.tsx           # 主页面
│   ├── layout.tsx         # 布局
│   ├── globals.css        # 全局样式
│   └── api/chat/route.ts  # AI 对话 API
├── components/
│   ├── Canvas.tsx         # Excalidraw 画布组件
│   ├── ChatPanel.tsx      # AI 对话面板
│   └── Header.tsx         # 顶部导航
├── services/
│   ├── aiService.ts       # AI 服务
│   ├── logger.ts         # 日志服务
│   └── aiProviders/      # AI 提供商兼容层
├── utils/
│   ├── jsonParser.ts     # 流式 JSON 解析器
│   ├── elementDefaults.ts # 元素默认字段补全
│   └── storage.ts        # localStorage 存储
└── types/
    └── index.ts          # TypeScript 类型
```

## API

### POST /api/chat

发送对话请求，获取流式响应。

**请求：**
```json
{
  "messages": [
    { "role": "user", "content": "画一个圆形" }
  ]
}
```

**请求头：**
- `x-ai-provider`: AI 提供商 (openai/zhipu/aliyun)

**响应：** SSE 流式输出

## 日志

请求日志保存在 `logs/` 目录，包含：
- IP 地址
- User-Agent
- 对话内容
- 响应时间
- 错误信息

## 许可证

MIT

import OpenAI from 'openai';
import { Message } from '@/types';

const DEFAULT_SYSTEM_PROMPT = `你是一个 Excalidraw 图表生成助手。

请根据用户的描述生成 Excalidraw 图形元素。

## 输出格式要求
- 只输出纯 JSON 数组，不要输出任何解释、代码块标记或 markdown 格式
- 每个元素必须包含以下字段：type, x, y, width, height, strokeColor, backgroundColor, fillStyle, strokeWidth, roughness, opacity
- 颜色使用 Excalidraw 内置调色板，例如：#000000, #e1e1e1, #fab005, #fa5252, #fd7e14, #40c057, #228be6, #7950f2, #be4bdb, #f783ac

## 常用元素类型
- rectangle: 矩形
- ellipse: 椭圆/圆形
- diamond: 菱形
- arrow: 箭头（需要 points 数组表示折线）
- text: 文字

## 箭头格式
points 是相对坐标数组，例如：[[0, 0], [50, 0], [50, 50], [100, 50]]
x 和 y 是起点的坐标

## 文字处理
- 中文使用中文字体，英文使用英文
- 文字内容放在 text 字段

## 示例输出
[{"type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 100, "strokeColor": "#000000", "backgroundColor": "#ffffff", "fillStyle": "hachure", "strokeWidth": 2, "roughness": 1, "opacity": 100}]

请直接输出 JSON，不要输出任何其他内容。`;

// 从环境变量获取配置（参考 Server 的 settings.ts）
const config = {
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1',
  model: process.env.DEFAULT_MODEL || 'deepseek-chat',
  temperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7'),
};

function createClient(): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

export async function* createChatStream(
  messages: Message[]
): AsyncGenerator<string, void, unknown> {
  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY 未配置');
  }

  const client = createClient();

  // 构建完整的消息列表，包含 system prompt
  const fullMessages: Message[] = [
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
    ...messages,
  ];

  const stream = await client.chat.completions.create({
    model: config.model,
    messages: fullMessages,
    temperature: config.temperature,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

export { config };

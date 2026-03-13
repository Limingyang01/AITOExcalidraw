帮我实现一个 AI + Excalidraw 手绘风格绘图工具，具体要求如下：

## 一、功能需求
1. 集成 Excalidraw 画板，参考官方文档：https://docs.excalidraw.com/docs/@excalidraw/excalidraw/integration
2. 通过 AI 对话生成 Excalidraw JSON 格式的图形元素
3. 流式输出 + 实时渲染：每解析到一个完整的 JSON 元素就立即渲染到画布

## 二、后端要求
1. AI 调用在服务端进行，不暴露 API 密钥
2. 记录每次对话的 IP、User-Agent、对话内容、响应时间等信息
3. 支持灵活切换各家 AI 服务（OpenAI、智谱、阿里百炼等），封装统一的兼容层

## 三、前端要求
1. 对话历史保存在 IndexedDB（通过 chatDb.ts），不依赖后端加载
2. 画布数据也保存在 localStorage，刷新不丢失
3. 流式解析 AI 返回的 JSON 元素，处理嵌套和字符串内的花括号
4. 为 AI 生成的元素补全 Excalidraw 必需的默认字段

## 四、代码质量
1. 组件封装：AI 服务层、流式解析器、画布组件、对话组件分离
2. 类型安全：使用 TypeScript，定义完整的类型
3. 可复用：AI 服务封装成可配置的模块

## 五、AI 绘图提示词要点
需要设计一个 System Prompt，包含：
- 输出格式：纯 JSON，禁止代码块，方便流式解析
- 文字处理：中英文宽度计算、形状内文字双向绑定
- 箭头规范：points 相对坐标写法
- 常用颜色：Excalidraw 内置调色板

## 六、版本历史
- v1.0.0: 初始版本
- v1.0.1: 修复 React key 重复问题，使用 generateMessageId() 生成唯一 ID
- v1.0.2: 修复对话历史持久化问题，使用 IndexedDB 存储
- v1.0.3: 改进流式 JSON 解析器，添加备选解析方案和 flush 方法

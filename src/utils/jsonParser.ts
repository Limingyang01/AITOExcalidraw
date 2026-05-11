// 使用 any 类型来处理 Excalidraw 元素的复杂性
type ExcalidrawElementLike = Record<string, unknown>;

/**
 * 流式 JSON 解析器 v6 - 完整解析方案
 *
 * 核心思路：
 * 1. 遇到数组开始 [ 后，设置 foundArrayStart=true
 * 2. 用两个独立的计数器追踪 { 和 [ 的嵌套深度
 * 3. 当 braceDepth 从 1 降到 0 时，表示一个完整对象结束
 * 4. 当 braceDepth=0 且 bracketDepth=0 时遇到 ]，表示数组结束
 * 5. 字符串内容被完全跳过，不会影响括号计数
 *
 * 边界情况处理：
 * - 嵌套数组 [[0,0]] - bracketDepth 追踪，不影响 braceDepth
 * - 字符串中的 "}]" - inString 跳过所有特殊字符
 * - 转义 \" - escapeNext 正确处理
 * - 尾随逗号 - 解析前清理
 */
export class StreamingJSONParser {
  private buffer = '';
  private inString = false;
  private escapeNext = false;
  private braceDepth = 0;     // {} 深度
  private bracketDepth = 0;   // [] 深度
  private foundArrayStart = false;
  private processedIds = new Set<string>();

  processChunk(chunk: string): ExcalidrawElementLike[] {
    const newElements: ExcalidrawElementLike[] = [];

    for (const char of chunk) {
      const element = this.processChar(char);
      if (element) {
        newElements.push(element);
      }
    }

    return newElements;
  }

  private processChar(char: string): ExcalidrawElementLike | null {
    // 1. 转义处理
    if (this.escapeNext) {
      this.buffer += char;
      this.escapeNext = false;
      return null;
    }

    // 2. 转义符
    if (char === '\\' && this.inString) {
      this.buffer += char;
      this.escapeNext = true;
      return null;
    }

    // 3. 字符串开始/结束
    if (char === '"') {
      this.inString = !this.inString;
      this.buffer += char;
      return null;
    }

    // 4. 在字符串内，跳过所有特殊字符
    if (this.inString) {
      this.buffer += char;
      return null;
    }

    // 5. 数组开始 [
    if (char === '[') {
      // 只有顶级数组（braceDepth 和 bracketDepth 都为 0）才设置 foundArrayStart
      if (this.braceDepth === 0 && this.bracketDepth === 0) {
        this.foundArrayStart = true;
      }
      this.bracketDepth++;
      this.buffer += char;
      return null;
    }

    // 6. 数组结束 ]
    if (char === ']') {
      this.buffer += char;
      this.bracketDepth--;

      // 顶级数组结束：braceDepth=0 且 bracketDepth=0
      if (this.braceDepth === 0 && this.bracketDepth === 0 && this.foundArrayStart) {
        const result = this.tryParseArray();
        if (result) {
          this.reset();
          return result;
        }
      }
      return null;
    }

    // 7. 对象开始 {
    if (char === '{') {
      this.braceDepth++;
      this.buffer += char;
      return null;
    }

    // 8. 对象结束 }
    if (char === '}') {
      this.buffer += char;
      const depthBefore = this.braceDepth;
      this.braceDepth--;

      // 当 braceDepth 从 1 降到 0，且在数组内，表示完整对象结束
      if (depthBefore === 1 && this.foundArrayStart) {
        const result = this.extractLastObject();
        if (result) {
          return result;
        }
      }
      return null;
    }

    // 9. 其他字符
    this.buffer += char;
    return null;
  }

  /**
   * 从 buffer 末尾提取最后一个完整的 JSON 对象
   */
  private extractLastObject(): ExcalidrawElementLike | null {
    const lastBrace = this.buffer.lastIndexOf('{');
    if (lastBrace < 0) return null;

    const objStr = this.buffer.slice(lastBrace);
    if (!objStr.includes('}')) return null;

    try {
      let cleaned = objStr.trim();
      // 清理尾随逗号
      cleaned = cleaned.replace(/,\s*$/, '');

      const parsed = JSON.parse(cleaned);

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // 无 id 则自动生成
        if (!('id' in parsed)) {
          (parsed as Record<string, unknown>).id = `auto-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
        // 移除已解析的对象，保留后续内容
        this.buffer = this.buffer.slice(0, lastBrace);
        return parsed as ExcalidrawElementLike;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 尝试解析整个数组
   */
  private tryParseArray(): ExcalidrawElementLike | null {
    try {
      let cleaned = this.buffer.trim();
      // 清理尾随逗号
      cleaned = cleaned.replace(/,\s*\]/g, ']');

      if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) return null;

      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { __isArray: true, elements: parsed } as ExcalidrawElementLike;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 流结束时刷新缓冲区
   */
  flush(): ExcalidrawElementLike[] {
    const newElements: ExcalidrawElementLike[] = [];

    if (this.buffer.length > 0 && this.foundArrayStart) {
      const result = this.tryParseArray();
      if (result && typeof result === 'object' && '__isArray' in result) {
        for (const el of result.elements as ExcalidrawElementLike[]) {
          if (!('id' in el)) {
            (el as Record<string, unknown>).id = `auto-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          }
          if (!this.processedIds.has(String(el.id))) {
            this.processedIds.add(String(el.id));
            newElements.push(el);
          }
        }
      }
    }

    this.reset();
    return newElements;
  }

  reset(): void {
    this.buffer = '';
    this.inString = false;
    this.escapeNext = false;
    this.braceDepth = 0;
    this.bracketDepth = 0;
    this.foundArrayStart = false;
  }
}

export function extractJSON(text: string): ExcalidrawElementLike[] {
  const parser = new StreamingJSONParser();
  return parser.processChunk(text);
}
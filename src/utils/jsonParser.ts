// 使用 any 类型来处理 Excalidraw 元素的复杂性
type ExcalidrawElementLike = Record<string, unknown>;

interface ParseState {
  buffer: string;
  inString: boolean;
  escapeNext: boolean;
  braceDepth: number;
  foundArrayStart: boolean;
}

/**
 * 流式 JSON 解析器
 * 逐字符处理 AI 输出，支持逐个提取 JSON 对象
 */
export class StreamingJSONParser {
  private state: ParseState = {
    buffer: '',
    inString: false,
    escapeNext: false,
    braceDepth: 0,
    foundArrayStart: false,
  };

  private processedIds = new Set<string>();

  /**
   * 处理新的流式数据块
   * @param chunk 新接收的数据块
   * @returns 新发现的完整元素数组（逐个返回）
   */
  processChunk(chunk: string): ExcalidrawElementLike[] {
    const newElements: ExcalidrawElementLike[] = [];

    for (const char of chunk) {
      const result = this.processChar(char);

      // 当找到一个完整的对象时
      if (result && typeof result === 'object' && 'id' in result) {
        const id = String(result.id);
        // 检查是否已处理过
        if (!this.processedIds.has(id)) {
          this.processedIds.add(id);
          newElements.push(result);
        }
        // 重置 buffer 继续解析下一个对象
        this.state.buffer = '';
        this.state.braceDepth = 0;
      }
    }

    return newElements;
  }

  /**
   * 处理单个字符
   * @returns 如果找到完整对象则返回该对象，否则返回 null
   */
  private processChar(char: string): ExcalidrawElementLike | null {
    // 处理转义字符
    if (this.state.escapeNext) {
      this.state.buffer += char;
      this.state.escapeNext = false;
      return null;
    }

    // 处理转义
    if (char === '\\' && this.state.inString) {
      this.state.buffer += char;
      this.state.escapeNext = true;
      return null;
    }

    // 处理字符串开始/结束
    if (char === '"') {
      this.state.inString = !this.state.inString;
      this.state.buffer += char;
      return null;
    }

    // 在字符串内，直接添加字符
    if (this.state.inString) {
      this.state.buffer += char;
      return null;
    }

    // 处理数组开始
    if (char === '[') {
      if (!this.state.foundArrayStart) {
        this.state.foundArrayStart = true;
      }
      this.state.buffer += char;
      return null;
    }

    // 处理对象开始
    if (char === '{') {
      this.state.braceDepth++;
      this.state.buffer += char;
      return null;
    }

    // 处理对象结束
    if (char === '}') {
      this.state.braceDepth--;
      this.state.buffer += char;

      // 如果找到了完整对象
      if (this.state.braceDepth === 0 && this.state.foundArrayStart) {
        return this.tryParseObject(this.state.buffer);
      }
      return null;
    }

    // 其他字符
    this.state.buffer += char;
    return null;
  }

  /**
   * 尝试解析单个对象
   */
  private tryParseObject(jsonString: string): ExcalidrawElementLike | null {
    try {
      // 清理可能的尾随逗号
      const cleaned = jsonString.replace(/,\s*([\]}])/g, '$1');
      const parsed = JSON.parse(cleaned);

      // 如果是单个对象
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as ExcalidrawElementLike;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 获取所有已解析的元素
   */
  getAllElements(): ExcalidrawElementLike[] {
    return [];
  }

  /**
   * 重置解析器状态
   */
  reset(): void {
    this.state = {
      buffer: '',
      inString: false,
      escapeNext: false,
      braceDepth: 0,
      foundArrayStart: false,
    };
    this.processedIds.clear();
  }
}

/**
 * 便捷函数：从文本中提取 JSON 对象
 */
export function extractJSON(text: string): ExcalidrawElementLike[] {
  const parser = new StreamingJSONParser();
  return parser.processChunk(text);
}

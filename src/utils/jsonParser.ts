// 使用 any 类型来处理 Excalidraw 元素的复杂性
type ExcalidrawElementLike = Record<string, unknown>;

interface ParseState {
  buffer: string;
  inString: boolean;
  escapeNext: boolean;
  braceStack: number;
  arrayDepth: number;
  foundArrayStart: boolean;
}

/**
 * 流式 JSON 解析器
 * 逐字符处理 AI 输出，维护花括号嵌套计数
 * 识别字符串内的花括号并跳过
 */
export class StreamingJSONParser {
  private state: ParseState = {
    buffer: '',
    inString: false,
    escapeNext: false,
    braceStack: 0,
    arrayDepth: 0,
    foundArrayStart: false,
  };

  private completeElements: ExcalidrawElementLike[] = [];

  /**
   * 处理新的流式数据块
   * @param chunk 新接收的数据块
   * @returns 新发现的完整元素数组
   */
  processChunk(chunk: string): ExcalidrawElementLike[] {
    const newElements: ExcalidrawElementLike[] = [];

    for (const char of chunk) {
      this.processChar(char);

      // 检查是否找到了完整的数组
      if (
        this.state.foundArrayStart &&
        this.state.braceStack === 0 &&
        this.state.arrayDepth === 0 &&
        this.state.buffer.length > 0
      ) {
        // 尝试解析完整数组
        const elements = this.tryParseElements(this.state.buffer);
        if (elements.length > 0) {
          const newOnes = elements.filter(
            (e) => !this.completeElements.some((ce) => (ce.id as string) === (e.id as string))
          );
          this.completeElements.push(...newOnes);
          newElements.push(...newOnes);
          this.state.buffer = '';
        }
      }
    }

    return newElements;
  }

  /**
   * 处理单个字符
   */
  private processChar(char: string): void {
    // 处理转义字符
    if (this.state.escapeNext) {
      this.state.buffer += char;
      this.state.escapeNext = false;
      return;
    }

    // 处理转义
    if (char === '\\' && this.state.inString) {
      this.state.buffer += char;
      this.state.escapeNext = true;
      return;
    }

    // 处理字符串开始/结束
    if (char === '"') {
      this.state.inString = !this.state.inString;
      this.state.buffer += char;
      return;
    }

    // 在字符串内，直接添加字符
    if (this.state.inString) {
      this.state.buffer += char;
      return;
    }

    // 处理数组开始
    if (char === '[') {
      if (!this.state.foundArrayStart) {
        this.state.foundArrayStart = true;
        this.state.arrayDepth = 1;
      } else {
        this.state.arrayDepth++;
      }
      this.state.buffer += char;
      return;
    }

    // 处理数组结束
    if (char === ']') {
      this.state.arrayDepth--;
      this.state.buffer += char;
      return;
    }

    // 处理对象开始
    if (char === '{') {
      this.state.braceStack++;
      this.state.buffer += char;
      return;
    }

    // 处理对象结束
    if (char === '}') {
      this.state.braceStack--;
      this.state.buffer += char;
      return;
    }

    // 其他字符
    this.state.buffer += char;
  }

  /**
   * 尝试解析元素数组
   */
  private tryParseElements(jsonString: string): ExcalidrawElementLike[] {
    try {
      // 清理可能的尾随逗号
      const cleaned = jsonString.replace(/,\s*([\]\}])/g, '$1');
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * 获取所有已解析的元素
   */
  getAllElements(): ExcalidrawElementLike[] {
    return [...this.completeElements];
  }

  /**
   * 重置解析器状态
   */
  reset(): void {
    this.state = {
      buffer: '',
      inString: false,
      escapeNext: false,
      braceStack: 0,
      arrayDepth: 0,
      foundArrayStart: false,
    };
    this.completeElements = [];
  }
}

/**
 * 便捷函数：从文本中提取 JSON 数组
 */
export function extractJSON(text: string): ExcalidrawElementLike[] {
  const parser = new StreamingJSONParser();
  return parser.processChunk(text);
}

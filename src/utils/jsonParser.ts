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

    // 首先尝试字符解析
    for (const char of chunk) {
      const result = this.processChar(char);
      // 更详细的日志
      if (char === '[' || char === '{' || char === '}' || char === ']') {
        console.log('[Parser] char:', char, 'buffer:', this.state.buffer.slice(-30), 'braceDepth:', this.state.braceDepth, 'foundArrayStart:', this.state.foundArrayStart);
      }

      // 当找到一个完整的数组时
      if (result && typeof result === 'object' && '__isArray' in result) {
        const elements = result.elements as ExcalidrawElementLike[];
        for (const el of elements) {
          if (el && typeof el === 'object') {
            // 如果元素有 id，则检查是否已处理；否则直接添加（让 completeElementDefaults 生成 id）
            if ('id' in el) {
              const id = String(el.id);
              if (!this.processedIds.has(id)) {
                this.processedIds.add(id);
                newElements.push(el);
              }
            } else {
              // 没有 id 的元素直接添加
              newElements.push(el);
            }
          }
        }
        // 重置 buffer
        this.state.buffer = '';
        this.state.braceDepth = 0;
        this.state.foundArrayStart = false;
        continue;
      }

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

    // 备选方案：始终尝试从累积的缓冲区提取 JSON（不只是当前 chunk）
    const extracted = this.extractJSONFromText(this.state.buffer);
    for (const el of extracted) {
      if (el && typeof el === 'object') {
        if ('id' in el) {
          const id = String(el.id);
          if (!this.processedIds.has(id)) {
            this.processedIds.add(id);
            newElements.push(el);
          }
        } else {
          newElements.push(el);
        }
      }
    }

    if (newElements.length > 0) {
      console.log('[Parser] 从缓冲区提取到元素:', newElements.length, newElements.map(e => ({ type: e.type, text: e.text })));
      // 成功提取后清空部分缓冲区（保留未处理的部分）
      const lastPos = this.state.buffer.lastIndexOf(']');
      if (lastPos > 0) {
        this.state.buffer = this.state.buffer.slice(lastPos + 1);
      }
    }

    return newElements;
  }

  /**
   * 从文本中提取 JSON 数组（更积极的匹配）
   */
  private extractJSONFromText(text: string): ExcalidrawElementLike[] {
    if (!text || text.length < 5) return [];

    // 策略1: 尝试直接解析整个文本（如果是完整数组）
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('[Parser] 直接解析成功');
        return parsed;
      }
    } catch {
      // 不是完整数组
    }

    // 策略2: 贪心匹配整个 [...] 区块
    const arrayMatch = text.match(/\[[\s\S]+\]/);
    if (arrayMatch) {
      try {
        const parsed = JSON.parse(arrayMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('[Parser] 贪心匹配成功');
          return parsed;
        }
      } catch {
        // 解析失败
      }
    }

    // 策略3: 查找多个可能的数组
    const matches = text.matchAll(/\[[\s\S]*?\]/g);
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 检查是否是有效的元素数组（包含 type 字段）
          if (parsed[0] && typeof parsed[0] === 'object' && 'type' in parsed[0]) {
            console.log('[Parser] 多重匹配成功');
            return parsed;
          }
        }
      } catch {
        continue;
      }
    }

    return [];
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

      console.log('[Parser] 触发 } 解析检查: braceDepth=', this.state.braceDepth, 'foundArrayStart=', this.state.foundArrayStart);

      // 如果找到了完整对象，立即返回进行流式渲染
      if (this.state.braceDepth === 0 && this.state.foundArrayStart) {
        console.log('[Parser] 尝试解析完整对象, buffer:', this.state.buffer);
        const result = this.tryParseObject(this.state.buffer);
        if (result) {
          console.log('[Parser] 解析成功，返回对象:', result);
          // 重置 buffer 但不重置 foundArrayStart，以便继续解析后续对象
          this.state.buffer = '';
          this.state.braceDepth = 0;
          return result;
        }
        // 解析失败，不清空 buffer，继续累积（可能是跨块的数据）
        console.log('[Parser] 解析失败，保留 buffer 继续累积');
      }
      return null;
    }

    // 处理数组结束（如果上面没有返回，说明是整个数组结束）
    if (char === ']') {
      this.state.buffer += char;
      console.log('[Parser] 触发 ] 解析检查: buffer length=', this.state.buffer.length);

      // 尝试解析整个数组（用于处理没有及时返回的情况）
      if (this.state.foundArrayStart && this.state.buffer.length > 0) {
        const result = this.tryParseArray(this.state.buffer);
        if (result) {
          console.log('[Parser] 数组解析成功');
          // 重置状态
          this.state.buffer = '';
          this.state.braceDepth = 0;
          this.state.foundArrayStart = false;
          return result;
        }
        console.log('[Parser] 数组解析失败，保留 buffer');
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
    console.log('[Parser] tryParseObject called with:', jsonString.substring(0, 100));
    try {
      // 清理可能的尾随逗号
      const cleaned = jsonString.replace(/,\s*([\]}])/g, '$1');
      const parsed = JSON.parse(cleaned);
      console.log('[Parser] parsed successfully:', parsed);

      // 如果是单个对象
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as ExcalidrawElementLike;
      }
      return null;
    } catch (e) {
      console.log('[Parser] parse failed:', e);
      return null;
    }
  }

  /**
   * 尝试解析整个 JSON 数组
   */
  private tryParseArray(jsonString: string): ExcalidrawElementLike | null {
    try {
      // 清理可能的尾随逗号
      const cleaned = jsonString.replace(/,\s*([\]}])/g, '$1');
      const parsed = JSON.parse(cleaned);

      // 如果是数组
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 返回第一个对象（如果是单对象数组）
        // 或者特殊标记让 processChunk 处理整个数组
        return { __isArray: true, elements: parsed } as ExcalidrawElementLike;
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
   * 刷新缓冲区，处理流结束时剩余的数据
   */
  flush(): ExcalidrawElementLike[] {
    const newElements: ExcalidrawElementLike[] = [];

    // 尝试解析缓冲区中剩余的内容
    if (this.state.buffer.length > 0) {
      console.log('[Parser] flush 处理剩余 buffer:', this.state.buffer.substring(0, 100));

      // 尝试解析数组
      const arrayResult = this.tryParseArray(this.state.buffer);
      if (arrayResult && typeof arrayResult === 'object' && '__isArray' in arrayResult) {
        const elements = arrayResult.elements as ExcalidrawElementLike[];
        for (const el of elements) {
          if (el && typeof el === 'object') {
            if ('id' in el) {
              const id = String(el.id);
              if (!this.processedIds.has(id)) {
                this.processedIds.add(id);
                newElements.push(el);
              }
            } else {
              newElements.push(el);
            }
          }
        }
      } else {
        // 尝试解析单个对象
        const objResult = this.tryParseObject(this.state.buffer);
        if (objResult && typeof objResult === 'object' && 'id' in objResult) {
          const id = String(objResult.id);
          if (!this.processedIds.has(id)) {
            this.processedIds.add(id);
            newElements.push(objResult);
          }
        }
      }
    }

    // 也尝试从累积的 buffer 中提取 JSON
    if (newElements.length === 0) {
      const extracted = this.extractJSONFromText(this.state.buffer);
      for (const el of extracted) {
        if (el && typeof el === 'object') {
          if ('id' in el) {
            const id = String(el.id);
            if (!this.processedIds.has(id)) {
              this.processedIds.add(id);
              newElements.push(el);
            }
          } else {
            newElements.push(el);
          }
        }
      }
    }

    // 重置状态
    this.reset();

    return newElements;
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

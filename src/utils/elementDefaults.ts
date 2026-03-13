// 使用 any 类型来处理 Excalidraw 元素的复杂性
type ExcalidrawElementLike = Record<string, unknown>;

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成随机种子
 */
function generateSeed(): number {
  return Math.floor(Math.random() * 100000);
}

/**
 * Excalidraw 默认调色板
 */
export const DEFAULT_COLORS = {
  strokeColor: '#000000',
  backgroundColor: '#ffffff',
  fillStyle: 'hachure' as const,
  strokeWidth: 2,
  roughness: 1,
  opacity: 100,
};

/**
 * 为 AI 生成的元素补全 Excalidraw 必需的默认字段
 */
export function completeElementDefaults(
  element: Partial<ExcalidrawElementLike>
): ExcalidrawElementLike {
  const id = (element.id as string) || generateId();
  const seed = (element.seed as number) || generateSeed();
  const version = (element.version as number) || 1;
  const versionNonce = (element.versionNonce as number) || Math.floor(Math.random() * 100000);

  // 如果元素有 text 字段但类型不是 text，自动转换为 text 类型
  const hasText = 'text' in element && typeof element.text === 'string' && element.text.length > 0;
  let type = (element.type as string) || 'rectangle';
  if (hasText && type !== 'text') {
    type = 'text';
    console.log('[ElementDefaults] 检测到 text 字段，自动转换为 text 类型');
  }

  const result: ExcalidrawElementLike = {
    // 基础字段
    id,
    type,
    x: (element.x as number) || 0,
    y: (element.y as number) || 0,
    width: (element.width as number) || 100,
    height: (element.height as number) || 100,
    angle: (element.angle as number) || 0,

    // 样式字段
    strokeColor: (element.strokeColor as string) || DEFAULT_COLORS.strokeColor,
    backgroundColor: (element.backgroundColor as string) || DEFAULT_COLORS.backgroundColor,
    fillStyle: (element.fillStyle as string) || DEFAULT_COLORS.fillStyle,
    strokeWidth: (element.strokeWidth ?? DEFAULT_COLORS.strokeWidth) as number,
    strokeStyle: (element.strokeStyle as string) || 'solid',
    roughness: (element.roughness ?? DEFAULT_COLORS.roughness) as number,
    opacity: (element.opacity ?? DEFAULT_COLORS.opacity) as number,

    // 元数据
    groupIds: (element.groupIds as string[]) || [],
    frameId: (element.frameId as string | null) || null,
    roundness: (element.roundness as { type: 'round' | 'sharp' } | null) || null,
    seed,
    version,
    versionNonce,
    isDeleted: (element.isDeleted as boolean) || false,
    boundElements: (element.boundElements as { type: string; id: string }[] | null) || null,
  };

  // 箭头特定
  if (type === 'arrow') {
    result.points = (element.points as [number, number][]) || [[0, 0], [100, 0]];
    result.startBinding = element.startBinding;
    result.endBinding = element.endBinding;
  }

  // 文字特定
  if (type === 'text') {
    result.text = (element.text as string) || '';
    result.fontSize = (element.fontSize as number) || 20;
    result.fontFamily = (element.fontFamily as number) || 1;
    result.textAlign = (element.textAlign as 'left' | 'center' | 'right') || 'left';
    result.verticalAlign = (element.verticalAlign as 'top' | 'middle' | 'bottom') || 'top';
  }

  return result;
}

/**
 * 批量补全元素默认字段
 */
export function completeElementsDefaults(
  elements: Partial<ExcalidrawElementLike>[]
): ExcalidrawElementLike[] {
  // 计算每个元素的偏移位置，避免重叠
  let currentX = 50;
  let currentY = 50;
  const results: ExcalidrawElementLike[] = [];

  for (const element of elements) {
    const hasText = 'text' in element && typeof element.text === 'string' && element.text.length > 0;
    const originalType = (element.type as string) || 'rectangle';

    // 如果有 text 字段且原类型不是 text，需要拆分创建两个元素
    if (hasText && originalType !== 'text') {
      // 1. 创建矩形元素（不带 text）
      const rectElement = completeElementDefaults({
        ...element,
        text: undefined, // 移除 text 字段
        x: element.x ?? currentX,
        y: element.y ?? currentY,
      }) as ExcalidrawElementLike;
      results.push(rectElement);

      // 2. 创建文字元素（位于矩形中心）
      const textX = ((element.x as number) ?? currentX) + ((element.width as number) ?? 100) / 2;
      const textY = ((element.y as number) ?? currentY) + ((element.height as number) ?? 60) / 2;
      const textElement = completeElementDefaults({
        ...element,
        type: 'text',
        x: textX,
        y: textY,
        width: element.width || 100,
        height: element.height || 30,
      }) as ExcalidrawElementLike;
      results.push(textElement);

      console.log('[ElementDefaults] 拆分元素: 矩形 + 文字', element.text);
    } else {
      // 普通元素直接处理
      const completed = completeElementDefaults({
        ...element,
        x: element.x ?? currentX,
        y: element.y ?? currentY,
      }) as ExcalidrawElementLike & { width?: number; height?: number };
      results.push(completed);
    }

    // 更新下一个元素的位置
    currentX += ((element.width as number) || 100) + 30;
    if (currentX > 600) {
      currentX = 50;
      currentY += ((element.height as number) || 100) + 30;
    }
  }

  return results;
}

/**
 * 创建默认画布状态
 */
export function createDefaultAppState() {
  return {
    viewBackgroundColor: '#ffffff',
    currentItemStrokeColor: '#000000',
    currentItemBackgroundColor: '#ffffff',
    currentItemFillStyle: 'hachure' as const,
    currentItemStrokeWidth: 2,
    currentItemStrokeStyle: 'solid' as const,
    currentItemRoughness: 1,
    currentItemOpacity: 100,
  };
}

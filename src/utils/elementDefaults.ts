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
  const type = (element.type as string) || 'rectangle';

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

  return elements.map((element) => {
    const completed = completeElementDefaults({
      ...element,
      // 如果 AI 没有提供位置，则自动排列
      x: element.x ?? currentX,
      y: element.y ?? currentY,
    }) as ExcalidrawElementLike & { width?: number; height?: number };

    // 更新下一个元素的位置
    currentX += (completed.width || 100) + 30;
    if (currentX > 600) {
      currentX = 50;
      currentY += (completed.height || 100) + 30;
    }

    return completed as ExcalidrawElementLike;
  });
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

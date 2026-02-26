import { STORAGE_KEYS, ChatHistory } from '@/types';

// 使用 any 类型来处理 Excalidraw 数据的复杂性
type ExcalidrawStateLike = {
  elements: Record<string, unknown>[];
  appState?: Record<string, unknown>;
};

/**
 * localStorage 存储服务
 * 必须在客户端环境中使用
 */

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * 获取对话历史
 */
export function getChatHistory(): ChatHistory {
  if (!isBrowser()) {
    return { messages: [] };
  }

  try {
    const data = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }

  return { messages: [] };
}

/**
 * 保存对话历史
 */
export function saveChatHistory(history: ChatHistory): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

/**
 * 添加对话消息
 */
export function addChatMessage(role: 'user' | 'assistant', content: string): void {
  const history = getChatHistory();
  history.messages.push({
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: Date.now(),
  });
  saveChatHistory(history);
}

/**
 * 清空对话历史
 */
export function clearChatHistory(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
}

/**
 * 获取画布数据
 */
export function getExcalidrawData(): ExcalidrawStateLike | null {
  if (!isBrowser()) return null;

  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXCALIDRAW_DATA);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load Excalidraw data:', error);
  }

  return null;
}

/**
 * 保存画布数据
 */
export function saveExcalidrawData(state: ExcalidrawStateLike): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEYS.EXCALIDRAW_DATA, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save Excalidraw data:', error);
  }
}

/**
 * 保存画布元素
 */
export function saveElements(elements: Record<string, unknown>[]): void {
  const existing = getExcalidrawData();
  const newState: ExcalidrawStateLike = {
    elements,
    appState: existing?.appState || {
      viewBackgroundColor: '#ffffff',
      currentItemStrokeColor: '#000000',
      currentItemBackgroundColor: '#ffffff',
      currentItemFillStyle: 'hachure',
      currentItemStrokeWidth: 2,
      currentItemStrokeStyle: 'solid',
      currentItemRoughness: 1,
      currentItemOpacity: 100,
    },
  };
  saveExcalidrawData(newState);
}

/**
 * 清空画布数据
 */
export function clearExcalidrawData(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEYS.EXCALIDRAW_DATA);
}

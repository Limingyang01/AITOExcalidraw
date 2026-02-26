// IndexedDB 存储服务
// 用于存储聊天历史记录，提供更可靠的持久化存储

const DB_NAME = 'aito-excalidraw-db';
const DB_VERSION = 1;
const STORE_NAME = 'chat-sessions';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error('Not in browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * 获取所有聊天会话（按更新时间倒序）
 */
export async function getAllSessions(): Promise<ChatSession[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');

      const sessions: ChatSession[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          sessions.push(cursor.value);
          cursor.continue();
        }
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve(sessions);
    });
  } catch (error) {
    console.error('Failed to get all sessions:', error);
    return [];
  }
}

/**
 * 获取单个会话
 */
export async function getSession(id: string): Promise<ChatSession | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * 保存或更新会话
 */
export async function saveSession(session: ChatSession): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * 创建新会话
 */
export async function createSession(title: string = '新对话'): Promise<ChatSession> {
  const session: ChatSession = {
    id: `session-${Date.now()}`,
    title,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveSession(session);
  return session;
}

/**
 * 添加消息到会话（实时存储）
 */
export async function addMessageToSession(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatSession | null> {
  try {
    const session = await getSession(sessionId);
    if (!session) return null;

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: Date.now(),
    };

    session.messages.push(message);
    session.updatedAt = Date.now();

    // 如果是第一条用户消息，更新会话标题
    if (role === 'user' && session.messages.length === 1) {
      // 取用户消息的前20个字符作为标题
      session.title = content.slice(0, 20) + (content.length > 20 ? '...' : '');
    }

    await saveSession(session);
    return session;
  } catch (error) {
    console.error('Failed to add message to session:', error);
    return null;
  }
}

/**
 * 更新会话的最后一条消息（用于流式输出）
 */
export async function updateLastMessage(
  sessionId: string,
  content: string
): Promise<void> {
  try {
    const session = await getSession(sessionId);
    if (!session || session.messages.length === 0) return;

    const lastMessage = session.messages[session.messages.length - 1];
    lastMessage.content = content;
    session.updatedAt = Date.now();

    await saveSession(session);
  } catch (error) {
    console.error('Failed to update last message:', error);
  }
}

/**
 * 删除会话
 */
export async function deleteSession(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (error) {
    console.error('Failed to delete session:', error);
  }
}

/**
 * 清空所有会话
 */
export async function clearAllSessions(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (error) {
    console.error('Failed to clear all sessions:', error);
  }
}

/**
 * 获取当前活动的会话 ID（从 localStorage 读取）
 */
export function getCurrentSessionId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem('current-session-id');
}

/**
 * 设置当前活动的会话 ID
 */
export function setCurrentSessionId(id: string | null): void {
  if (!isBrowser()) return;
  if (id) {
    localStorage.setItem('current-session-id', id);
  } else {
    localStorage.removeItem('current-session-id');
  }
}

// AI Provider types
export type AIProviderType = 'openai' | 'zhipu' | 'aliyun';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  provider?: AIProviderType;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  name: string;
  chat(messages: Message[], options?: ChatOptions): AsyncGenerator<string, void, unknown>;
}

// Log types
export interface RequestLog {
  timestamp: string;
  ip: string;
  userAgent: string;
  messages: Message[];
  provider: AIProviderType;
  responseTime: number;
  error?: string;
}

// Chat history storage
export interface ChatHistoryItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatHistory {
  messages: ChatHistoryItem[];
}

// Storage keys
export const STORAGE_KEYS = {
  CHAT_HISTORY: 'chatHistory',
  EXCALIDRAW_DATA: 'excalidrawData',
} as const;

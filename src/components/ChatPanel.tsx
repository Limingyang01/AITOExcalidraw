'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, ChatHistoryItem } from '@/types';
import {
  getChatHistory,
  saveChatHistory,
  clearChatHistory,
} from '@/utils/storage';
import { StreamingJSONParser } from '@/utils/jsonParser';
import { completeElementsDefaults } from '@/utils/elementDefaults';

interface ChatPanelProps {
  onElementsGenerated?: (elements: Record<string, unknown>[]) => void;
}

export default function ChatPanel({
  onElementsGenerated,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const parserRef = useRef<StreamingJSONParser>(new StreamingJSONParser());

  // 加载历史记录
  useEffect(() => {
    const savedHistory = getChatHistory();
    setHistory(savedHistory.messages);
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // 添加用户消息
    const userItem: ChatHistoryItem = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const updated = [...prev, userItem];
      saveChatHistory({ messages: updated });
      return updated;
    });

    // 重置解析器
    parserRef.current.reset();

    // 添加占位的助手消息
    const assistantId = `${Date.now()}-assistant`;
    setHistory((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      },
    ]);

    setIsLoading(true);

    let fullContent = '';

    try {
      const messages: Message[] = [
        ...history.map((h) => ({
          role: h.role as 'user' | 'assistant',
          content: h.content,
        })),
        { role: 'user', content: userMessage },
      ];

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.content) {
                fullContent += parsed.content;

                // 流式解析 JSON
                const newElements = parserRef.current.processChunk(parsed.content);
                if (newElements.length > 0) {
                  const completedElements = completeElementsDefaults(newElements);
                  onElementsGenerated?.(completedElements);
                }

                // 更新助手消息内容
                setHistory((prev) =>
                  prev.map((item) =>
                    item.id === assistantId
                      ? { ...item, content: fullContent }
                      : item
                  )
                );
              }
            } catch {
              // 忽略解析错误，继续处理下一行
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生错误');
    } finally {
      setIsLoading(false);

      // 保存助手消息
      const assistantItem: ChatHistoryItem = {
        id: assistantId,
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
      };
      setHistory((prev) => {
        const updated = [...prev, assistantItem];
        saveChatHistory({ messages: updated });
        return updated;
      });
    }
  };

  // 处理清空历史
  const handleClearHistory = useCallback(() => {
    clearChatHistory();
    setHistory([]);
  }, []);

  // 按 Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">AI 对话</h2>
        <button
          onClick={handleClearHistory}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          清空历史
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p>你好！我是 AI 绘图助手</p>
            <p className="text-sm mt-2">描述你想画的图形，我会帮你生成</p>
          </div>
        )}

        {history.map((item) => (
          <div
            key={item.id}
            className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                item.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{item.content}</p>
              {item.role === 'user' && (
                <p className="text-xs text-blue-200 mt-1">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start">
            <div className="bg-red-50 text-red-600 rounded-lg px-4 py-2">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述你想画的图形..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

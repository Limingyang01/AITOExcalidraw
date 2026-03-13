'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '@/types';
import { StreamingJSONParser } from '@/utils/jsonParser';
import { completeElementsDefaults } from '@/utils/elementDefaults';
import {
  getAllSessions,
  getSession,
  createSession,
  addMessageToSession,
  updateLastMessage,
  deleteSession,
  clearAllSessions,
  setCurrentSessionId,
  getCurrentSessionId,
  ChatSession,
} from '@/utils/chatDb';
import {
  X,
  Trash2,
  Send,
  User,
  Pencil,
  Loader2,
  Plus,
  Menu,
} from 'lucide-react';

interface ChatPanelProps {
  onElementsGenerated?: (elements: Record<string, unknown>[]) => void;
}

export default function ChatPanel({
  onElementsGenerated,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const parserRef = useRef<StreamingJSONParser>(new StreamingJSONParser());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 加载所有会话
  useEffect(() => {
    loadSessions();
  }, []);

  // 加载会话列表
  const loadSessions = async () => {
    try {
      const allSessions = await getAllSessions();
      setSessions(allSessions);

      // 恢复当前会话
      const currentId = getCurrentSessionId();
      if (currentId) {
        const session = await getSession(currentId);
        if (session) {
          setCurrentSession(session);
          return;
        }
      }

      // 如果没有当前会话，创建一个新会话
      if (allSessions.length === 0) {
        const newSession = await createSession('新对话');
        setCurrentSession(newSession);
        setCurrentSessionId(newSession.id);
      } else if (allSessions.length > 0) {
        // 使用第一个会话
        const session = await getSession(allSessions[0].id);
        if (session) {
          setCurrentSession(session);
          setCurrentSessionId(session.id);
        }
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // 创建新会话
  const handleNewChat = useCallback(async () => {
    try {
      const newSession = await createSession('新对话');
      setCurrentSession(newSession);
      setCurrentSessionId(newSession.id);
      setSessions((prev) => [newSession, ...prev]);
      setError(null);
      setSidebarOpen(false);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }, []);

  // 切换会话
  const handleSelectSession = useCallback(async (session: ChatSession) => {
    try {
      const fullSession = await getSession(session.id);
      if (fullSession) {
        setCurrentSession(fullSession);
        setCurrentSessionId(fullSession.id);
        setSidebarOpen(false);
      }
    } catch (err) {
      console.error('Failed to select session:', err);
    }
  }, []);

  // 删除会话
  const handleDeleteSession = useCallback(async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);

      if (currentSession?.id === sessionId) {
        const newSession = await createSession('新对话');
        setCurrentSession(newSession);
        setCurrentSessionId(newSession.id);
        setSessions([newSession]);
      } else {
        const allSessions = await getAllSessions();
        setSessions(allSessions);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [currentSession?.id]);

  // 清空所有历史
  const handleClearAll = useCallback(async () => {
    try {
      await clearAllSessions();
      const newSession = await createSession('新对话');
      setCurrentSession(newSession);
      setCurrentSessionId(newSession.id);
      setSessions([newSession]);
    } catch (err) {
      console.error('Failed to clear all sessions:', err);
    }
  }, []);

// 生成唯一消息 ID
const generateMessageId = () => `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || isLoading || !currentSession) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    let fullContent = '';
    let assistantMessageId = '';

    try {
      // 添加用户消息到会话（实时存储）
      const updatedSession = await addMessageToSession(
        currentSession.id,
        'user',
        userMessage
      );
      if (updatedSession) {
        setCurrentSession(updatedSession);
      }

      // 更新会话列表中的标题
      const allSessions = await getAllSessions();
      setSessions(allSessions);

      // 重置解析器
      parserRef.current.reset();

      // 添加占位的助手消息到 IndexedDB（获取正确的消息 ID）
      const sessionWithAssistant = await addMessageToSession(
        currentSession.id,
        'assistant',
        ''
      );

      // 从 IndexedDB 获取新添加的消息 ID
      assistantMessageId = sessionWithAssistant?.messages[sessionWithAssistant.messages.length - 1]?.id || generateMessageId();

      // 更新本地 state
      setCurrentSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: assistantMessageId,
              role: 'assistant',
              content: '',
              timestamp: Date.now(),
            },
          ],
        };
      });

      setIsLoading(true);

      // 构建消息列表
      const messages: Message[] = [
        ...(currentSession.messages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))),
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
        console.log('[ChatPanel] 收到 chunk:', chunk.substring(0, 100));
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            console.log('[ChatPanel] data:', data.substring(0, 100));
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.content) {
                fullContent += parsed.content;

                // 调试：查看原始内容
                console.log('[ChatPanel] 原始内容片段:', parsed.content.substring(0, 200));

                // 流式解析 JSON
                const newElements = parserRef.current.processChunk(parsed.content);
                console.log('[ChatPanel] 解析到元素:', newElements.length, newElements.map((e: any) => ({ type: e.type, text: e.text })));
                if (newElements.length > 0) {
                  // 增量渲染：逐个发送元素，每次延迟 300ms
                  const completedElements = completeElementsDefaults(newElements);
                  completedElements.forEach((element, index) => {
                    setTimeout(() => {
                      onElementsGenerated?.([element]);
                    }, index * 300);
                  });
                }

                // 实时更新助手消息
                setCurrentSession((prev) => {
                  if (!prev) return prev;
                  const updated = { ...prev };
                  updated.messages = [...updated.messages];
                  const lastMsg = updated.messages[updated.messages.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    lastMsg.content = fullContent;
                  }
                  return updated;
                });

                // 实时保存到 IndexedDB
                await updateLastMessage(currentSession.id, fullContent);
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

      // 流结束后刷新缓冲区，处理剩余的 JSON 数据
      if (parserRef.current) {
        const remainingElements = parserRef.current.flush();
        console.log('[ChatPanel] 流结束，刷新剩余元素:', remainingElements.length);
        if (remainingElements.length > 0) {
          // 增量渲染
          const completedElements = completeElementsDefaults(remainingElements);
          completedElements.forEach((element, index) => {
            setTimeout(() => {
              onElementsGenerated?.([element]);
            }, index * 300);
          });
        }
      }

      // 如果 AI 没有返回内容，添加一个提示消息并持久化
      if (!fullContent && !error) {
        const finalMessageId = assistantMessageId || generateMessageId();
        await addMessageToSession(currentSession.id, 'assistant', '生成完成');
        setCurrentSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: finalMessageId,
                role: 'assistant' as const,
                content: '生成完成',
                timestamp: Date.now(),
              },
            ],
          };
        });
      }

      // 刷新会话数据以确保数据一致性
      const refreshedSession = await getSession(currentSession.id);
      if (refreshedSession) {
        setCurrentSession(refreshedSession);
      }
      const allSessions = await getAllSessions();
      setSessions(allSessions);
    }
  };

  // 按 Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 自动调整输入框高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // 自动调整高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', backgroundColor: '#ffffff', position: 'relative' }}>
      {/* 抽屉遮罩层 */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 40,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 抽屉侧边栏 - 使用 fixed 定位，完全覆盖在页面之上 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '300px',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fafaf9',
          borderRight: '1px solid #e7e5e4',
          boxShadow: sidebarOpen ? '4px 0 20px rgba(0, 0, 0, 0.1)' : 'none',
        }}
      >
        {/* 抽屉头部 */}
        <div style={{ padding: '16px', borderBottom: '1px solid #e7e5e4', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#1c1917' }}>历史记录</span>
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: '#78716c',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f4')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* 新建对话按钮 */}
        <div style={{ padding: '16px' }}>
          <button
            onClick={handleNewChat}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#1c1917',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0e8c6d')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#000000')}
          >
            <Plus size={16} />
            新建对话
          </button>
        </div>

        {/* 会话历史列表 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', padding: '8px', fontWeight: 500 }}>
            历史记录
          </div>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSelectSession(session)}
              style={{
                padding: '12px',
                marginBottom: '2px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: currentSession?.id === session.id ? '#000' : '#374151',
                backgroundColor: currentSession?.id === session.id ? '#e5e7eb' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
              onMouseEnter={(e) => {
                if (currentSession?.id !== session.id) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (currentSession?.id !== session.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.title || '新对话'}
              </span>
              <button
                onClick={(e) => handleDeleteSession(e, session.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#9ca3af',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.6,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.backgroundColor = '#fee2e2';
                  e.currentTarget.style.color = '#ef4444';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* 底部设置 */}
        <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleClearAll}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <Trash2 size={16} />
            清空所有历史
          </button>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* 顶部栏 */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <Menu size={20} />
          </button>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>AI 对话</h2>
          <div style={{ width: '36px' }} />
        </div>

        {/* 消息列表 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {(!currentSession || currentSession.messages.length === 0) && (
            <div style={{ textAlign: 'center', color: '#6b7280', paddingTop: '60px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                <Pencil size={64} strokeWidth={1.5} color="#9ca3af" />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px', color: '#374151' }}>
                你好！我是 AI 绘图助手
              </p>
              <p style={{ fontSize: '14px' }}>
                描述你想画的图形，我会帮你生成
              </p>
            </div>
          )}

          {currentSession?.messages.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                flexDirection: item.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {/* 头像 */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: item.role === 'user' ? '#1c1917' : '#fafaf9',
                  border: item.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                }}
              >
                {item.role === 'user' ? (
                  <User size={18} color="white" />
                ) : (
                  <Pencil size={18} color="#374151" />
                )}
              </div>

              {/* 消息内容 */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: item.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: item.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    backgroundColor: item.role === 'user' ? '#1c1917' : '#f7f7f8',
                    color: item.role === 'user' ? '#ffffff' : '#374151',
                  }}
                >
                  {item.content || (item.role === 'assistant' && isLoading && !error ? '正在思考...' : '')}
                </div>
              </div>
            </div>
          ))}

          {/* 加载动画 */}
          {isLoading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: '#fafaf9',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Pencil size={18} color="#374151" />
              </div>
              <div
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: '12px 12px 12px 4px',
                  backgroundColor: '#f7f7f8',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                正在思考...
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px',
                border: '1px solid #fecaca',
              }}
            >
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入框 */}
        <div style={{ padding: '16px 20px 20px', borderTop: '1px solid #e5e7eb' }}>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '12px',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="描述你想画的图形..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '15px',
                lineHeight: '1.5',
                maxHeight: '150px',
                fontFamily: 'inherit',
              }}
              rows={1}
              disabled={isLoading}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                Enter 发送，Shift + Enter 换行
              </span>
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                style={{
                  padding: '8px 20px',
                  backgroundColor: input.trim() && !isLoading ? '#1c1917' : '#e7e5e4',
                  border: 'none',
                  borderRadius: '6px',
                  color: input.trim() && !isLoading ? '#ffffff' : '#a8a29e',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={16} />
                发送
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 动画样式 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

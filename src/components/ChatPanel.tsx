"use client";

import { useState, useRef, useEffect } from "react";
import { Message } from "@/types";
import { StreamingJSONParser } from "@/utils/jsonParser";
import { completeElementsDefaults } from "@/utils/elementDefaults";
import {
  getSession,
  createSession,
  addMessageToSession,
  updateLastMessage,
  getProjectSessionId,
  setProjectSessionId,
  ChatSession,
} from "@/utils/chatDb";
import { Send, User, Pencil, Loader2, PanelRightClose } from "lucide-react";

interface ChatPanelProps {
  projectId?: string;
  onElementsGenerated?: (elements: Record<string, unknown>[]) => void;
  onAIRenderStart?: () => void;
  onHide?: () => void;
}

export default function ChatPanel({
  projectId,
  onElementsGenerated,
  onAIRenderStart,
  onHide,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const parserRef = useRef<StreamingJSONParser>(new StreamingJSONParser());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const loadSession = async () => {
    if (!projectId) return;
    try {
      const projectSessionId = getProjectSessionId(projectId);
      if (projectSessionId) {
        const session = await getSession(projectSessionId);
        if (session) {
          setCurrentSession(session);
          return;
        }
      }
      const newSession = await createSession("新对话");
      setCurrentSession(newSession);
      setProjectSessionId(projectId, newSession.id);
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession?.messages]);

  const generateMessageId = () =>
    `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !currentSession) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    let fullContent = "";
    let assistantMessageId = "";
    const activeSessionId = currentSession.id;
    let aiRenderStartFired = false;

    const fireAIRenderStartOnce = () => {
      if (aiRenderStartFired) return;
      aiRenderStartFired = true;
      onAIRenderStart?.();
    };

    try {
      const updatedSession = await addMessageToSession(
        currentSession.id,
        "user",
        userMessage,
      );
      if (updatedSession) {
        setCurrentSession(updatedSession);
      }

      parserRef.current.reset();
      setIsLoading(true);

      assistantMessageId = generateMessageId();
      const sessionWithPlaceholder = await addMessageToSession(
        currentSession.id,
        "assistant",
        "",
      );
      if (sessionWithPlaceholder) {
        setCurrentSession(sessionWithPlaceholder);
      }

      const messages: Message[] = [
        ...currentSession.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: userMessage },
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "请求失败");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (!parsed.content) continue;

            fullContent += parsed.content;

            const newElements = parserRef.current.processChunk(parsed.content);
            if (newElements.length > 0) {
              fireAIRenderStartOnce();
              const completedElements = completeElementsDefaults(newElements);
              completedElements.forEach((element, index) => {
                setTimeout(() => {
                  onElementsGenerated?.([element]);
                }, index * 300);
              });
            }

            setCurrentSession((prev) => {
              if (!prev) return prev;
              const updated = { ...prev };
              updated.messages = [...updated.messages];
              const lastMsg = updated.messages[updated.messages.length - 1];
              if (lastMsg && lastMsg.role === "assistant") {
                lastMsg.content = fullContent;
              }
              return updated;
            });

            await updateLastMessage(activeSessionId, fullContent);
          } catch {
            // 忽略 JSON 解析错误，继续处理下一行
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发生错误");
    } finally {
      setIsLoading(false);

      const remainingElements = parserRef.current.flush();
      if (remainingElements.length > 0) {
        fireAIRenderStartOnce();
        const completedElements = completeElementsDefaults(remainingElements);
        completedElements.forEach((element, index) => {
          setTimeout(() => {
            onElementsGenerated?.([element]);
          }, index * 300);
        });
      }

      if (!fullContent && !error) {
        const finalMessageId = assistantMessageId || generateMessageId();
        await addMessageToSession(activeSessionId, "assistant", "生成完成");
        setCurrentSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: finalMessageId,
                role: "assistant" as const,
                content: "生成完成",
                timestamp: Date.now(),
              },
            ],
          };
        });
      }

      const refreshedSession = await getSession(currentSession.id);
      if (refreshedSession) {
        setCurrentSession(refreshedSession);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#ffffff",
      }}
    >
      {/* 顶部栏 */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => onHide?.()}
          aria-label="隐藏对话面板"
          title="隐藏对话面板"
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "6px",
            color: "#374151",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#f3f4f6")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <PanelRightClose size={20} />
        </button>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#111827",
            margin: 0,
          }}
        >
          AI 对话
        </h2>
        <div style={{ width: "36px" }} />
      </div>

      {/* 消息列表 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {(!currentSession || currentSession.messages.length === 0) && (
          <div
            style={{
              textAlign: "center",
              color: "#6b7280",
              paddingTop: "60px",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>
              <Pencil size={64} strokeWidth={1.5} color="#9ca3af" />
            </div>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 500,
                marginBottom: "8px",
                color: "#374151",
              }}
            >
              你好！我是 AI 绘图助手
            </p>
            <p style={{ fontSize: "14px" }}>描述你想画的图形，我会帮你生成</p>
          </div>
        )}

        {currentSession?.messages.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
              flexDirection: item.role === "user" ? "row-reverse" : "row",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backgroundColor: item.role === "user" ? "#1c1917" : "#fafaf9",
                border: item.role === "assistant" ? "1px solid #e5e7eb" : "none",
              }}
            >
              {item.role === "user" ? (
                <User size={18} color="white" />
              ) : (
                <Pencil size={18} color="#374151" />
              )}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: item.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {item.role === "assistant" && isLoading && item.content === "" ? (
                <div
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxWidth: "80%",
                    padding: "12px 16px",
                    borderRadius: "12px 12px 12px 4px",
                    backgroundColor: "#f7f7f8",
                    color: "#374151",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  正在思考...
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxWidth: "80%",
                    padding: "12px 16px",
                    borderRadius:
                      item.role === "user"
                        ? "12px 12px 4px 12px"
                        : "12px 12px 12px 4px",
                    backgroundColor: item.role === "user" ? "#1c1917" : "#f7f7f8",
                    color: item.role === "user" ? "#ffffff" : "#374151",
                  }}
                >
                  {item.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#fef2f2",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "14px",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div style={{ padding: "16px 20px 20px", borderTop: "1px solid #e5e7eb" }}>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "12px",
            backgroundColor: "#ffffff",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="描述你想画的图形..."
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "15px",
              lineHeight: "1.5",
              maxHeight: "150px",
              fontFamily: "inherit",
            }}
            rows={1}
            disabled={isLoading}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "8px",
            }}
          >
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>
              Enter 发送，Shift + Enter 换行
            </span>
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                padding: "8px 20px",
                backgroundColor: input.trim() && !isLoading ? "#1c1917" : "#e7e5e4",
                border: "none",
                borderRadius: "6px",
                color: input.trim() && !isLoading ? "#ffffff" : "#a8a29e",
                fontSize: "14px",
                fontWeight: 500,
                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                transition: "background-color 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Send size={16} />
              发送
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

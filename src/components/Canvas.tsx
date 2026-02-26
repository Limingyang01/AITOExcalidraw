'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { Trash2, Pencil } from 'lucide-react';
import {
  getExcalidrawData,
  saveElements,
  clearExcalidrawData,
} from '@/utils/storage';
import { completeElementsDefaults } from '@/utils/elementDefaults';

interface CanvasProps {
  newElements?: Record<string, unknown>[];
  onElementsChange?: (elements: Record<string, unknown>[]) => void;
}

// 炫酷的加载动画组件
function LoadingAnimation() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <div style={{ position: 'relative', width: '80px', height: '80px' }}>
        {/* 外圈旋转 */}
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          style={{ position: 'absolute', animation: 'spin 2s linear infinite' }}
        >
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke="#e7e5e4"
            strokeWidth="4"
          />
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke="#1c1917"
            strokeWidth="4"
            strokeDasharray="20 10"
            strokeLinecap="round"
          />
        </svg>

        {/* 内部图标 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <Pencil size={28} strokeWidth={1.5} color="#1c1917" />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '16px', fontWeight: 500, color: '#1c1917', marginBottom: '4px' }}>
          加载画布中
        </p>
        <p style={{ fontSize: '13px', color: '#78716c' }}>
          准备就绪...
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.9); }
        }
      `}</style>
    </div>
  );
}

export default function Canvas({ newElements, onElementsChange }: CanvasProps) {
  const [elements, setElements] = useState<Record<string, unknown>[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const onElementsChangeRef = useRef(onElementsChange);
  onElementsChangeRef.current = onElementsChange;

  // 加载保存的画布数据
  useEffect(() => {
    const savedData = getExcalidrawData();
    if (savedData && savedData.elements) {
      setElements(savedData.elements);
      // 记录已处理的元素 ID
      savedData.elements.forEach((el: Record<string, unknown>) => {
        if (el.id) {
          processedIdsRef.current.add(String(el.id));
        }
      });
    }
    setIsReady(true);
  }, []);

  // 处理新添加的元素（来自 AI）- 实时推送到画布
  useEffect(() => {
    if (!newElements || newElements.length === 0) return;

    // 过滤出未处理的元素
    const newUnprocessedElements = newElements.filter(
      (el) => el.id && !processedIdsRef.current.has(String(el.id))
    );

    if (newUnprocessedElements.length === 0) return;

    // 补全默认字段
    const completedElements = completeElementsDefaults(newUnprocessedElements);

    // 标记为已处理
    completedElements.forEach((el) => {
      if (el.id) {
        processedIdsRef.current.add(String(el.id));
      }
    });

    // 更新本地状态
    setElements((prev) => {
      const updated = [...prev, ...completedElements];
      // 保存到 localStorage
      saveElements(updated);
      return updated;
    });

    // 通过改变 key 强制重新渲染 Excalidraw
    setRenderKey((k) => k + 1);

    onElementsChangeRef.current?.(completedElements);
  }, [newElements]);

  // 清空画布
  const handleClearCanvas = useCallback(() => {
    processedIdsRef.current.clear();
    setElements([]);
    clearExcalidrawData();
    setRenderKey((k) => k + 1);
  }, []);

  if (!isReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#fafaf9' }}>
        <LoadingAnimation />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden', border: '1px solid #d1d5db', borderRadius: '8px', position: 'relative' }}>
      {/* 清空画布按钮 */}
      <button
        onClick={handleClearCanvas}
        style={{
          position: 'absolute',
          top: '14px',
          right: '12px',
          zIndex: 10,
          padding: '8px 12px',
          backgroundColor: '#ffffff',
          border: '1px solid #e7e5e4',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '13px',
          color: '#57534e',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f4')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
      >
        <Trash2 size={14} />
        清空画布
      </button>

      <Excalidraw
        key={renderKey}
        initialData={{
          elements: elements as never,
          appState: {
            viewBackgroundColor: '#ffffff',
          },
        }}
        langCode="zh-CN"
      />
    </div>
  );
}

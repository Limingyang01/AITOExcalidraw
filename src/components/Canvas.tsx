'use client';

import { useEffect, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import {
  getExcalidrawData,
  saveElements,
} from '@/utils/storage';
import { completeElementsDefaults } from '@/utils/elementDefaults';

interface CanvasProps {
  newElements?: Record<string, unknown>[];
  onElementsChange?: (elements: Record<string, unknown>[]) => void;
}

export default function Canvas({ newElements, onElementsChange }: CanvasProps) {
  const [elements, setElements] = useState<Record<string, unknown>[]>([]);
  const [isReady, setIsReady] = useState(false);

  // 加载保存的画布数据
  useEffect(() => {
    const savedData = getExcalidrawData();
    if (savedData && savedData.elements) {
      setElements(savedData.elements);
    }
    setIsReady(true);
  }, []);

  // 处理新添加的元素（来自 AI）
  useEffect(() => {
    if (newElements && newElements.length > 0) {
      // 补全默认字段
      const completedElements = completeElementsDefaults(newElements);

      // 追加到现有元素
      setElements((prev) => {
        const updated = [...prev, ...completedElements];
        // 保存到 localStorage
        saveElements(updated);
        return updated;
      });

      onElementsChange?.(completedElements);
    }
  }, [newElements, onElementsChange]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">加载画布...</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
      <Excalidraw
        initialData={{
          elements: elements as never,
          appState: {
            viewBackgroundColor: '#ffffff',
          },
        }}
      />
    </div>
  );
}

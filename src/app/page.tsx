'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import ChatPanel from '@/components/ChatPanel';

// 动态导入 Excalidraw 组件，避免 SSR 问题
const Canvas = dynamic(() => import('@/components/Canvas'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: '#f9fafb' }}>
      <span style={{ color: '#6b7280' }}>加载画布...</span>
    </div>
  ),
});

export default function Home() {
  const [newElements, setNewElements] = useState<any[]>([]);

  const handleElementsGenerated = useCallback((elements: any[]) => {
    setNewElements((prev) => [...prev, ...elements]);
  }, []);

  const handleElementsChange = useCallback(() => {
    // 画布组件会处理
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, height: '100%' }}>
          <Canvas
            newElements={newElements}
            onElementsChange={handleElementsChange}
          />
        </div>

        <div style={{ width: '380px', height: '100%' }}>
          <ChatPanel onElementsGenerated={handleElementsGenerated} />
        </div>
      </div>
    </div>
  );
}

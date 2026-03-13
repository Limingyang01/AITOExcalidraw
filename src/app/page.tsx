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
    // 每次有新元素时设置，Canvas 处理后会通过 key 变化自动重新渲染
    setNewElements(elements);
    // 短暂延迟后清除，以便下次接收新元素
    setTimeout(() => setNewElements([]), 100);
  }, []);

  const handleElementsChange = useCallback(() => {
    // 画布组件会处理
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '16px', gap: '16px', backgroundColor: '#f5f5f4' }}>
        <div style={{ flex: 1, height: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <Canvas
            newElements={newElements}
            onElementsChange={handleElementsChange}
          />
        </div>

        <div style={{ width: '380px', height: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e7e5e4', backgroundColor: '#ffffff' }}>
          <ChatPanel onElementsGenerated={handleElementsGenerated} />
        </div>
      </div>
    </div>
  );
}

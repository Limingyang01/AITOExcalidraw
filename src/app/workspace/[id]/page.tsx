'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Save, Pencil, Loader2 } from 'lucide-react';
import { Button, Input, message } from 'antd';
import { getProject, updateProjectCanvas, updateProjectName, Project } from '@/utils/projectDb';

// 动态导入 Excalidraw 组件，避免 SSR 问题
const Canvas = dynamic(() => import('@/components/Canvas'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: '#fafaf9' }}>
      <Loader2 size={32} style={{ color: '#1f1f1f', animation: 'spin 1s linear infinite' }} />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  ),
});

const ChatPanel = dynamic(() => import('@/components/ChatPanel'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: '#fafaf9' }}>
      <Loader2 size={32} style={{ color: '#1f1f1f', animation: 'spin 1s linear infinite' }} />
    </div>
  ),
});

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const antMessage = message;
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newElements, setNewElements] = useState<any[]>([]);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    setIsLoading(true);
    try {
      const loadedProject = await getProject(projectId);
      setProject(loadedProject);
      if (loadedProject) {
        setEditedName(loadedProject.name);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleElementsGenerated = useCallback((elements: any[]) => {
    setNewElements(elements);
    setTimeout(() => setNewElements([]), 100);
  }, []);

  const handleElementsChange = useCallback(() => {
    // 画布组件会处理
  }, []);

  const handleMessageSent = useCallback(() => {
    setResetTrigger((prev) => prev + 1);
  }, []);

  const handleSave = useCallback(async () => {
    if (!project) return;

    setIsSaving(true);
    try {
      await updateProjectCanvas(projectId, project.elements);
      const updatedProject = await getProject(projectId);
      if (updatedProject) {
        setProject(updatedProject);
      }
      antMessage.success('保存成功');
    } catch (error) {
      console.error('Failed to save project:', error);
      antMessage.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  }, [project, projectId]);

  const handleSaveTrigger = useCallback(() => {
    setSaveTrigger((prev) => prev + 1);
  }, []);

  const handleNameEdit = () => {
    setIsEditingName(true);
    setEditedName(project?.name || '');
  };

  const handleNameSave = async () => {
    if (!editedName.trim() || !project) return;

    try {
      const updated = await updateProjectName(projectId, editedName.trim());
      if (updated) {
        setProject(updated);
      }
      setIsEditingName(false);
      antMessage.success('名称已更新');
    } catch (error) {
      console.error('Failed to update project name:', error);
      antMessage.error('更新失败');
    }
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setEditedName(project?.name || '');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#fafaf9', gap: '16px' }}>
        <Loader2 size={32} style={{ color: '#1f1f1f', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: '#666', fontSize: '14px' }}>加载中...</span>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#fafaf9' }}>
        <p style={{ fontSize: '16px', color: '#333', marginBottom: '16px' }}>项目不存在</p>
        <Button onClick={() => router.push('/workspace')}>返回工作空间</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e5e5',
          height: '56px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button type="text" icon={<ArrowLeft size={20} />} onClick={() => router.push('/workspace')} />

          {isEditingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Input
                size="small"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onPressEnter={handleNameSave}
                onBlur={handleNameCancel}
                autoFocus
                style={{ width: 200 }}
              />
              <Button size="small" onClick={handleNameSave}>保存</Button>
              <Button size="small" onClick={handleNameCancel}>取消</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1f1f1f', margin: 0 }}>
                {project.name}
              </h1>
              <Button type="text" icon={<Pencil size={14} />} onClick={handleNameEdit} />
            </div>
          )}
        </div>

        <Button
          icon={<Save size={16} />}
          onClick={handleSaveTrigger}
          loading={isSaving}
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </header>

      {/* 主内容区域 */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '16px', gap: '16px', backgroundColor: '#fafaf9' }}>
        <div style={{ flex: 1, height: '100%', borderRadius: '8px', overflow: 'hidden' }}>
          <Canvas
            newElements={newElements}
            onElementsChange={handleElementsChange}
            resetTrigger={resetTrigger}
            initialElements={project.elements}
            saveTrigger={saveTrigger}
            onSave={handleSave}
          />
        </div>

        <div
          style={{
            width: '380px',
            height: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #e5e5e5',
            backgroundColor: '#ffffff',
          }}
        >
          <ChatPanel
            onElementsGenerated={handleElementsGenerated}
            onMessageSent={handleMessageSent}
          />
        </div>
      </div>
    </div>
  );
}
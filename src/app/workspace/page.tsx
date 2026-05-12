'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, FolderOpen, Clock, Trash2 } from 'lucide-react';
import { Button, Modal, Input, Card, message } from 'antd';
import {
  getAllProjects,
  createProject,
  deleteProject,
  Project,
} from '@/utils/projectDb';

export default function WorkspacePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const allProjects = await getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;

    setIsCreating(true);
    try {
      const newProject = await createProject(projectName.trim());
      setModalOpen(false);
      setProjectName('');
      router.push(`/workspace/${newProject.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      message.error('创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      message.success('删除成功');
    } catch (error) {
      console.error('Failed to delete project:', error);
      message.error('删除失败');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#fafaf9' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/logo.png"
            alt="AI Excalidraw"
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          />
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1f1f1f', margin: 0 }}>
            布丁画布空间
          </h1>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          新建项目
        </Button>
      </header>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <span style={{ color: '#666' }}>加载中...</span>
          </div>
        ) : projects.length === 0 ? (
          <Card
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              border: '1px solid #e5e5e5',
              boxShadow: 'none',
            }}
            styles={{ body: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' } }}
          >
            <FolderOpen size={64} strokeWidth={1} color="#999" />
            <p style={{ fontSize: '16px', fontWeight: 500, marginTop: '16px', marginBottom: '8px', color: '#333' }}>
              还没有项目
            </p>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              点击新建项目开始创作
            </p>
            <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
              新建项目
            </Button>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {projects.map((project) => (
              <Card
                key={project.id}
                hoverable
                onClick={() => router.push(`/workspace/${project.id}`)}
                style={{ cursor: 'pointer', border: '1px solid #e5e5e5', boxShadow: 'none' }}
                styles={{ body: { padding: '16px' } }}
                actions={[
                  <Trash2 key="delete" size={16} color="#999" onClick={(e) => handleDeleteProject(e, project.id)} />,
                ]}
              >
                <Card.Meta
                  avatar={<Pencil size={18} color="#1f1f1f" />}
                  title={<span style={{ fontSize: '15px', fontWeight: 500 }}>{project.name}</span>}
                  description={
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666', fontSize: '13px', marginTop: '8px' }}>
                        <Clock size={14} />
                        <span>{formatDate(project.updatedAt)}</span>
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '13px', color: '#999' }}>
                        {project.elements.length} 个元素
                      </div>
                    </>
                  }
                />
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 创建项目对话框 */}
      <Modal
        title="新建项目"
        open={modalOpen}
        onOk={handleCreateProject}
        onCancel={() => {
          setModalOpen(false);
          setProjectName('');
        }}
        confirmLoading={isCreating}
        okText={isCreating ? '创建中...' : '创建'}
        cancelText="取消"
      >
        <Input
          placeholder="输入项目名称"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onPressEnter={handleCreateProject}
          autoFocus
        />
      </Modal>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, Clock, Loader2 } from 'lucide-react';
import { MoreOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Button, Modal, Input, Card, message, Dropdown, Tooltip, type MenuProps } from 'antd';
import {
  getAllProjects,
  createProject,
  deleteProject,
  updateProjectDescription,
  Project,
} from '@/utils/projectDb';

export default function WorkspacePage() {
  const router = useRouter();
  const antMessage = message;
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editDescModalOpen, setEditDescModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editDescValue, setEditDescValue] = useState('');

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
      const newProject = await createProject(projectName.trim(), projectDescription.trim());
      setModalOpen(false);
      setProjectName('');
      setProjectDescription('');
      router.push(`/workspace/${newProject.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      antMessage.error('创建失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除项目「${projectName}」吗？此操作不可恢复。`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteProject(projectId);
          setProjects((prev) => prev.filter((p) => p.id !== projectId));
          antMessage.success('删除成功');
        } catch (error) {
          console.error('Failed to delete project:', error);
          antMessage.error('删除失败');
        }
      },
    });
  };

  const handleEditDescription = (project: Project) => {
    setEditingProject(project);
    setEditDescValue(project.description || '');
    setEditDescModalOpen(true);
  };

  const handleSaveDescription = async () => {
    if (!editingProject) return;
    try {
      const updated = await updateProjectDescription(editingProject.id, editDescValue.trim());
      if (updated) {
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
      setEditDescModalOpen(false);
      setEditingProject(null);
      antMessage.success('描述已更新');
    } catch (error) {
      console.error('Failed to update description:', error);
      antMessage.error('更新失败');
    }
  };

  const getMenuItems = (project: Project): MenuProps['items'] => [
    {
      key: 'edit-desc',
      icon: <EditOutlined />,
      label: '编辑描述',
      onClick: () => handleEditDescription(project),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
      label: <span style={{ color: '#ff4d4f' }}>删除</span>,
      onClick: () => handleDeleteProject(project.id, project.name),
    },
  ];

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
            布丁画布
          </h1>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)} loading={isCreating}>
          新建项目
        </Button>
      </header>

      {/* 内容区域 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {projects.length === 0 ? (
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
            <FolderOpen style={{ fontSize: 64, color: '#999' }} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {projects.map((project) => (
              <Card
                key={project.id}
                hoverable
                onClick={() => router.push(`/workspace/${project.id}`)}
                style={{ cursor: 'pointer', border: '1px solid #e5e5e5', boxShadow: 'none' }}
                styles={{ body: { padding: '16px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title={project.name} placement="topLeft">
                    <span style={{ fontSize: '15px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                      {project.name}
                    </span>
                  </Tooltip>
                  <Dropdown menu={{ items: getMenuItems(project) }} trigger={['click']}>
                    <Button type="text" icon={<MoreOutlined />} />
                  </Dropdown>
                </div>
                <div style={{ minHeight: '60px' }}>
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                    {project.description || '暂无描述'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#999', fontSize: '12px', marginTop: '12px' }}>
                    <Clock size={12} />
                    <span>{formatDate(project.updatedAt)}</span>
                    <span style={{ margin: '0 4px' }}>·</span>
                    <span>{project.elements.length} 个元素</span>
                  </div>
                </div>
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
          setProjectDescription('');
        }}
        confirmLoading={isCreating}
        okText={isCreating ? '创建中...' : '创建'}
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Input
            placeholder="输入项目名称"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onPressEnter={handleCreateProject}
            autoFocus
          />
          <Input.TextArea
            placeholder="输入项目描述（可选）"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* 编辑描述对话框 */}
      <Modal
        title="编辑描述"
        open={editDescModalOpen}
        onOk={handleSaveDescription}
        onCancel={() => {
          setEditDescModalOpen(false);
          setEditingProject(null);
        }}
        okText="保存"
        cancelText="取消"
      >
        <Input.TextArea
          placeholder="输入项目描述"
          value={editDescValue}
          onChange={(e) => setEditDescValue(e.target.value)}
          rows={4}
          autoFocus
        />
      </Modal>
    </div>
  );
}
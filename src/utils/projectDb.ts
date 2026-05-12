// IndexedDB 项目存储服务
// 用于存储多个绘制项目的数据

const DB_NAME = 'aito-excalidraw-projects-db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

export interface Project {
  id: string;
  name: string;
  description?: string;
  elements: Record<string, unknown>[];
  appState?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error('Not in browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * 获取所有项目（按更新时间倒序）
 */
export async function getAllProjects(): Promise<Project[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');

      const projects: Project[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          projects.push(cursor.value);
          cursor.continue();
        }
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve(projects);
    });
  } catch (error) {
    console.error('Failed to get all projects:', error);
    return [];
  }
}

/**
 * 获取单个项目
 */
export async function getProject(id: string): Promise<Project | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get project:', error);
    return null;
  }
}

/**
 * 保存或更新项目
 */
export async function saveProject(project: Project): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(project);

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (error) {
    console.error('Failed to save project:', error);
  }
}

/**
 * 创建新项目
 */
export async function createProject(name: string, description?: string): Promise<Project> {
  const project: Project = {
    id: `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    description,
    elements: [],
    appState: {
      viewBackgroundColor: '#ffffff',
      currentItemStrokeColor: '#000000',
      currentItemBackgroundColor: '#ffffff',
      currentItemFillStyle: 'hachure',
      currentItemStrokeWidth: 2,
      currentItemStrokeStyle: 'solid',
      currentItemRoughness: 1,
      currentItemOpacity: 100,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveProject(project);
  return project;
}

/**
 * 更新项目名称
 */
export async function updateProjectName(id: string, name: string): Promise<Project | null> {
  try {
    const project = await getProject(id);
    if (!project) return null;

    project.name = name;
    project.updatedAt = Date.now();
    await saveProject(project);
    return project;
  } catch (error) {
    console.error('Failed to update project name:', error);
    return null;
  }
}

/**
 * 更新项目描述
 */
export async function updateProjectDescription(id: string, description: string): Promise<Project | null> {
  try {
    const project = await getProject(id);
    if (!project) return null;

    project.description = description;
    project.updatedAt = Date.now();
    await saveProject(project);
    return project;
  } catch (error) {
    console.error('Failed to update project description:', error);
    return null;
  }
}

/**
 * 更新项目画布数据
 */
export async function updateProjectCanvas(
  id: string,
  elements: Record<string, unknown>[],
  appState?: Record<string, unknown>
): Promise<Project | null> {
  try {
    const project = await getProject(id);
    if (!project) return null;

    project.elements = elements;
    if (appState) {
      project.appState = appState;
    }
    project.updatedAt = Date.now();
    await saveProject(project);
    return project;
  } catch (error) {
    console.error('Failed to update project canvas:', error);
    return null;
  }
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (error) {
    console.error('Failed to delete project:', error);
  }
}

/**
 * 清空所有项目
 */
export async function clearAllProjects(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
    });
  } catch (error) {
    console.error('Failed to clear all projects:', error);
  }
}

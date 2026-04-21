# Sidebar 架构文档

> 文档版本：2025-04-20  
> 技术栈：React 18 + TypeScript + Zustand 5 + Immer + react-dnd

---

## 1. 架构概览

Sidebar 采用**分层架构**，从上到下分为三层：

```
┌─────────────────────────────────────────┐
│  组件层 (Components)                     │  ← React 组件，只读状态，触发 Action
│  index.tsx / resource-tree/*.tsx        │
├─────────────────────────────────────────┤
│  适配层 (Adapters)                       │  ← 事件总线 ↔ Store 的翻译层
│  use-sidebar-init.ts / use-sidebar-events.ts │
├─────────────────────────────────────────┤
│  状态层 (Store)                          │  ← 唯一数据源，扁平化状态 + Immer
│  store/types.ts / state.ts / actions.ts │
│  store/sidebar-store.ts / utils.ts      │
└─────────────────────────────────────────┘
```

**核心设计原则**：

- **Store 不依赖 React Router** — 所有 Action 返回资源 ID，由调用方负责 `navigate()`
- **扁平化状态** — `Record<string, TreeNode>` 替代嵌套树，更新 O(1)
- **事件总线解耦** — HTTP 请求完成后通过 `app.fire()` 触发事件，再由适配层映射到 Store Action
- **细粒度订阅** — Zustand selectors 保证只有真正用到的组件重渲染

---

## 2. 目录结构

```
src/page/sidebar/
├── index.tsx                          # 主入口：调用 useSidebarInit + useSidebarEvents
├── hooks/
│   ├── use-sidebar-init.ts            # 初始化：根资源获取、URL 同步、自动展开/导航
│   └── use-sidebar-events.ts          # 事件适配：app.on → store.action
├── store/
│   ├── types.ts                       # 类型定义：TreeNode, SidebarState, SidebarActions, SidebarStore
│   ├── state.ts                       # 初始状态（14 行纯数据）
│   ├── actions.ts                     # buildActions(set, get) — 所有业务逻辑 + HTTP
│   ├── sidebar-store.ts               # Zustand 入口：create<SidebarStore>()(immer(...))
│   ├── utils.ts                       # 纯函数：createNode, collectParentIds, getDescendantIds, findNextActiveId, detectSpaceType
│   └── selectors.ts                   # 细粒度 selectors：useNode, useIsActive, useRootId 等
└── components/resource-tree/
    ├── index.tsx                      # DndProvider 容器
    ├── space-section.tsx              # 空间根节点（private / teamspace）
    ├── resource-node.tsx              # 单节点：拖拽、展开、重命名、导航
    ├── node-actions.tsx               # 节点操作按钮（DropdownMenu）
    ├── node-context-menu.tsx          # 右键菜单（ContextMenu）
    └── create-folder-dialog.tsx       # 创建文件夹弹窗
```

---

## 3. 状态层（Store）

### 3.1 状态形状

```typescript
interface SidebarState {
  namespaceId: string; // 当前命名空间（替代旧的全局变量）
  nodes: Record<string, TreeNode>; // 扁平化节点存储，key = resourceId
  rootIds: Record<SpaceType, string>; // { private: 'uuid', teamspace: 'uuid' }
  activeId: string | null; // 当前高亮资源
  editingId: string | null; // 正在行内重命名的资源
  spaceExpanded: Record<SpaceType, boolean>; // 空间折叠状态
  uploading: Record<string, boolean>; // 正在上传的父节点
  uploadProgress: Record<string, string>; // 上传进度文本 "3/5"
}
```

### 3.2 节点结构

```typescript
interface TreeNode {
  id: string;
  parentId: string | null;
  spaceType: SpaceType; // 'private' | 'teamspace'
  name: string;
  resourceType: ResourceType; // 'doc' | 'folder' | 'file'

  // 业务字段
  content?: string;
  attrs?: Record<string, any>;
  tags?: TagDto[];
  path?: PathItem[];
  hasChildren: boolean;
  currentPermission?: Permission;
  globalPermission?: Permission;
  createdAt: string;
  updatedAt: string;

  // UI 状态
  expanded: boolean; // 是否展开
  loading: boolean; // 是否正在加载子节点
  loaded: boolean; // 子节点是否已加载过
  children: string[]; // 子节点 ID 列表（有序）
}
```

### 3.3 Store 文件职责

| 文件               | 职责                                                       | 行数 |
| ------------------ | ---------------------------------------------------------- | ---- |
| `types.ts`         | 所有类型定义（State、Actions、Store、Set/Get 类型）        | ~50  |
| `state.ts`         | 初始状态常量 `initialState`                                | ~15  |
| `utils.ts`         | 纯工具函数，无副作用                                       | ~100 |
| `actions.ts`       | `buildActions(set, get)` 高阶函数，包含所有业务逻辑和 HTTP | ~350 |
| `sidebar-store.ts` | Zustand `create()` 入口，组合 state + actions              | ~13  |
| `selectors.ts`     | 细粒度 selectors，防止不必要重渲染                         | ~32  |

### 3.4 为什么不用 Map/Set？

早期版本使用 `Map<string, TreeNode>` 和 `Set<string>`，但在 Zustand 5 + Immer 组合下，运行时出现 `state.nodes` 为 `undefined` 的问题（`enableMapSet()` 未能生效）。因此全部替换为普通对象 `Record`，通过 `Object.keys()`、`in` 运算符、`delete` 操作实现同等功能。

### 3.5 Action 设计规范

所有 Action 通过 `buildActions(set, get)` 创建，遵循以下规范：

- **同步 Action**（如 `activate`、`patch`、`move`）：直接 `set(draft => { ... })`
- **异步 Action**（如 `create`、`expand`、`upload`）：先 HTTP，成功后 `set()` 更新状态
- **返回 ID**：`create`/`upload`/`restore` 返回资源 `string` id，供调用方导航
- **返回导航目标**：`remove(id, currentId)` 返回 `nextId | 'chat' | null`，供调用方决定导航去向
- **错误处理**：不再静默吞掉错误，至少 `console.error('[sidebar] ...', err)`

```typescript
// 示例：create action
async create(parentId, type, name) {
  const parent = get().nodes[parentId];
  if (!parent) throw new Error('Parent not found');

  const response = await http.post<Resource>(
    `/namespaces/${get().namespaceId}/resources`,  // ← 从状态读取 namespaceId
    payload
  );

  set(draft => {
    draft.nodes[response.id] = createNode(response, parentId, parent.spaceType);
    draft.nodes[parentId].children.unshift(response.id);
  });

  get().activate(response.id);  // 激活新节点
  return response.id;           // 返回 ID 供调用方 navigate()
}
```

---

## 4. 适配层

### 4.1 useSidebarInit — 初始化与 URL 同步

职责：

1. **设置 namespaceId**：`store.setNamespaceId(namespaceId)`（替代旧的全局变量）
2. **获取根资源**：HTTP GET `/namespaces/{id}/root` → `store.init(roots)`
3. **自动展开路径**：当 URL `resourceId` 变化时，自动展开到目标节点的所有父节点
4. **自动导航**：无 `resourceId` 且不在 chat 页时，自动导航到第一个资源
5. **同步 activeId**：URL 变化时，`store.activate(resourceId)`

防竞态设计：

- `autoExpandedRef`：防止同一 namespace+resource 重复展开
- `hasAutoNavigatedRef`：防止重复自动导航
- `cancelled` 标志：组件卸载时取消滚动动画

### 4.2 useSidebarEvents — 事件总线适配器

职责：将自定义事件总线 `app.on` 的所有事件翻译为 Store Action。

| 事件                        | 处理                                                       |
| --------------------------- | ---------------------------------------------------------- |
| `start_rename`              | `store.setEditingId(id)`                                   |
| `generate_resource`         | `store.restore(resource)` → `navigate()`                   |
| `delete_resource`           | `store.remove(id)` → `navigate(nextId)` → `toast`          |
| `update_resource`           | `store.patch(id, { name, content })`                       |
| `refresh_resource`          | HTTP GET → `store.patch()` + `setState` 更新 `hasChildren` |
| `expand_resource`           | `store.expandPathTo(id)`                                   |
| `collapse_resource`         | 递归 `store.collapse(id)`                                  |
| `restore_resource`          | `store.restore(resource)` → `navigate()`                   |
| `move_resource`             | `store.move(dragId, dropId)`                               |
| `refresh_resource_children` | HTTP GET → `store.refreshChildren()`                       |
| `scroll_to_resource`        | `store.expandPathTo()` → DOM `scrollIntoView`              |
| `clean_resource`            | `store.clear()`                                            |

**设计决策**：`refresh_resource` 中 `hasChildren` 不是 `SidebarActions.patch` 的公开字段，需要直接通过 `useSidebarStore.setState(draft => { draft.nodes[id].hasChildren = ... })` 更新，已加注释说明。

---

## 5. 组件层

### 5.1 组件职责

| 组件              | 职责                                                  |
| ----------------- | ----------------------------------------------------- |
| `MainSidebar`     | Shell，调用 `useSidebarInit()` + `useSidebarEvents()` |
| `ResourceTree`    | DndProvider 容器，处理拖拽时的自动滚动                |
| `SpaceSection`    | 空间根节点，支持文件/资源拖拽上传，创建菜单           |
| `ResourceNode`    | 单节点，拖拽源/目标，展开/折叠，行内重命名，导航      |
| `NodeActions`     | 悬浮操作按钮：创建、编辑、重命名、移动、删除          |
| `NodeContextMenu` | 右键菜单，功能同 NodeActions                          |

### 5.2 状态读取方式

组件使用三种方式读取状态：

1. **Selector Hook**（推荐）：

   ```tsx
   const node = useNode(nodeId); // 只订阅该节点
   const isActive = useIsActive(nodeId); // 只订阅 activeId
   const rootId = useRootId(spaceType); // 只订阅 rootIds
   ```

2. **内联 Selector**（简单场景）：

   ```tsx
   const activeId = useSidebarStore(s => s.activeId);
   const isUploading = useSidebarStore(s => nodeId in s.uploading);
   ```

3. **直接访问**（事件处理中）：
   ```tsx
   const store = useSidebarStore.getState();
   store.expand(nodeId);
   ```

### 5.3 拖拽架构

使用 `react-dnd` + `react-dnd-html5-backend`（桌面）/ `TouchBackend`（移动端）：

- **Drag**：`ResourceNode` 自身作为拖拽源，类型为 `'card'`
- **Drop（资源）**：`ResourceNode` 和 `SpaceSection` 都接受 `'card'` 类型，HTTP POST move 成功后 `app.fire('move_resource', ...)`
- **Drop（文件）**：`ResourceNode` 和 `SpaceSection` 接受 `NativeTypes.FILE`，验证扩展名后 `store.upload()`

---

## 6. 数据流

### 6.1 创建资源

```
用户点击「新建文档」
  → SpaceSection.onClick
    → store.create(parentId, 'doc')
      → HTTP POST /namespaces/{ns}/resources
      → set(draft => { draft.nodes[newId] = ... })
      → return newId
    → navigate(`/${ns}/${newId}/edit`)
```

### 6.2 删除资源

```
用户点击「删除」
  → deleteResource({ id, parentId, ns, app })
    → HTTP DELETE /namespaces/{ns}/resources/{id}
    → app.fire('delete_resource', id, parentId)
      → useSidebarEvents
        → store.remove(id, currentResourceId)
          → set(draft => { delete draft.nodes[id]; ... })
          → return nextId
        → navigate(nextId ? `/${ns}/${nextId}` : '/chat')
        → toast.success('已移至回收站', { undo: ... })
```

### 6.3 移动资源

```
用户拖拽资源 A 到资源 B
  → react-dnd drop
    → HTTP POST /namespaces/{ns}/resources/{A}/move/{B}
    → app.fire('move_resource', A, B)
      → useSidebarEvents
        → store.move(A, B)
          → set(draft => { ... })  // 纯 UI 更新
```

**关键设计**：HTTP 和 UI 更新分离。`store.move()` 只做乐观 UI 更新，HTTP 请求由拖拽处理器单独发起。这样即使 HTTP 失败，也不会导致状态回滚复杂化。

---

## 7. 类型速查

### 7.1 Store 类型

```typescript
type SidebarStore = SidebarState & SidebarActions;

type SidebarSet = (fn: (draft: SidebarStore) => void) => void;
type SidebarGet = () => SidebarStore;
```

### 7.2 Action 签名

```typescript
interface SidebarActions {
  setNamespaceId: (id: string) => void;
  init: (roots: Record<string, Resource>) => void;

  expand: (id: string) => Promise<void>;
  collapse: (id: string) => void;
  toggleSpace: (spaceType: SpaceType, open?: boolean) => void;
  expandPathTo: (targetId: string) => Promise<void>;

  create: (
    parentId: string,
    type: ResourceType,
    name?: string
  ) => Promise<string>;
  remove: (id: string, currentResourceId?: string) => string | null;
  rename: (id: string, name: string) => Promise<void>;
  move: (dragId: string, dropId: string) => void;
  upload: (parentId: string, files: FileList) => Promise<string>;

  activate: (id: string | null) => void;
  setEditingId: (id: string | null) => void;

  patch: (
    id: string,
    updates: Partial<Pick<TreeNode, 'name' | 'content'>>
  ) => void;
  refreshChildren: (parentId: string, resources: Resource[]) => void;
  restore: (resource: Resource) => void;
  clear: () => void;
}
```

### 7.3 Selector 列表

```typescript
useNode(id: string): TreeNode | undefined;
useActiveId(): string | null;
useIsActive(id: string): boolean;
useEditingId(): string | null;
useIsEditing(id: string): boolean;
useIsSpaceExpanded(spaceType: string): boolean;
useRootId(spaceType: string): string;
```

---

## 8. 注意事项

1. **不要直接修改 `nodes` 对象** — 所有修改必须通过 `set(draft => { ... })`，Immer 会处理不可变性
2. **不要在 Store 中调用 `navigate()`** — Store 只返回 ID，导航由调用方负责
3. **不要新增静默 `.catch(() => {})`** — 至少 `console.error` 记录错误
4. **新增 HTTP 请求时** — 通过 `get().namespaceId` 读取当前 namespace，不要引入新的全局变量
5. **新增字段到 TreeNode 时** — 同步更新 `createNode()` 和 `patch()` 的允许字段列表

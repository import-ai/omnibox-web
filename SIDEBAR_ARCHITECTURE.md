# Sidebar 架构文档

> 文档版本：2025-04-20（重构后）  
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
│  store/types.ts / api.ts / actions.ts   │
│  store/utils.ts / index.ts              │
└─────────────────────────────────────────┘
```

**核心设计原则**：

- **Store 不依赖 React Router** — 所有 Action 返回资源 ID，由调用方负责 `navigate()`
- **状态控制所有逻辑** — Store Action 统一封装 HTTP + UI 更新，UI 层只根据状态变更渲染
- **扁平化状态** — `Record<string, TreeNode>` 替代嵌套树，更新 O(1)
- **UI 状态与数据分离** — `expanded/loading/loaded` 等 UI 状态从 `TreeNode` 剥离到独立的 `ui: Record<string, NodeUI>`
- **事件总线仅限跨模块** — 只有 genuinely cross-module 的事件（editor/trash/AI → sidebar）使用事件总线；Sidebar 内部逻辑直接调用 Store Action
- **细粒度订阅** — Zustand selectors 保证只有真正用到的组件重渲染

---

## 2. 目录结构

```
src/page/sidebar/
├── index.tsx                          # 主入口：调用 useSidebarInit + useSidebarEvents
├── hooks/
│   ├── use-sidebar-init.ts            # 初始化：根资源获取、URL 同步、自动展开/导航
│   ├── use-sidebar-events.ts          # 事件适配：app.on → store.action（仅限跨模块事件）
│   └── use-node-actions.ts            # 节点操作 hook：创建、上传、删除、移动、添加到 Chat
├── store/
│   ├── types.ts                       # 类型定义 + 初始状态
│   ├── api.ts                         # sidebarApi：HTTP 封装（move/rename/restore/upload 等）
│   ├── utils.ts                       # 纯函数：createNode, collectParentIds, detectSpaceType 等
│   ├── actions.ts                     # buildActions(set, get) — 所有业务逻辑 + HTTP 调用
│   └── index.ts                       # Zustand create() + 所有 selectors
└── components/resource-tree/
    ├── index.tsx                      # DndProvider 容器
    ├── space-section.tsx              # 空间根节点（private / teamspace），DnD 目标
    ├── resource-node.tsx              # 单节点：拖拽源/目标，展开/折叠，本地行内编辑，导航
    ├── node-actions.tsx               # 悬浮操作按钮（DropdownMenu）
    ├── node-context-menu.tsx          # 右键菜单（ContextMenu）
    └── create-folder-dialog.tsx       # 创建文件夹弹窗
```

---

## 3. 状态层（Store）

### 3.1 状态形状

```typescript
interface SidebarState {
  namespaceId: string; // 当前命名空间
  nodes: Record<string, TreeNode>; // 扁平化节点存储，key = resourceId
  ui: Record<string, NodeUI>; // UI 状态（与数据分离）
  rootIds: Record<SpaceType, string>; // { private: 'uuid', teamspace: 'uuid' }
  activeId: string | null; // 当前高亮资源
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
  attrs?: Record<string, unknown>;
  tags?: TagDto[];
  path?: PathItem[];
  hasChildren: boolean;
  currentPermission?: Permission;
  globalPermission?: Permission;
  createdAt: string;
  updatedAt: string;

  // 子节点 ID 列表（有序）
  children: string[];
}

interface NodeUI {
  expanded: boolean; // 是否展开
  loading: boolean; // 是否正在加载子节点
  loaded: boolean; // 子节点是否已加载过
}
```

> **重构要点**：`expanded/loading/loaded` 已从 `TreeNode` 剥离到 `NodeUI`，存入独立的 `ui` Record。这使得数据层与 UI 层完全解耦，避免服务端数据与客户端 UI 状态混在一起。

### 3.3 Store 文件职责

| 文件         | 职责                                                           | 行数 |
| ------------ | -------------------------------------------------------------- | ---- |
| `types.ts`   | 所有类型定义（State、Actions、Store、Set/Get）+ `initialState` | ~90  |
| `api.ts`     | `sidebarApi` 对象，封装所有 sidebar 相关 HTTP 请求             | ~80  |
| `utils.ts`   | 纯工具函数，无副作用                                           | ~150 |
| `actions.ts` | `buildActions(set, get)` 高阶函数，包含所有业务逻辑和 HTTP     | ~530 |
| `index.ts`   | Zustand `create()` 入口 + 所有 selectors 导出                  | ~78  |

### 3.4 为什么不用 Map/Set？

早期版本使用 `Map<string, TreeNode>` 和 `Set<string>`，但在 Zustand 5 + Immer 组合下，运行时出现 `state.nodes` 为 `undefined` 的问题（`enableMapSet()` 未能生效）。因此全部替换为普通对象 `Record`，通过 `Object.keys()`、`in` 运算符、`delete` 操作实现同等功能。

### 3.5 Action 设计规范

所有 Action 通过 `buildActions(set, get)` 创建，遵循以下规范：

- **状态控制所有逻辑** — Store Action 统一封装 HTTP + UI 更新。外部只调用 `store.move()` / `store.restore()`，由 store 内部完成完整流程
- **同步 Action**（如 `activate`、`patch`、`collapse`）：直接 `set(draft => { ... })`
- **异步 Action**（如 `create`、`expand`、`upload`、`move`）：先 HTTP，成功后 `set()` 更新状态
- **返回 ID**：`create`/`upload`/`restore` 返回资源 `string` id，供调用方导航
- **返回导航目标**：`remove(id, currentId)` 返回 `{ nextId, navigateToChat }`，供调用方决定导航去向
- **错误处理**：不再静默吞掉错误，至少 `console.error('[sidebar] ...', err)`

```typescript
// 示例：create action
async create(parentId, type, name) {
  const parent = get().nodes[parentId];
  if (!parent) throw new Error('Parent not found');

  const response = await sidebarApi.create(get().namespaceId, {
    parentId,
    resourceType: type,
    name,
  });

  set(draft => {
    draft.nodes[response.id] = createNode(response, parentId, parent.spaceType);
    draft.nodes[parentId].children.unshift(response.id);
  });

  get().activate(response.id);
  return response.id;
}
```

---

## 4. 适配层

### 4.1 useSidebarInit — 初始化与 URL 同步

职责：

1. **设置 namespaceId**：`store.setNamespaceId(namespaceId)`
2. **获取根资源**：HTTP GET `/namespaces/{id}/root` → `store.init(roots)`
3. **自动展开路径**：当 URL `resourceId` 变化时，自动展开到目标节点的所有父节点
4. **自动导航**：无 `resourceId` 且不在 chat 页时，自动导航到第一个资源
5. **同步 activeId**：URL 变化时，`store.activate(resourceId)`

防竞态设计：

- `autoExpandedRef`：防止同一 namespace+resource 重复展开
- `hasAutoNavigatedRef`：防止重复自动导航
- `cancelled` 标志：组件卸载时取消滚动动画

### 4.2 useSidebarEvents — 事件总线适配器

职责：将**跨模块**自定义事件翻译为 Store Action。Sidebar 内部逻辑直接调用 Store，不走事件总线。

| 事件                        | 处理                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `generate_resource`         | `await store.restore(resource)` → `navigate()`                                     |
| `delete_resource`           | `store.remove(id)` → `navigate(nextId)` → `toast`（undo 调用 `store.restore(id)`） |
| `update_resource`           | `store.patch(id, { name, content })`                                               |
| `restore_resource`          | `await store.restore(resource)` → `navigate()`                                     |
| `expand_resource`           | `store.expandPathTo(id)`                                                           |
| `collapse_resource`         | 递归 `store.collapse(id)`                                                          |
| `refresh_resource`          | HTTP GET → `store.patch()` + `setState` 更新 `hasChildren`                         |
| `refresh_resource_children` | HTTP GET → `store.refreshChildren()`                                               |
| `scroll_to_resource`        | `store.expandPathTo()` → DOM `scrollIntoView`                                      |
| `clean_resource`            | `store.clear()`                                                                    |

> **重构要点**：`move_resource` 事件监听器已删除。移动操作统一由 `store.move()` 封装 HTTP + UI，不再通过事件总线通知 sidebar 做纯 UI 更新。

---

## 5. 组件层

### 5.1 组件职责

| 组件              | 职责                                                   |
| ----------------- | ------------------------------------------------------ |
| `MainSidebar`     | Shell，调用 `useSidebarInit()` + `useSidebarEvents()`  |
| `ResourceTree`    | DndProvider 容器，处理拖拽时的自动滚动                 |
| `SpaceSection`    | 空间根节点，支持文件/资源拖拽上传，创建菜单            |
| `ResourceNode`    | 单节点：拖拽源/目标，展开/折叠，**本地行内编辑**，导航 |
| `NodeActions`     | 悬浮操作按钮：创建、编辑、重命名、移动、删除           |
| `NodeContextMenu` | 右键菜单，功能同 NodeActions                           |

### 5.2 行内编辑状态本地化（重构要点）

`editingId` 已从全局 Store 移除，行内编辑状态使用本地 `useState`：

```tsx
// resource-node.tsx
const [isEditing, setIsEditing] = useState(false);
const [editName, setEditName] = useState('');
```

- 双击节点名称 → `setIsEditing(true)`
- `onBlur` / `Enter` → 保存（调用 `store.rename()`）
- `Escape` → 取消编辑
- 拖拽时 `canDrag: () => !isEditing`，防止编辑时误拖拽

> 为什么移除全局 `editingId`？行内编辑是纯粹的组件级 UI 状态，不涉及跨组件通信，不需要全局状态。移除后减少了 Store 复杂度，避免了 `useEditingId` selector 带来的不必要重渲染。

### 5.3 状态读取方式

组件使用三种方式读取状态：

1. **Selector Hook**（推荐）：

   ```tsx
   const node = useNode(nodeId); // 只订阅该节点
   const isActive = useIsActive(nodeId); // 只订阅 activeId
   const rootId = useRootId(spaceType); // 只订阅 rootIds
   const isUploading = useIsUploading(id); // 只订阅 uploading
   ```

2. **内联 Selector**（简单场景）：

   ```tsx
   const activeId = useSidebarStore(s => s.activeId);
   const isExpanded = useSidebarStore(s => s.ui[nodeId]?.expanded);
   ```

3. **直接访问**（事件处理中）：

   ```tsx
   const store = useSidebarStore.getState();
   store.expand(nodeId);
   ```

### 5.4 拖拽架构

使用 `react-dnd` + `react-dnd-html5-backend`（桌面）/ `TouchBackend`（移动端）：

- **Drag**：`ResourceNode` 自身作为拖拽源，类型为 `'card'`
- **Drop（资源）**：`ResourceNode` 和 `SpaceSection` 都接受 `'card'` 类型，释放时直接调用 `store.move(dragId, dropId)`（HTTP + UI 统一处理）
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
          → return { nextId, navigateToChat }
        → navigate(nextId ? `/${ns}/${nextId}` : '/chat')
        → toast.success('已移至回收站', { undo: ... })
          → undo 调用 store.restore(id)  // 传 string，store 内部做 HTTP + UI
```

### 6.3 移动资源

**Sidebar 内部拖拽**：

```
用户拖拽资源 A 到资源 B
  → react-dnd drop (ResourceNode / SpaceSection)
    → store.move(A, B)
      → HTTP POST /namespaces/{ns}/resources/{A}/move/{B}
      → set(draft => { ... })  // UI 更新
```

**Resource Page 的 MoveTo 对话框**：

```
用户在 resource page 点击「移动到」
  → MoveTo 对话框打开
  → 用户选择目标文件夹
    → onFinished(resourceId, targetId)
      → handleMoveFinished
        → store.move(resourceId, targetId)
          → HTTP POST /namespaces/{ns}/resources/{id}/move/{targetId}
          → set(draft => { ... })
```

> **重构要点**：`store.move()` 统一封装 HTTP + UI 更新。不存在 `moveHttp` 和 `move` 两个 action。Resource Page 的 MoveTo 对话框不再直接做 HTTP，仅负责 UI 交互和回调。

### 6.4 恢复资源

```
// 场景 1：从回收站恢复（trash 模块已做 HTTP）
Trash Page 点击恢复
  → HTTP POST /namespaces/{ns}/resources/{id}/restore
  → app.fire('restore_resource', resource)
    → useSidebarEvents
      → await store.restore(resource)  // 传 Resource，只做 UI 更新
      → navigate(`/${ns}/${id}`)

// 场景 2：Undo 删除（undo toast）
Delete 后点击撤销
  → store.restore(id)  // 传 string，store 内部做 HTTP + UI
    → HTTP POST /namespaces/{ns}/resources/{id}/restore
    → set(draft => { ... })
    → return restoredId
```

> **重构要点**：`store.restore(resourceOrId)` 根据参数类型自动判断行为：
>
> - 传 `string`（资源 ID）→ 做 HTTP restore + UI 更新
> - 传 `Resource`（完整对象）→ 只做 UI 更新（调用方已做 HTTP）

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
  init: (roots: Record<string, RootResource>) => void;

  expand: (id: string) => Promise<void>;
  collapse: (id: string) => void;
  toggleSpace: (spaceType: SpaceType, open?: boolean) => void;
  expandPathTo: (
    targetId: string,
    options?: { expandTarget?: boolean }
  ) => Promise<void>;

  create: (
    parentId: string,
    type: ResourceType,
    name?: string
  ) => Promise<string>;
  remove: (id: string, currentResourceId?: string) => RemoveResult;
  rename: (id: string, name: string) => Promise<void>;
  move: (dragId: string, dropId: string) => Promise<void>;
  upload: (parentId: string, files: FileList) => Promise<string>;

  activate: (id: string | null) => void;

  patch: (
    id: string,
    updates: Partial<Pick<TreeNode, 'name' | 'content'>>
  ) => void;
  refreshChildren: (parentId: string, resources: Resource[]) => void;
  restore: (resourceOrId: Resource | string) => Promise<string>;
  clear: () => void;
}
```

### 7.3 Selector 列表

```typescript
useNode(id: string): TreeNode | undefined;
useActiveId(): string | null;
useIsActive(id: string): boolean;
useIsSpaceExpanded(spaceType: SpaceType): boolean;
useRootId(spaceType: SpaceType): string;
useNodesSize(): number;
useIsUploading(id: string): boolean;
useUploadProgress(id: string): string | undefined;
```

---

## 8. 重构变更日志

### PR-1：Store 合并（状态与 UI 分离）

- 7 个分散的 store 文件合并为统一的 `store.ts`
- `expanded/loading/loaded` 从 `TreeNode` 剥离到 `ui: Record<string, NodeUI>`
- 引入 `NodeUI` 类型，实现数据层与 UI 层解耦

### PR-2：行内编辑本地化

- `editingId` 从全局 Store 迁移到 `ResourceNode` 本地 `useState`
- 删除 `setEditingId` action 和 `useEditingId` / `useIsEditing` selectors
- 减少全局状态复杂度，消除无关重渲染

### Store 目录重构

- 单体 883 行 `store.ts` 拆分为 `store/` 目录：
  - `types.ts` — 类型 + 初始状态
  - `api.ts` — HTTP 封装
  - `utils.ts` — 纯工具函数
  - `actions.ts` — 业务逻辑
  - `index.ts` — Zustand 入口 + selectors

### Hooks 层级统一

- `use-node-actions.ts` 从 `resource-tree/hooks/` 提升到 `sidebar/hooks/`
- 明确 hooks 归属：sidebar 级别的 hook 放在 `sidebar/hooks/`

### Action 统一（HTTP + UI 合并）

- `moveHttp` → `move`：`store.move()` 统一封装 HTTP POST + UI 更新
- `restoreHttp` → `restore`：`store.restore(resourceOrId)` 根据参数类型自动判断：
  - `string` → HTTP restore + UI
  - `Resource` → 纯 UI（调用方已做 HTTP）
- `move_resource` 事件监听器删除，移动不再通过事件总线
- Resource Page 的 MoveTo 对话框不再直接做 HTTP，仅回调 `onFinished`

### 运行时修复与类型安全

- 修复 `tsconfig.json` 使类型检查真正生效
- 修复 12 个跨模块严格模式类型错误
- 补全缺失导入、移除多余参数

---

## 9. 注意事项

1. **不要直接修改 `nodes` 对象** — 所有修改必须通过 `set(draft => { ... })`，Immer 会处理不可变性
2. **不要在 Store 中调用 `navigate()`** — Store 只返回 ID，导航由调用方负责
3. **不要新增静默 `.catch(() => {})`** — 至少 `console.error` 记录错误
4. **新增 HTTP 请求时** — 通过 `get().namespaceId` 读取当前 namespace，不要引入新的全局变量；优先放入 `sidebarApi`
5. **新增字段到 TreeNode 时** — 同步更新 `createNode()` 和 `patch()` 的允许字段列表
6. **UI 状态新增时** — 放入 `NodeUI` 和 `ensureUI()`，不要加到 `TreeNode`
7. **Action 设计原则** — Store 统一封装 HTTP + UI，外部只调用单一 action，不要拆分 `xxxHttp` / `xxx`

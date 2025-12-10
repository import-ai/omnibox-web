# Omnibox Web

[English](./README.md) | 中文版

一个基于 React、TypeScript 和 Vite 构建的现代化 Web 应用，具备聊天功能、资源管理和协作工具。

## 功能特性

- **聊天界面**：支持实时消息、Markdown 渲染、代码语法高亮和 LaTeX 公式
- **资源管理**：文件/文件夹组织，支持拖拽、分享和权限管理
- **用户管理**：用户认证、邀请系统和基于角色的访问控制
- **第三方集成**：支持 Google 和微信登录
- **国际化**：基于 i18next 的多语言支持
- **深色模式**：主题切换支持
- **响应式设计**：针对移动端和桌面端优化

## 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **UI 组件**：Radix UI + Tailwind CSS
- **表单处理**：React Hook Form + Zod
- **Markdown 渲染**：React Markdown，支持 KaTeX 和语法高亮
- **状态管理**：React Context + Hooks
- **路由**：React Router v7
- **实时通信**：Socket.io Client
- **代码质量**：ESLint + Prettier + Husky

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 10.17.1

### 安装

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 生产环境构建
pnpm build

# 预览生产构建
pnpm preview
```

### 开发

```bash
# 运行代码检查
pnpm lint

# 自动修复代码问题
pnpm lint:fix

# 格式化代码
pnpm format
```

## 项目结构

```
src/
├── components/       # 可复用的 UI 组件
├── page/            # 页面组件
│   ├── chat/        # 聊天界面
│   ├── resource/    # 资源管理
│   ├── user/        # 用户管理
│   └── sidebar/     # 侧边栏导航
├── hooks/           # 自定义 React Hooks
├── layout/          # 布局组件
└── ...
```

## 可用脚本

- `pnpm dev` - 启动开发服务器
- `pnpm build` - 生产环境构建
- `pnpm preview` - 预览生产构建
- `pnpm lint` - 运行 ESLint 和 Prettier 检查
- `pnpm lint:fix` - 自动修复代码问题
- `pnpm format` - 使用 Prettier 格式化代码

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

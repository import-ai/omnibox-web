# Omnibox Web

English | [简体中文](./README.zh-CN.md)

A modern web application built with React, TypeScript, and Vite, featuring chat functionality, resource management, and collaborative tools.

## Features

- **Chat Interface**: Real-time messaging with markdown support, code syntax highlighting, and LaTeX rendering
- **Resource Management**: File/folder organization with drag-and-drop, sharing, and permissions
- **User Management**: User authentication, invitation system, and role-based access control
- **Third-party Integration**: Google and WeChat login support
- **Internationalization**: Multi-language support with i18next
- **Dark Mode**: Theme switching support
- **Responsive Design**: Mobile and desktop optimized

## Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Components**: Radix UI + Tailwind CSS
- **Form Handling**: React Hook Form + Zod
- **Markdown Rendering**: React Markdown with KaTeX and syntax highlighting
- **State Management**: React Context + Hooks
- **Routing**: React Router v7
- **Real-time Communication**: Socket.io Client
- **Code Quality**: ESLint + Prettier + Husky

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 10.17.1

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Development

```bash
# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── page/            # Page components
│   ├── chat/        # Chat interface
│   ├── resource/    # Resource management
│   ├── user/        # User management
│   └── sidebar/     # Sidebar navigation
├── hooks/           # Custom React hooks
├── layout/          # Layout components
└── ...
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint and Prettier checks
- `pnpm lint:fix` - Fix linting issues automatically
- `pnpm format` - Format code with Prettier

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

# DEVELOPER.md

This file provides guidance to developer when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build

# Linting and formatting
pnpm lint          # Check ESLint + Prettier
pnpm lint:fix      # Auto-fix issues
```

## Architecture Overview

This is a React 18 + TypeScript web application built with Vite. The app is a collaborative workspace with chat, resource management, and user management features.

### Routing (React Router v7)

Routes are defined in `src/App.tsx` using `createBrowserRouter` with lazy loading:

- `/user/*` - Authentication (login, register, OTP verification, invite acceptance)
- `/:namespace_id` - Main workspace with sidebar layout
  - `/:resource_id` - Resource viewer
  - `/chat/:conversation_id` - Chat interface
- `/s/:share_id` - Public share access

### State Management (Event-Driven)

No Redux/Zustand. Uses a custom event system:

- **`Hook` class** (`src/hooks/hook.class.ts`) - Observer pattern with `on()`, `fire()`, `addFilter()`
- **`CoreApp`** (`src/hooks/app.class.ts`) - App-wide event bus extending Hook
- **`AppContext`** (`src/hooks/app-context.ts`) - React Context providing app instance via `useApp()`

Components communicate via events:

```typescript
app.fire('update_resource', resource); // emit
app.on('update_resource', callback); // listen
```

### API Layer

**HTTP Client** (`src/lib/request.ts`):

- Axios instance with base URL `/api/v1`
- Auto-injects Bearer token, language header
- Handles 401/token expiration with redirect to login
- **Error handling**: Errors are automatically toasted by default (using server message or status-based i18n message). Business code should NOT toast errors again to avoid duplicates.
- Use `{ mute: true }` config to suppress automatic error toasts when you need custom error handling

**Key endpoints**:

- `/namespaces` - Workspace management
- `/namespaces/{id}/resources` - Document/file CRUD
- `/namespaces/{id}/chat` - Chat conversations
- `/user/{id}` - User management

### Authentication

Credentials managed in `src/page/user/util.tsx`:

- `setGlobalCredential(userId, token)` - Stores in localStorage + secure cookie
- `removeGlobalCredential()` - Clears auth data
- Layout component (`src/layout/index.tsx`) redirects unauthenticated users

### Key Hooks

- `useApp()` - Access CoreApp event bus
- `useUser()` - Fetch/update user data with cross-tab sync
- `useNamespace()` - Load namespace data
- `useResource()` - Load resource with event-driven updates
- `useAsync()` - Generic async state helper

### Component Organization

- `src/page/` - Feature pages (chat, resource, user, sidebar, share)
- `src/components/` - Reusable UI (Radix UI primitives in `ui/`)
- `src/hooks/` - Custom hooks and state management
- `src/lib/` - Utilities (`request.ts`, `utils.ts`, `websocket.ts`)
- `src/i18n/` - Internationalization (en-US, zh-CN)

### Key Patterns

**Sidebar** (`src/page/sidebar/`): Tree view with react-dnd for drag-and-drop resource organization.

**Chat** (`src/page/chat/`): Streaming messages via `src/lib/stream-transport.ts`, context-aware conversations using resources.

**Resources**: Vditor markdown editor, file uploads with progress, permission-based access.

**Cross-tab sync**: localStorage events sync theme, language, and user data across browser tabs.

## Git Commit Guidelines

**Format**: `type(scope): Description`

**Types**:

- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `style` - Styling changes
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test additions or changes
- `chore` - Maintenance tasks
- `revert` - Revert previous commits
- `build` - Build system changes

**Rules**:

- Scope is required (e.g., `sidebar`, `tasks`, `auth`)
- Description in sentence case with capital first letter
- Use present tense action verbs (Add, Fix, Support, Update, Replace, Optimize)
- No period at the end
- Keep it concise and focused

**Examples**:

```
feat(apple): Support apple signin
fix(sidebar): Change the abnormal scrolling
chore(children): Optimize children api
refactor(tasks): Add timeout status
```

**Do NOT include**:

- "Generated with Claude Code" or similar attribution
- "Co-Authored-By: Claude" or any Claude co-author tags

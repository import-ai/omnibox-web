# DEVELOPER.md

This file provides guidance to agents and developers working in the web repository. `AGENTS.md` and `CLAUDE.md` are symlinks to this file, so update this document when web practices change.

## Commands

Use Node 22 (see `.nvmrc`) and pnpm (the package manager is pinned in `package.json`).

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build
pnpm preview       # Build and preview locally

# Linting and formatting
pnpm lint          # Check ESLint + Prettier
pnpm lint:fix      # Auto-fix issues
pnpm format        # Prettier write only
```

## Architecture Overview

This is a React 18 + TypeScript web application built with Vite 7. The app is a collaborative workspace with chat, resource management, resource sharing, OAuth, and user management features.

### Framework Conventions

- Use the `@/*` path alias for imports from `src/`.
- UI is built with Tailwind CSS plus Radix/shadcn-style primitives in `src/components/ui/`.
- Prefer existing components from `src/components/` before creating new UI primitives.
- Keep source in TypeScript/TSX and preserve existing formatting; `pnpm lint:fix` runs ESLint and Prettier.
- When adding user-facing text, update both `src/i18n/locales/en.json` and `src/i18n/locales/zh.json`.

### Routing (React Router v7)

Routes are defined in `src/App.tsx` using `createBrowserRouter` with lazy loading:

- `/user/*` - Authentication and account flows (login, sign-up, OTP verification, invite acceptance, account deletion)
- `/user/auth/confirm`, `/user/auth/confirm/google` - WeChat and Google auth callbacks
- `/oauth/authorize` - OAuth authorization screen
- `/:namespace_id` - Main workspace with sidebar layout
  - `/:resource_id?` - Resource viewer
  - `/:resource_id/edit` - Resource editor
  - `/chat`, `/chat/conversations`, `/chat/:conversation_id` - Chat interface
- `/s/:share_id` - Public share access
  - `/:resource_id` - Shared resource viewer
  - `/chat`, `/chat/:conversation_id` - Shared chat interface
- `/invite/:namespace_id/:invitation_id` and `/invite/confirm` - Invitation flows
- `/welcome` - Welcome/onboarding page

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
- `/namespaces/{id}/resources` - Document/file CRUD, trash, revision history, attachments
- `/namespaces/{id}/chat` - Chat conversations
- `/shares/{id}` - Public share resources and shared chat
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

- `src/page/` - Feature pages (chat, resource, user, sidebar, share, shared-chat, shared-resource, oauth, welcome)
- `src/components/` - Reusable UI (Radix UI primitives in `ui/`)
- `src/hooks/` - Custom hooks and state management
- `src/lib/` - Utilities (`request.ts`, `utils.ts`, `websocket.ts`, upload/download helpers, stream transport)
- `src/i18n/` - Internationalization (en-US, zh-CN)
- `src/layout/` - Auth-aware shell, namespace layout, and route error UI
- `src/assets/`, `public/` - Static assets and PWA manifests

### Key Patterns

**Sidebar** (`src/page/sidebar/`): Tree view with react-dnd for drag-and-drop resource organization.

**Chat** (`src/page/chat/`): Streaming messages via `src/lib/stream-transport.ts`, context-aware conversations using resources.

**Resources** (`src/page/resource/`): Vditor markdown editor, file uploads with progress, resource actions, permission-based access, and event-driven updates.

**Resource history** (`src/page/resource/actions/history.tsx`): The actions menu opens a Sheet that fetches `GET /namespaces/:namespaceId/resources/:resourceId/revisions`, expects snake_case fields from the API, and restores via `POST /namespaces/:namespaceId/resources/:resourceId/revisions/:revisionId/restore`. After restore, fire `app.fire('update_resource', updated)` and call `onResource(updated)` so the editor/sidebar state refreshes.

**Uploads and attachments**: Use helpers in `src/lib/upload-files.ts` and existing resource action patterns so progress, toasts, and attachment URL rewrites stay consistent with Vite proxy rules.

**Cross-tab sync**: localStorage events sync theme, language, and user data across browser tabs.

**HTTP errors**: `src/lib/request.ts` automatically shows error toasts. Only add custom error toasts when the request uses `{ mute: true }` or when handling a successful business state.

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

- "Generated with xxx" or similar attribution
- "Co-Authored-By: xxx" or any co-author tags

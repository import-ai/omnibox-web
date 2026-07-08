# AGENTS.md

This file provides guidance to developer when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build

# Build and serve production bundle locally
pnpm preview

# Linting and formatting
pnpm lint          # Check ESLint + Prettier
pnpm lint:fix      # Auto-fix issues
pnpm format        # Run Prettier only

# Targeted Jest tests (there is no package-level test script)
pnpm exec jest src/page/chat/core/messageOperator.test.ts
```

## Architecture Overview

This is a React 18 + TypeScript web application built with Vite, Tailwind CSS,
shadcn-ui, React Router v7, and Zustand. The app is a collaborative workspace
with chat, resource management, sharing, notifications, and user management.

### Routing (React Router v7)

Routes are defined in `src/App.tsx` using `createBrowserRouter` with lazy loading:

- `/` - Requires login, then redirects to the first namespace chat or `/welcome`
- `/welcome` - Empty-state onboarding for users without namespaces
- `/user/*` - Authentication flows:
  - `/user/login`, `/user/sign-up`, `/user/verify-otp`, `/user/accept-invite`
  - `/user/account/delete/confirm`
  - `/user/auth/confirm`, `/user/auth/miniprogram`, `/user/auth/confirm/google`
- `/oauth/authorize` - OAuth authorization screen
- `/invite/confirm` and `/invite/:namespace_id/:invitation_id` - Invite flows
- `/:namespace_id` - Authenticated workspace with the main sidebar layout
  - `/:resource_id?` - Resource viewer
  - `/:resource_id/edit` - Resource editor
  - `/chat` - Chat home
  - `/chat/conversations` - Chat history
  - `/chat/:conversation_id` - Chat conversation
- `/s/:share_id` - Public share layout
  - index and `/:resource_id` - Shared resource viewer
  - `/chat` and `/chat/:conversation_id` - Shared chat

Search, settings, notifications, people/invite UI, and trash management are
feature UI mounted from the workspace/sidebar flow rather than top-level browser
routes.

### State Management (Event Bus + Local Stores)

The app uses a custom event system for app-wide notifications and scoped
Zustand stores for feature-local, highly interactive state.

- **`Hook` class** (`src/hooks/hook.class.ts`) - Observer pattern with `on()`, `fire()`, `addFilter()`
- **`CoreApp`** (`src/hooks/app.class.ts`) - App-wide event bus extending Hook
- **`AppContext`** (`src/hooks/appContext.ts`) - React Context providing app instance via `useApp()`
- **Zustand stores** - Feature-scoped state for sidebar trees and chat context:
  - `src/page/sidebar/store/` - Main workspace resource tree state
  - `src/page/share/sidebar/store/` - Share page resource tree state
  - `src/page/chat/chatStore.ts` - Persisted selected chat context resources
- **`ShareContext`** (`src/page/share/index.tsx`) - Share page local context for
  public share metadata, active resource, chat context, password state, and wide
  layout state

Use the event bus for cross-feature notifications and app-wide side effects:

```typescript
app.fire('update_resource', resource); // emit
app.on('update_resource', callback); // listen
```

Use Zustand when a feature owns complex local UI state that needs selective
subscriptions, imperative updates from hooks/utilities, or tree manipulation.
Keep stores feature-scoped; do not introduce a global application store unless
the state is genuinely shared across major product areas.

### API Layer

**HTTP Client** (`src/lib/request.ts`):

- Axios instance with base URL from `API_BASE_URL` (`/api/v1`)
- Auto-injects Bearer token, language header
- Handles 401/token expiration with redirect to login
- **Error handling**: Errors are automatically toasted by default (using server message or status-based i18n message). Business code should NOT toast errors again to avoid duplicates.
- Use `{ mute: true }` config to suppress automatic error toasts when you need custom error handling
- Use `{ muteCodes: [...] }` to suppress global toasts only for specific backend error codes.
- API wrappers that are reused outside one component live in `src/service/`
  (`resource.ts`, `share.ts`, `usage.ts`). Keep one-off calls near the feature
  only when they are not reused.

**Dev server proxy** (`vite.config.ts`):

- `/api/v1` proxies to `VITE_API_PATH` or `http://127.0.0.1:8000`
- `/assets/vditor` proxies to `VITE_VDITOR_DIST_PATH` or the hosted fallback
- Attachment URLs are rewritten for namespace and share resource downloads

**Key endpoints**:

- `/namespaces` - Workspace management
- `/namespaces/{id}/root`, `/resources`, `/smart-folders`, `/search` - Resource tree, smart folders, and search
- `/namespaces/{id}/chat` - Chat conversations
- `/namespaces/{id}/usages/*` - Usage/quota-related feature data
- `/shares/{id}` - Public share metadata, resources, and shared chat
- `/user/{id}` - User management

### Authentication

Credentials managed in `src/page/user/util.ts`:

- `setGlobalCredential(userId, token)` - Stores `uid`/`token` in localStorage and
  writes a strict `token` cookie that expires with the JWT
- `removeGlobalCredential()` - Clears auth data
- Layout component (`src/layout/index.tsx`) redirects unauthenticated users,
  redirects `/` to the first namespace or `/welcome`, and handles auth changes
  across tabs by clearing chat/sidebar stores

### Key Hooks

- `useApp()` - Access CoreApp event bus
- `useUser()` - Fetch/update user data with cross-tab sync
- `useNamespace()` - Load namespace data
- `useResource()` - Load resource with event-driven updates
- `useAsync()` - Generic async state helper
- `useNamespaces()`, `useProNamespaces()` - Namespace lists and plan-aware namespace data
- `useQuota()`, `useSmartFolderEntitlements()` - Usage and entitlement data
- `useApiKeys()`, `useApplications()` - Settings integrations data
- `useTheme()` - Theme state and app event wiring

### Component Organization

- `src/page/` - Feature pages (chat, resource, user, sidebar, share)
- `src/components/` - Reusable UI (Radix UI primitives in `ui/`)
- `src/service/` - Reusable API wrappers shared by stores/hooks/features
- `src/hooks/` - Custom hooks and state management
- `src/lib/` - Utilities (`request.ts`, `utils.ts`, `streamTransport.ts`)
- `src/assets/icons/` - App-specific SVG/icon React components
- `src/styles/` - Global third-party style patches
- `src/i18n/` - Internationalization resources (`en`, `zh`)
- Existing shadcn modules live under `src/components/ui/`
- When a reusable local UI module is missing, check https://ui.shadcn.com/llms.txt for available shadcn modules before building one from scratch.
- shadcn config is in `components.json`: style `new-york`, `tsx: true`,
  aliases `@/components`, `@/components/ui`, `@/lib`, `@/hooks`, icon library
  `lucide`.
- Do not manually edit files under `src/components/ui/`; they are shadcn-ui components. Adjust behavior with wrappers or call-site overrides instead.

### File Naming

- Use `.tsx` only for files that contain JSX or define React components.
- Use `.ts` for hooks, utility functions, constants, types, services, stores, and other non-JSX modules.
- `.tsx` filenames must use PascalCase, except route or directory entry files such as `index.tsx`, `main.tsx`, and `App.tsx`.
- `.ts` filenames must use camelCase, except established framework/config/declaration patterns such as `*.d.ts`, `*.test.ts`, and `*.class.ts`.
- Do not create kebab-case source filenames under `src`; update import paths whenever a file is renamed.
- ESLint enforces file naming, unused vars, Prettier, and simple import sorting.

### Key Patterns

**Sidebar** (`src/page/sidebar/`): Tree view with react-dnd for drag-and-drop,
batch operations, smart folders, upload state, and trash/restore flows. Store
actions are split under `src/page/sidebar/store/actions/`; shared resource API
calls come from `src/service/resource.ts`.

**Chat** (`src/page/chat/`): Streaming messages via
`src/lib/streamTransport.ts`, context-aware conversations using persisted
selected resources, history view, shared-chat variants, and small pure helpers
with Jest coverage under `src/page/chat/**`.

**Resources**: Vditor markdown editor, markdown rendering, folder views,
resource conditions, tags/metadata attributes, file uploads with progress, and
permission-based access.

**Share pages** (`src/page/share/`, `src/page/shared-*`): Public share metadata
and password handling live in `SharePage`; share sidebar state is separate from
the authenticated sidebar store.

**Settings/Search/Notifications**: Settings open through the `open_settings`
event. Search and notifications are mounted from sidebar UI and use feature
components instead of route entries.

**Cross-tab sync**: localStorage events sync theme, language, and auth changes
across tabs; auth changes clear chat context and sidebar state.

**PWA/i18n**: Vite PWA is configured without auto registration. i18n updates the
manifest and app title for English/Chinese naming.

## Git Branch Guidelines

**Format**: `type/<short-kebab-description>`

**Rules**:

- Use the same type prefixes and meanings as commit messages: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `revert`, or `build`.
- Keep the description lowercase, kebab-case, and focused on the change.

**Examples**:

```
feat/add-x-link-icon
fix/sidebar-scroll
```

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

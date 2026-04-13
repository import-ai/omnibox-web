/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_USE_WEBSOCKET?: string;
  readonly VITE_FORCE_ASK?: string;
  readonly VITE_FORCE_PRIVATE_SEARCH?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

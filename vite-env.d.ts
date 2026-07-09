/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_FORCE_ASK?: string;
  readonly VITE_FORCE_PRIVATE_SEARCH?: string;
  readonly VITE_OMNIBOX_EDITOR_SAVE_JSON?: string;
  readonly VITE_WECHAT_MP_ENV?: string;
  readonly VITE_CHAT_HOME_DEFAULT_INPUT_ZH?: string;
  readonly VITE_CHAT_HOME_DEFAULT_INPUT_EN?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

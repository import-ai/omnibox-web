import type { TFunction } from 'i18next';

interface GetDefaultHomeInputParams {
  language: string;
  t: TFunction;
  username: string;
}

function getEnvDefaultInput(language: string): string | undefined {
  const value = language.startsWith('zh')
    ? import.meta.env.VITE_CHAT_HOME_DEFAULT_INPUT_ZH
    : import.meta.env.VITE_CHAT_HOME_DEFAULT_INPUT_EN;

  return value?.trim() || undefined;
}

function applyUsername(template: string, username: string): string {
  return template.replaceAll('{username}', username);
}

/**
 * Build the chat home default input from env or i18n templates.
 */
export function getDefaultHomeInput({
  language,
  t,
  username,
}: GetDefaultHomeInputParams): string | undefined {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    return undefined;
  }

  const template =
    getEnvDefaultInput(language) || t('chat.home.default_input').trim();

  if (!template) {
    return undefined;
  }

  return applyUsername(template, normalizedUsername);
}

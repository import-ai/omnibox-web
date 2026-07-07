interface GetDefaultHomeInputParams {
  language: string;
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

export function getDefaultHomeInput({
  language,
  username,
}: GetDefaultHomeInputParams): string | undefined {
  const normalizedUsername = username.trim();

  if (!normalizedUsername) {
    return undefined;
  }

  const template = getEnvDefaultInput(language);

  if (!template) {
    return undefined;
  }

  return applyUsername(template, normalizedUsername);
}

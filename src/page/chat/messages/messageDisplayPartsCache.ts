import type { ChatMessageDisplayPart } from '../chat-input/types';
import { ToolType } from '../chat-input/types';

const CACHE_KEY_PREFIX = 'chat:message-display-parts:v1:';

/** Caches composer order for refreshes in the current browser tab. */
export function cacheMessageDisplayParts(
  messageId: string,
  displayParts: ChatMessageDisplayPart[]
) {
  const storage = getSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(
      `${CACHE_KEY_PREFIX}${messageId}`,
      JSON.stringify(displayParts)
    );
  } catch (error) {
    console.error({ message: 'Failed to cache message display parts', error });
  }
}

/** Returns cached composer order when persisted message attrs do not contain it. */
export function getCachedMessageDisplayParts(
  messageId: string
): ChatMessageDisplayPart[] | undefined {
  const storage = getSessionStorage();
  if (!storage) return undefined;

  try {
    const value = storage.getItem(`${CACHE_KEY_PREFIX}${messageId}`);
    if (!value) return undefined;
    const parsed: unknown = JSON.parse(value);
    return isDisplayParts(parsed) ? parsed : undefined;
  } catch (error) {
    console.error({ message: 'Failed to read message display parts', error });
    return undefined;
  }
}

function getSessionStorage(): Storage | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  try {
    return sessionStorage;
  } catch (error) {
    console.error({ message: 'Session storage is unavailable', error });
    return undefined;
  }
}

function isDisplayParts(value: unknown): value is ChatMessageDisplayPart[] {
  return Array.isArray(value) && value.every(isDisplayPart);
}

function isDisplayPart(value: unknown): value is ChatMessageDisplayPart {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  if (value.type === 'text')
    return 'text' in value && typeof value.text === 'string';
  if (value.type === 'tool') {
    return (
      'tool' in value &&
      (value.tool === ToolType.WEB_SEARCH || value.tool === ToolType.REASONING)
    );
  }
  return (
    value.type === 'resource' &&
    'resource' in value &&
    Boolean(value.resource) &&
    typeof value.resource === 'object' &&
    'id' in value.resource &&
    typeof value.resource.id === 'string' &&
    'name' in value.resource &&
    typeof value.resource.name === 'string'
  );
}

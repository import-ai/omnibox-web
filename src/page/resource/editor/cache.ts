export interface EditorCache {
  title?: string;
  content?: string;
}

export const getCacheKey = (resourceId: string) => resourceId;

export const getCache = (resourceId: string): EditorCache | null => {
  try {
    const cached = localStorage.getItem(getCacheKey(resourceId));
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export const saveCache = (resourceId: string, cache: EditorCache) => {
  try {
    localStorage.setItem(getCacheKey(resourceId), JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to save cache:', e);
  }
};

export const updateCacheTitle = (resourceId: string, title: string) => {
  const cache = getCache(resourceId) || {};
  cache.title = title;
  saveCache(resourceId, cache);
};

export const updateCacheContent = (resourceId: string, content: string) => {
  const cache = getCache(resourceId) || {};
  cache.content = content;
  saveCache(resourceId, cache);
};

export const clearCache = (resourceId: string) => {
  localStorage.removeItem(getCacheKey(resourceId));
};

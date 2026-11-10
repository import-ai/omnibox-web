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

export const clearCacheTitle = (resourceId: string) => {
  const cache = getCache(resourceId);
  if (cache?.title === undefined) {
    return;
  }
  delete cache.title;
  Object.keys(cache).length
    ? saveCache(resourceId, cache)
    : clearCache(resourceId);
};

export const clearCacheContent = (resourceId: string) => {
  const cache = getCache(resourceId);
  if (cache?.content === undefined) {
    return;
  }
  delete cache.content;
  Object.keys(cache).length
    ? saveCache(resourceId, cache)
    : clearCache(resourceId);
};

export const clearCache = (resourceId: string) => {
  localStorage.removeItem(getCacheKey(resourceId));
};

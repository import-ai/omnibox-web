export const getDocsLink = (path: string, lang: string) => {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return lang.startsWith('zh')
    ? `/docs/zh-cn/${normalizedPath}`
    : `/docs/${normalizedPath}`;
};

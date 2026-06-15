const diagramLanguages = ['mermaid', 'echarts'] as const;

export type DiagramLanguage = (typeof diagramLanguages)[number];

export function getDiagramLanguage(language: unknown): DiagramLanguage | null {
  if (typeof language !== 'string') {
    return null;
  }

  const normalizedLanguage = language.trim().toLowerCase();

  return diagramLanguages.find(item => item === normalizedLanguage) ?? null;
}

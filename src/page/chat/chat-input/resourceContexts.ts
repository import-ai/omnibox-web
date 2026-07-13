import type { IResTypeContext } from './types';

/** Keeps the first position and latest value for each resource id. */
export function normalizeResourceContexts(
  contexts: IResTypeContext[]
): IResTypeContext[] {
  const contextsByResourceId = new Map<string, IResTypeContext>();
  contexts.forEach(context => {
    contextsByResourceId.set(context.resource.id, context);
  });
  return Array.from(contextsByResourceId.values());
}

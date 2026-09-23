import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { openFilePicker } from '@/lib/openFilePicker';

import { centerSidebarElement } from './sidebarScroll';
import { useSidebarStore } from './store';

export { centerSidebarElementOnce } from './sidebarScroll';

export const isValidFileType = (fileName: string): boolean => {
  const allowedExtensions = ALLOW_FILE_EXTENSIONS.split(',').map(ext =>
    ext.trim()
  );
  const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(fileExtension);
};

export function triggerGlobalFileUpload(targetId: string) {
  useSidebarStore.getState().setCurrentUploadTargetId(targetId);
  const input = document.getElementById(
    'global-sidebar-file-input'
  ) as HTMLInputElement | null;
  openFilePicker(input);
}

/** Drop smart-folder selection key so locate can highlight the source row. */
export function clearSidebarActiveKeyFromState(state: unknown): {
  changed: boolean;
  nextState: unknown;
} {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { changed: false, nextState: state };
  }
  if (!('sidebarActiveKey' in state)) {
    return { changed: false, nextState: state };
  }
  const rest = { ...(state as Record<string, unknown>) };
  delete rest.sidebarActiveKey;
  return {
    changed: true,
    nextState: Object.keys(rest).length > 0 ? rest : null,
  };
}

export type LocateSidebarResourceOptions = {
  signal?: AbortSignal;
  shouldApply?: () => boolean;
};

function canApplyLocate(options?: LocateSidebarResourceOptions) {
  if (options?.signal?.aborted) return false;
  if (options?.shouldApply && !options.shouldApply()) return false;
  return true;
}

async function expandAndActivateSidebarNode(
  nodeId: string,
  options?: LocateSidebarResourceOptions
) {
  await useSidebarStore.getState().expandPathTo(nodeId, { expandTarget: true });
  if (!canApplyLocate(options)) return false;

  const store = useSidebarStore.getState();
  const node = store.nodes[nodeId];
  if (node) {
    store.toggleSpace(node.spaceType, true);
  }
  store.activate(nodeId);
  return true;
}

export async function locateSidebarResource(
  resourceId: string,
  options?: LocateSidebarResourceOptions
) {
  const applied = await expandAndActivateSidebarNode(resourceId, options);
  if (!applied) return;
  await centerSidebarElement(`[data-resource-id="${resourceId}"]`, {
    options,
  });
}

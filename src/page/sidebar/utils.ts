import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { openFilePicker } from '@/lib/openFilePicker';

import { useSidebarStore } from './store';

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

export async function locateSidebarResource(
  resourceId: string,
  options?: LocateSidebarResourceOptions
) {
  await useSidebarStore
    .getState()
    .expandPathTo(resourceId, { expandTarget: true });
  if (!canApplyLocate(options)) return;

  const store = useSidebarStore.getState();
  const node = store.nodes[resourceId];
  if (node) {
    store.toggleSpace(node.spaceType, true);
  }
  store.activate(resourceId);

  await new Promise<void>(resolve => {
    let attempts = 60;
    let previousTop: number | null = null;
    let stableFrames = 0;
    const scroll = () => {
      if (!canApplyLocate(options)) {
        resolve();
        return;
      }
      const element = document.querySelector(
        `[data-resource-id="${resourceId}"]`
      );
      if (element) {
        const top = Math.round(element.getBoundingClientRect().top);
        stableFrames = top === previousTop ? stableFrames + 1 : 0;
        previousTop = top;
        if (stableFrames >= 1 || attempts === 1) {
          const container = element.closest<HTMLElement>(
            '[data-sidebar="content"]'
          );
          if (container) {
            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            container.scrollTop +=
              elementRect.top -
              containerRect.top -
              (container.clientHeight - elementRect.height) / 2;
          } else {
            element.scrollIntoView({ block: 'center' });
          }
          resolve();
          return;
        }
      }
      attempts -= 1;
      if (attempts > 0) {
        requestAnimationFrame(scroll);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(scroll);
  });
}

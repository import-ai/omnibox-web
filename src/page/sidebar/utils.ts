import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { openFilePicker } from '@/lib/openFilePicker';

import { centerSidebarElementOnce } from './sidebarScroll';
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

async function centerSidebarElement(
  selector: string,
  {
    attempts = 60,
  }: {
    attempts?: number;
  } = {}
) {
  await new Promise<void>(resolve => {
    let remainingAttempts = attempts;
    let previousTop: number | null = null;
    let stableFrames = 0;
    const scroll = () => {
      const element = document.querySelector(selector);
      if (element) {
        const top = Math.round(element.getBoundingClientRect().top);
        stableFrames = top === previousTop ? stableFrames + 1 : 0;
        previousTop = top;
        if (stableFrames >= 1 || remainingAttempts === 1) {
          centerSidebarElementOnce(selector);
          resolve();
          return;
        }
      }
      remainingAttempts -= 1;
      if (remainingAttempts > 0) {
        requestAnimationFrame(scroll);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(scroll);
  });
}

async function expandAndActivateSidebarNode(nodeId: string) {
  await useSidebarStore.getState().expandPathTo(nodeId, { expandTarget: true });
  const store = useSidebarStore.getState();
  const node = store.nodes[nodeId];
  if (node) {
    store.toggleSpace(node.spaceType, true);
  }
  store.activate(nodeId);
}

export async function locateSidebarResource(resourceId: string) {
  await expandAndActivateSidebarNode(resourceId);
  await centerSidebarElement(`[data-resource-id="${resourceId}"]`);
}

/** Expand an RSS folder and center the active history item after reloads. */
export async function locateSidebarRssItem(folderId: string, itemId: string) {
  await expandAndActivateSidebarNode(folderId);
  // History rows may remount after refresh_rss_items, so wait a bit longer.
  await centerSidebarElement(`[data-rss-item-id="${itemId}"]`, {
    attempts: 120,
  });
}

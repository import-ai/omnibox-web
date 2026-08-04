import { ALLOW_FILE_EXTENSIONS } from '@/const';

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
  if (input) {
    input.click();
  }
}

export async function locateSidebarResource(resourceId: string) {
  await useSidebarStore
    .getState()
    .expandPathTo(resourceId, { expandTarget: true });
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

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

export function scrollToSidebarResource(resourceId: string) {
  requestAnimationFrame(() => {
    const element = document.querySelector(
      `[data-resource-id="${resourceId}"]`
    );
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

import type { ClipboardEvent } from 'react';

export function pasteCommentImage(
  event: ClipboardEvent<HTMLTextAreaElement>,
  uploadImage: (file: File) => void
): void {
  const file =
    Array.from(event.clipboardData.files).find(file =>
      file.type.startsWith('image/')
    ) ??
    Array.from(event.clipboardData.items)
      .find(item => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile();
  if (!file) {
    return;
  }
  if (!event.clipboardData.getData('text/plain')) {
    event.preventDefault();
  }
  uploadImage(file);
}

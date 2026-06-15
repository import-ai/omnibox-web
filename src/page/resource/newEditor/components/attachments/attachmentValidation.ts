export const EDITOR_ATTACHMENT_ACCEPT = '.png,.jpg,.jpeg,.svg,.wav,.gif';
export const EDITOR_ATTACHMENT_MAX_SIZE = 5 * 1024 * 1024;

const allowedExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.wav',
  '.gif',
]);

export type AttachmentValidationError = 'invalid_ext' | 'too_large';

function getExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf('.');

  if (lastDotIndex < 0) {
    return '';
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

export function validateEditorAttachments(files: FileList | File[]) {
  const fileList = Array.from(files);

  if (fileList.some(file => !allowedExtensions.has(getExtension(file.name)))) {
    return 'invalid_ext';
  }

  if (fileList.some(file => file.size > EDITOR_ATTACHMENT_MAX_SIZE)) {
    return 'too_large';
  }

  return null;
}

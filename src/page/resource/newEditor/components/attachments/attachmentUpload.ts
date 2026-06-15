import '@tiptap/extension-audio';

import type { Editor } from '@tiptap/react';

import { API_BASE_URL } from '@/const';
import { detectBrowserLanguage } from '@/lib/detectLanguage';

export interface UploadedAttachment {
  link: string;
  name: string;
}

interface UploadAttachmentResponse {
  failed: string[];
  namespace_id: string;
  resource_id: string;
  uploaded: UploadedAttachment[];
}

export interface EditorAttachmentContext {
  namespaceId: string;
  resourceId: string;
}

function getExtension(fileName: string) {
  const lastDotIndex = fileName.lastIndexOf('.');

  if (lastDotIndex < 0) {
    return '';
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

function isAudioAttachment(fileName: string) {
  return getExtension(fileName) === '.wav';
}

function getAttachmentHref(link: string) {
  return `attachments/${link}`;
}

export function getUploadedAttachmentHref(file: UploadedAttachment) {
  return getAttachmentHref(file.link);
}

export function insertUploadedAttachments(
  editor: Editor,
  files: UploadedAttachment[]
) {
  files.forEach(file => {
    const href = getUploadedAttachmentHref(file);

    if (isAudioAttachment(file.name)) {
      editor
        .chain()
        .focus()
        .setAudio({
          controls: true,
          src: href,
        })
        .run();
      return;
    }

    editor
      .chain()
      .focus()
      .insertContent([
        {
          attrs: {
            alt: file.name,
            src: href,
          },
          type: 'image',
        },
        {
          type: 'paragraph',
        },
      ])
      .run();
  });
}

async function parseUploadResponse(response: Response) {
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response.json() as Promise<UploadAttachmentResponse>;
}

export async function uploadEditorAttachments(
  files: FileList | File[],
  context: EditorAttachmentContext
) {
  const formData = new FormData();

  Array.from(files).forEach(file => {
    formData.append('file[]', file);
  });

  const token = localStorage.getItem('token');
  const lang = localStorage.getItem('i18nextLng') || detectBrowserLanguage();
  const headers = new Headers({
    From: 'web',
  });

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (lang) {
    headers.set('X-Lang', lang);
  }

  const response = await fetch(
    `${API_BASE_URL}/namespaces/${context.namespaceId}/resources/${context.resourceId}/attachments`,
    {
      method: 'POST',
      headers,
      body: formData,
    }
  );

  return parseUploadResponse(response);
}

export async function uploadAndInsertAttachments(
  editor: Editor,
  files: FileList | File[],
  context: EditorAttachmentContext
) {
  const response = await uploadEditorAttachments(files, context);

  if (!response.uploaded.length) {
    return;
  }

  insertUploadedAttachments(editor, response.uploaded);

  return response;
}

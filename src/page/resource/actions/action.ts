import { marked } from 'marked';
import { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';

import { Resource } from '@/interface';
import { embedImage, parseImageLinks } from '@/page/resource/utils';

// Escape unsafe characters before injecting text into an HTML document.
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Trigger a browser download for the provided blob and filename.
const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Convert a Blob into a data URL so images can be embedded inline in HTML.
const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to convert blob to data URL'));
    };
    reader.onerror = () =>
      reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });

// Build a complete standalone HTML document from a title and rendered body content.
const buildHtmlDocument = (
  title: string,
  htmlContent: string
) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #171717;
        background: #f5f5f5;
      }

      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 48px 24px 80px;
      }

      article {
        padding: 40px;
        background: #ffffff;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }

      img {
        max-width: 100%;
        height: auto;
      }

      pre {
        overflow-x: auto;
        padding: 16px;
        border-radius: 12px;
        background: #171717;
        color: #f5f5f5;
      }

      code {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      }

      blockquote {
        margin-left: 0;
        padding-left: 16px;
        border-left: 4px solid #d4d4d4;
        color: #525252;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 10px 12px;
        border: 1px solid #e5e5e5;
        text-align: left;
      }
    </style>
  </head>
  <body>
    <main>
      <article>${htmlContent}</article>
    </main>
  </body>
</html>`;

// Escape special regex characters so a literal path can be used in RegExp.
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Replace every occurrence of an image path in the content with a new path.
const replaceImagePath = (
  content: string,
  originalPath: string,
  nextPath: string
) => content.replace(new RegExp(escapeRegExp(originalPath), 'g'), nextPath);

// Check whether an image source already points to a remote or inline resource.
const isRemoteImageUrl = (value: string) =>
  /^(?:https?:)?\/\//i.test(value) || value.startsWith('data:');

// Build the API URL used to fetch a resource attachment by its relative path.
const getAttachmentFetchUrl = (
  namespaceId: string,
  resourceId: string,
  originalPath: string
) => {
  const normalizedOriginalPath = originalPath.replace(/^attachments\/+/, '');
  return `/api/v1/namespaces/${namespaceId}/resources/${resourceId}/attachments/${normalizedOriginalPath}`;
};

export const downloadHtml = (
  resource: Resource,
  setOpen: Dispatch<SetStateAction<boolean>>,
  t: (key: string) => string,
  namespaceId: string
) => {
  if (!resource.content) {
    toast(t('resource.no_content'), {
      position: 'bottom-right',
    });
    setOpen(false);
    return;
  }

  const baseName = resource.name || t('untitled');
  const title = escapeHtml(baseName);
  const fileName = baseName.endsWith('.html') ? baseName : `${baseName}.html`;
  const exportContent = embedImage(resource);
  const imageLinks = parseImageLinks(exportContent);
  const localImageLinks = imageLinks.filter(link => !isRemoteImageUrl(link));

  if (localImageLinks.length === 0) {
    const htmlContent = marked.parse(exportContent, { async: false });
    const documentContent = buildHtmlDocument(title, htmlContent);
    downloadBlob(
      new Blob([documentContent], { type: 'text/html;charset=utf-8' }),
      fileName
    );
    setOpen(false);
    return;
  }

  let nextContent = exportContent;

  const imagePromises = localImageLinks.map(async (originalLink, idx) => {
    const imageUrl = getAttachmentFetchUrl(
      namespaceId,
      resource.id,
      originalLink
    );

    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const imageBlob = await response.blob();
      const dataUrl = await blobToDataUrl(imageBlob);
      nextContent = replaceImagePath(nextContent, originalLink, dataUrl);
    } catch (error) {
      console.error(`Failed to process image ${idx + 1}:`, error);
      console.error('Image URL:', imageUrl);
    }
  });

  Promise.all(imagePromises)
    .then(() => {
      const htmlContent = marked.parse(nextContent, { async: false });
      const documentContent = buildHtmlDocument(title, htmlContent);
      downloadBlob(
        new Blob([documentContent], { type: 'text/html;charset=utf-8' }),
        fileName
      );
      setOpen(false);
    })
    .catch(error => {
      console.error('Failed to export html:', error);
      toast(t('download.failed'), {
        position: 'bottom-right',
      });
    });
};

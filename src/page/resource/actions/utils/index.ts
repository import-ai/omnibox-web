import axios from 'axios';

import { API_BASE_URL } from '@/const';

const sanitizeFilename = (filename: string): string => {
  const nameWithoutExt = filename.replace(/\.pdf$/i, '');

  const sanitized = nameWithoutExt
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim();

  const finalName = sanitized || 'document';

  return `${finalName}.pdf`;
};

export const exportMarkdownToPdf = async (
  markdown: string,
  filename: string,
  namespaceId: string,
  options?: {
    format?: 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5' | 'A6';
    landscape?: boolean;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  }
) => {
  try {
    const token = localStorage.getItem('token');
    const lang = localStorage.getItem('i18nextLng');

    const safeFilename = sanitizeFilename(filename || 'document.pdf');

    const response = await axios.post(
      `${API_BASE_URL}/namespaces/${namespaceId}/resources/export-pdf`,
      {
        markdown,
        filename: safeFilename,
        format: options?.format || 'A4',
        landscape: options?.landscape || false,
        margin: options?.margin || {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      },
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
          'X-Lang': lang || 'en',
          From: 'web',
        },
      }
    );

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error: any) {
    console.error('Error exporting PDF:', error);
    throw new Error(
      `Failed to export PDF: ${error.message || 'Unknown error'}`
    );
  }
};

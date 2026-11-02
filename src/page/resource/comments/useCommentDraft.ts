import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { ResourceCommentAttachment } from '@/interface';

/** Shared single-image draft lifecycle for inline and document composers. */
export function useCommentDraft(
  lifecycleKey: string | null,
  onUploadImage: (file: File) => Promise<ResourceCommentAttachment>,
  disabled = false
) {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const lifecycleRef = useRef(lifecycleKey);
  lifecycleRef.current = lifecycleKey;
  const clearImage = useCallback(() => {
    requestRef.current += 1;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setImagePreview(null);
    setAttachmentId(null);
  }, []);
  const clear = useCallback(() => {
    setContent('');
    clearImage();
  }, [clearImage]);
  useEffect(() => {
    clear();
    return () => {
      requestRef.current += 1;
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    };
  }, [clear, lifecycleKey]);
  const uploadImage = useCallback(
    async (file: File) => {
      if (disabled || !file.type.startsWith('image/')) return;
      clearImage();
      const request = requestRef.current;
      const url = URL.createObjectURL(file);
      previewRef.current = url;
      setImagePreview(url);
      try {
        const uploaded = await onUploadImage(file);
        if (
          request === requestRef.current &&
          lifecycleKey === lifecycleRef.current
        )
          setAttachmentId(uploaded.id);
      } catch {
        if (
          request === requestRef.current &&
          lifecycleKey === lifecycleRef.current
        ) {
          clearImage();
          toast.error(t('upload.failed'));
        }
      }
    },
    [clearImage, disabled, lifecycleKey, onUploadImage, t]
  );
  return {
    content,
    setContent,
    imagePreview,
    attachmentId,
    clearImage,
    clear,
    uploadImage,
    uploading: !!imagePreview && !attachmentId,
    hasDraft: !!content.trim() || !!attachmentId,
  };
}

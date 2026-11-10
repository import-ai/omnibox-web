import i18next from 'i18next';
import { toast } from 'sonner';

import { chatErrorDetails } from '@/lib/chatErrors';
import { reportChatError } from '@/lib/chatErrorTracking';
import {
  ChatImageInput,
  ChatMessageDisplayPart,
  ComposerChatImage,
} from '@/page/chat/chat-input/types';

export type ResolvableChatImage = ChatImageInput | ComposerChatImage;

export interface ImageUploadTracking {
  requestId?: string;
  parentMessageId?: string;
  channel?: string;
}

function isComposerChatImage(
  image: ResolvableChatImage
): image is ComposerChatImage {
  return 'file' in image && image.file instanceof File;
}

export async function uploadConversationImage(
  namespaceId: string,
  conversationId: string,
  file: File,
  reportError = true,
  tracking: ImageUploadTracking = {}
): Promise<ChatImageInput> {
  const formData = new FormData();
  formData.append('file[]', file);
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(
      `/api/v1/namespaces/${namespaceId}/conversations/${conversationId}/attachments`,
      {
        method: 'POST',
        headers: {
          'X-Client-Platform': 'web',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      }
    );
    if (!response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        /* Use the transport fallback. */
      }
      throw Object.assign(
        new Error('Failed to upload image'),
        chatErrorDetails(payload),
        { status: response.status }
      );
    }
    const attachment = (await response.json()) as {
      attachment_id: string;
      name: string;
      preview_url: string;
    };
    return {
      attachment_id: attachment.attachment_id,
      name: attachment.name,
      url: attachment.preview_url,
    };
  } catch (error) {
    reportChatError(error, {
      conversationId,
      requestId: tracking.requestId,
      parentMessageId: tracking.parentMessageId,
      channel: tracking.channel,
      stage: 'upload',
      clientState: 'uploading',
    });
    if (reportError) toast.error(i18next.t('chat.image.upload_failed'));
    throw error;
  }
}

export async function resolveConversationImages(
  namespaceId: string,
  conversationId: string,
  images: ResolvableChatImage[] | undefined,
  reportError = true,
  tracking: ImageUploadTracking = {}
): Promise<ChatImageInput[]> {
  if (!images?.length) {
    return [];
  }
  const uploaded: ChatImageInput[] = [];
  for (const image of images) {
    if (isComposerChatImage(image)) {
      uploaded.push(
        await uploadConversationImage(
          namespaceId,
          conversationId,
          image.file,
          reportError,
          tracking
        )
      );
      continue;
    }
    uploaded.push({
      attachment_id: image.attachment_id,
      name: image.name,
      url: image.url,
    });
  }
  return uploaded;
}

export function toImageDisplayParts(
  images: ChatImageInput[]
): ChatMessageDisplayPart[] {
  return images.map(image => ({
    type: 'image',
    attachment_id: image.attachment_id,
    name: image.name,
    preview_url: image.url,
  }));
}

export function withUploadedImageParts(
  displayParts: ChatMessageDisplayPart[] | undefined,
  images: ChatImageInput[]
): ChatMessageDisplayPart[] | undefined {
  const next = [
    ...(displayParts ?? []).filter(part => part.type !== 'image'),
    ...toImageDisplayParts(images),
  ];
  return next.length ? next : undefined;
}

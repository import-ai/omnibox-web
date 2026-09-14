import i18next from 'i18next';
import { toast } from 'sonner';

import {
  ChatImageInput,
  ChatMessageDisplayPart,
  ComposerChatImage,
} from '@/page/chat/chat-input/types';

export type ResolvableChatImage = ChatImageInput | ComposerChatImage;

function isComposerChatImage(
  image: ResolvableChatImage
): image is ComposerChatImage {
  return 'file' in image && image.file instanceof File;
}

export async function uploadConversationImage(
  namespaceId: string,
  conversationId: string,
  file: File
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
      throw new Error('Failed to upload image');
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
    toast.error(i18next.t('chat.image.upload_failed'));
    throw error;
  }
}

export async function resolveConversationImages(
  namespaceId: string,
  conversationId: string,
  images: ResolvableChatImage[] | undefined
): Promise<ChatImageInput[]> {
  if (!images?.length) {
    return [];
  }
  const uploaded: ChatImageInput[] = [];
  for (const image of images) {
    if (isComposerChatImage(image)) {
      uploaded.push(
        await uploadConversationImage(namespaceId, conversationId, image.file)
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

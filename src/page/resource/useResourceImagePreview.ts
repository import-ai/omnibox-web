import type { Editor } from '@tiptap/core';
import {
  type ImgHTMLAttributes,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import type {
  ImageViewerCommentAction,
  ImageViewerItem,
} from '@/components/ImagePreviewDialog';
import {
  externalImageLink,
  originalImageDownload,
} from '@/components/imageViewerActions';

import { IMAGE_COMMENT_STORED_QUOTE } from './comments/commentQuote';
import { isInlineCommentThread } from './comments/documentCommentThreads';
import { commentThreadIds } from './comments/imageCommentMarks';
import type { ResourceCommentsController } from './comments/useResourceComments';
import {
  createResourceImagePreviewPlugin,
  resourceImagePreviewKey,
} from './imagePreviewPlugin';

type ResourceImage = ImageViewerItem & {
  from: number;
  to: number;
  element: HTMLImageElement;
};
type Registration = { editor: Editor; identity: string; dispose: () => void };
type Preview = {
  registration: Registration;
  src: string;
  alt: string;
  imageSize: { width: number; height: number };
  referrerPolicy: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  previousFocus: Element | null;
  images: ResourceImage[];
  itemId?: string;
  document: Editor['state']['doc'];
};

export function useResourceImagePreview(
  identity: string,
  host?: RefObject<HTMLDivElement | null>,
  options?: { scopedShare?: boolean; comments?: ResourceCommentsController }
) {
  const registrationRef = useRef<Registration | null>(null);
  const restoreRef = useRef<Preview | null>(null);
  const handOff = useRef<(() => void) | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(
    () => () => {
      const registration = registrationRef.current;
      if (registration?.identity === identity) {
        registrationRef.current = null;
        restoreRef.current = null;
        registration.dispose();
      }
    },
    [identity]
  );

  const registerImagePreview = useCallback(
    (editor: Editor) => {
      if (editor.isDestroyed) return;
      const previous = registrationRef.current;
      if (previous?.editor === editor && previous.identity === identity) return;
      previous?.dispose();
      setOpen(false);
      setPreview(null);
      restoreRef.current = null;
      const onDestroy = () => {
        if (registrationRef.current !== registration) return;
        registrationRef.current = null;
        restoreRef.current = null;
        setOpen(false);
        setPreview(null);
      };
      const registration: Registration = {
        editor,
        identity,
        dispose: () => {
          editor.off('destroy', onDestroy);
          if (!editor.isDestroyed)
            editor.unregisterPlugin(resourceImagePreviewKey);
        },
      };
      registrationRef.current = registration;
      editor.on('destroy', onDestroy);
      editor.registerPlugin(
        createResourceImagePreviewPlugin(
          (image, view) => {
            const images: ResourceImage[] = [];
            view.state.doc.descendants((node, position) => {
              if (node.type.name !== 'image') return;
              const host = view.nodeDOM(position);
              const element =
                host instanceof HTMLImageElement
                  ? host
                  : host instanceof Element
                    ? host.querySelector('img')
                    : null;
              const src = element?.currentSrc || element?.src;
              if (
                !element ||
                !src ||
                (element.complete && !element.naturalWidth)
              )
                return;
              images.push({
                id: String(position),
                from: position,
                to: position + node.nodeSize,
                element,
                src,
                alt: element.alt,
                referrerPolicy: imageReferrerPolicy(element),
                size:
                  element.naturalWidth > 0 && element.naturalHeight > 0
                    ? {
                        width: element.naturalWidth,
                        height: element.naturalHeight,
                      }
                    : undefined,
              });
            });
            const selected: Preview = {
              registration,
              images,
              itemId: images.find(item => item.element === image)?.id,
              document: view.state.doc,
              src: image.currentSrc || image.src,
              alt: image.alt,
              imageSize: {
                width: image.naturalWidth,
                height: image.naturalHeight,
              },
              referrerPolicy: imageReferrerPolicy(image),
              previousFocus: view.dom.ownerDocument.activeElement,
            };
            restoreRef.current = selected;
            setPreview(selected);
            setOpen(true);
          },
          () => registrationRef.current === registration && !editor.isDestroyed
        ),
        (added, existing) => [added, ...existing]
      );
    },
    [identity]
  );

  const onCloseAutoFocus = useCallback(
    (event: Event) => {
      event.preventDefault();
      const selected = restoreRef.current;
      const action = handOff.current;
      handOff.current = null;
      restoreRef.current = null;
      if (
        !selected ||
        selected.registration !== registrationRef.current ||
        selected.registration.identity !== identity
      )
        return;
      const editor = selected.registration.editor;
      if (editor.isDestroyed || !editor.view.dom.isConnected) return;
      if (editor.isEditable) {
        editor.view.focus();
      } else {
        const previous = selected.previousFocus;
        const target =
          previous instanceof HTMLElement &&
          previous.isConnected &&
          previous.tabIndex >= 0
            ? previous
            : host?.current;
        target?.focus({ preventScroll: true });
      }
      if (editor.state.doc === selected.document) action?.();
    },
    [host, identity]
  );

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setPreview(null);
  }, []);

  const getCommentAction = (
    id: string
  ): ImageViewerCommentAction | undefined => {
    const comments = options?.comments;
    const item = preview?.images.find(image => image.id === id);
    const editor = preview?.registration.editor;
    if (
      !comments ||
      !preview ||
      !item ||
      !editor ||
      editor.isDestroyed ||
      editor.state.doc !== preview.document
    )
      return undefined;
    const node = editor.view.nodeDOM(item.from);
    if (!(node instanceof HTMLElement) || !node.contains(item.element))
      return undefined;
    const ids = new Set(commentThreadIds(node.closest('.node-image') ?? node));
    const threads = (
      (comments.imageAnchorThreads ?? comments.threads) ||
      []
    ).filter(
      thread =>
        isInlineCommentThread(thread) && !thread.resolved && ids.has(thread.id)
    );
    const needsSave =
      !options?.scopedShare && comments.canComment && comments.contentDirty;
    const canAdd =
      !options?.scopedShare &&
      comments.canComment &&
      !comments.contentDirty &&
      !!comments.commentsConfig.onCreateRequest;
    if (threads.length === 0 && !canAdd && !needsSave) return undefined;
    return {
      count: threads.length,
      canAdd,
      needsSave,
      threads: threads.map(thread => ({
        id: thread.id,
        label:
          thread.comments[0]?.content ||
          thread.creator.display_name ||
          thread.creator.username ||
          '…',
      })),
      onOpen(threadId) {
        if (
          registrationRef.current !== preview.registration ||
          editor.isDestroyed ||
          editor.state.doc !== preview.document
        )
          return false;
        if (threadId && threads.some(thread => thread.id === threadId)) {
          handOff.current = () => {
            comments.focusThread(threadId);
          };
        } else if (!threadId && canAdd) {
          handOff.current = () =>
            comments.commentsConfig.onCreateRequest?.({
              editor,
              from: item.from,
              to: item.to,
              quotedText: IMAGE_COMMENT_STORED_QUOTE,
            });
        } else return false;
      },
    };
  };

  return {
    registerImagePreview,
    imagePreviewProps: {
      open:
        open &&
        preview?.registration.identity === identity &&
        preview.registration === registrationRef.current,
      items: preview?.images.map(({ id, src, alt, size, referrerPolicy }) => ({
        id,
        src,
        alt,
        size,
        referrerPolicy,
        download:
          !options?.scopedShare && isDocumentAttachment(src)
            ? originalImageDownload(src)
            : undefined,
        allowExternalOriginal:
          !options?.scopedShare && !!externalImageLink(src),
      })),
      initialItemId: preview?.itemId,
      getCommentAction,
      src: preview?.src,
      alt: preview?.alt,
      imageSize: preview?.imageSize,
      referrerPolicy: preview?.referrerPolicy,
      onOpenChange,
      onCloseAutoFocus,
    },
  };
}

function imageReferrerPolicy(
  image: HTMLImageElement
): ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'] {
  return (image.referrerPolicy ||
    image.getAttribute('referrerpolicy') ||
    undefined) as Preview['referrerPolicy'];
}

function isDocumentAttachment(src: string) {
  let path: string;
  try {
    path = new URL(src, window.location.origin).pathname;
  } catch {
    return false;
  }
  return /^\/(?:api\/v1\/namespaces\/[\w-]+\/resources\/[\w-]+|[\w-]+\/[\w-]+)\/attachments\/[\w.-]+$/.test(
    path
  );
}

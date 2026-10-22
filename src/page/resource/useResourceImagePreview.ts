import type { Editor } from '@tiptap/core';
import {
  type ImgHTMLAttributes,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import {
  createResourceImagePreviewPlugin,
  resourceImagePreviewKey,
} from './imagePreviewPlugin';

type Registration = { editor: Editor; identity: string; dispose: () => void };
type Preview = {
  registration: Registration;
  src: string;
  alt: string;
  referrerPolicy: ImgHTMLAttributes<HTMLImageElement>['referrerPolicy'];
  previousFocus: Element | null;
};

export function useResourceImagePreview(
  identity: string,
  host?: RefObject<HTMLDivElement | null>
) {
  const registrationRef = useRef<Registration | null>(null);
  const restoreRef = useRef<Preview | null>(null);
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
            const selected: Preview = {
              registration,
              src: image.currentSrc || image.src,
              alt: image.alt,
              referrerPolicy: (image.referrerPolicy ||
                image.getAttribute('referrerpolicy') ||
                undefined) as Preview['referrerPolicy'],
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
    },
    [host, identity]
  );

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setPreview(null);
  }, []);

  return {
    registerImagePreview,
    imagePreviewProps: {
      open:
        open &&
        preview?.registration.identity === identity &&
        preview.registration === registrationRef.current,
      src: preview?.src,
      alt: preview?.alt,
      referrerPolicy: preview?.referrerPolicy,
      onOpenChange,
      onCloseAutoFocus,
    },
  };
}

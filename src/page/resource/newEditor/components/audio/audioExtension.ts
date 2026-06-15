import Audio, { type AudioOptions } from '@tiptap/extension-audio';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import type { JSONContent } from '@tiptap/react';

const AUDIO_DATA_URL_REGEX = /^data:audio\/[a-zA-Z0-9.+-]+;base64,/i;

function normalizeAudioSrc(src: unknown) {
  if (typeof src !== 'string') {
    return '';
  }

  return src.replace(/^\.\//, '');
}

export function isSafeAudioSrc(src: string, allowBase64 = false) {
  if (!src || /\s/.test(src)) {
    return false;
  }

  if (allowBase64 && AUDIO_DATA_URL_REGEX.test(src)) {
    return true;
  }

  if (src.startsWith('//') || src.startsWith('/')) {
    return true;
  }

  if (src.startsWith('./') || src.startsWith('../')) {
    return true;
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(src)) {
    try {
      const parsedUrl = new URL(src);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  return !src.startsWith('\\');
}

function sanitizeAudioSrc(src: unknown, allowBase64 = false) {
  if (typeof src !== 'string') {
    return null;
  }

  return isSafeAudioSrc(src, allowBase64) ? src : null;
}

function mergeAudioAttributes(
  ...objects: Array<Record<string, unknown> | undefined>
) {
  return objects.filter(Boolean).reduce<Record<string, unknown>>(
    (mergedAttributes, attributes) => ({
      ...mergedAttributes,
      ...attributes,
    }),
    {}
  );
}

export function renderAudioHTML(
  HTMLAttributes: Record<string, unknown>,
  options?: Partial<AudioOptions>
): DOMOutputSpec {
  const mergedAttributes = mergeAudioAttributes(
    options?.HTMLAttributes || {},
    {
      autoplay: options?.autoplay,
      controls: options?.controls,
      controlslist: options?.controlslist,
      crossorigin: options?.crossorigin,
      disableremoteplayback: options?.disableRemotePlayback,
      loop: options?.loop,
      muted: options?.muted,
      preload: options?.preload,
    },
    {
      ...HTMLAttributes,
      src: sanitizeAudioSrc(HTMLAttributes.src, options?.allowBase64),
    }
  );

  const cleanedAttributes = Object.fromEntries(
    Object.entries(mergedAttributes).filter(
      ([, value]) => value !== null && value !== undefined && value !== false
    )
  );

  return ['audio', cleanedAttributes];
}

export function renderAudioMarkdown(node: JSONContent) {
  const src = normalizeAudioSrc(node.attrs?.src);

  return `<audio controls="controls" src="${src}"></audio>`;
}

export const EditorAudio = Audio.extend({
  addCommands() {
    return {
      setAudio:
        options =>
        ({ commands }) => {
          if (!isSafeAudioSrc(options.src, this.options.allowBase64)) {
            return false;
          }

          return commands.insertContent({
            attrs: options,
            type: this.name,
          });
        },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return renderAudioHTML(HTMLAttributes, this.options);
  },
  renderMarkdown: renderAudioMarkdown,
});

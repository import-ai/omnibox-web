import '@import-ai/omnibox-editor/style.css';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';
import '../resourceEditor.css';

import {
  contentToMarkdown,
  contentToTiptapJson,
  OmniboxEditor,
  type OmniboxEditorMentionUser,
  type TiptapJsonContent,
  type UploadFunction,
} from '@import-ai/omnibox-editor';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import Vditor from 'vditor';

import { Input } from '@/components/input';
import { markdownPreviewConfig } from '@/components/markdown';
import { VDITOR_CDN } from '@/const';
import useTheme from '@/hooks/useTheme';
import type { Member, Resource } from '@/interface';
import { addReferrerPolicyForElement } from '@/lib/addReferrerPolicy';
import { getLangOnly } from '@/lib/lang';
import { http } from '@/lib/request';
import {
  clearCache,
  getCache,
  updateCacheContent,
  updateCacheTitle,
} from '@/page/resource/editor/cache';
import {
  ENABLE_OMNIBOX_EDITOR,
  OMNIBOX_EDITOR_CONTENT_WIDTH,
  toolbar,
} from '@/page/resource/editor/const';
import {
  type EditorUpdatePayload,
  serializeResourceEditorContent,
  shouldSaveOmniboxEditorJson,
} from '@/page/resource/editor/contentSerialization';

interface IEditorProps {
  namespaceId: string;
  resource: Resource;
  onResource: (resource: Resource) => void;
}

interface UploadedFile {
  name: string;
  link: string;
}

interface UploadResponse {
  namespace_id: string;
  resource_id: string;
  uploaded: UploadedFile[];
  failed: string[];
}

type ResourceOmniboxEditorProps = Omit<
  React.ComponentProps<typeof OmniboxEditor>,
  'content' | 'onUpdate'
> & {
  content?: string | TiptapJsonContent;
  locale?: string;
  theme?: string;
  onUpdate?: (payload: EditorUpdatePayload) => void;
};

const ResourceOmniboxEditor =
  OmniboxEditor as React.ComponentType<ResourceOmniboxEditorProps>;

const AUTO_SAVE_INTERVAL = 5000;
const SAVE_OMNIBOX_EDITOR_JSON = shouldSaveOmniboxEditorJson(
  import.meta.env.VITE_OMNIBOX_EDITOR_SAVE_JSON
);

function createResourceEditorSnapshot(name: string, content: string) {
  return JSON.stringify({ name, content });
}

function saveResourceEditorCache(
  resourceId: string,
  title: string,
  content: string
) {
  updateCacheTitle(resourceId, title);
  updateCacheContent(resourceId, content);
}

function useLatestRef<T>(value: T) {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}

function useAutoSaveResource({
  app,
  contentRef,
  dirtyRef,
  enabled,
  namespaceId,
  onResource,
  resource,
  title,
}: {
  app: ReturnType<typeof useTheme>['app'];
  contentRef: React.MutableRefObject<string>;
  dirtyRef: React.MutableRefObject<boolean>;
  enabled: boolean;
  namespaceId: string;
  onResource: (resource: Resource) => void;
  resource: Resource;
  title: string;
}) {
  const savingRef = useRef(false);
  const titleRef = useLatestRef(title);
  const onResourceRef = useLatestRef(onResource);
  const savedSnapshotRef = useRef(
    createResourceEditorSnapshot(resource.name || '', resource.content || '')
  );

  useEffect(() => {
    savedSnapshotRef.current = createResourceEditorSnapshot(
      resource.name || '',
      resource.content || ''
    );
  }, [resource.content, resource.id, resource.name]);

  const autoSave = useCallback(async () => {
    if (!enabled || savingRef.current || !dirtyRef.current) {
      return;
    }

    const name = titleRef.current.trim();
    const content = contentRef.current;
    const snapshot = createResourceEditorSnapshot(name, content);

    if (snapshot === savedSnapshotRef.current) {
      dirtyRef.current = false;
      return;
    }

    savingRef.current = true;

    try {
      const delta = await http.patch<Resource>(
        `/namespaces/${namespaceId}/resources/${resource.id}`,
        {
          name,
          content,
          namespaceId,
        },
        { mute: true }
      );
      savedSnapshotRef.current = snapshot;
      app.fire('update_resource', delta);
      onResourceRef.current(delta);
      const currentSnapshot = createResourceEditorSnapshot(
        titleRef.current.trim(),
        contentRef.current
      );
      dirtyRef.current = currentSnapshot !== snapshot;
      if (!dirtyRef.current) {
        clearCache(resource.id);
      }
    } catch {
      // Keep the local cache and retry on the next autosave tick.
    } finally {
      savingRef.current = false;
    }
  }, [
    app,
    contentRef,
    dirtyRef,
    enabled,
    namespaceId,
    onResourceRef,
    resource.id,
    titleRef,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = window.setInterval(autoSave, AUTO_SAVE_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, [autoSave, enabled]);
}

function format(_files: File[], responseText: string): string {
  const response: UploadResponse = JSON.parse(responseText);
  const uploadedMap: Record<string, string> = {};
  response.uploaded.forEach(file => {
    uploadedMap[file.name] = `attachments/${file.link}`;
  });
  const processedResponse = {
    msg: 'success',
    code: 0,
    data: {
      errFiles: response.failed,
      succMap: uploadedMap,
    },
  };
  return JSON.stringify(processedResponse);
}

function OmniboxResourceEditor(props: IEditorProps) {
  const { resource, onResource, namespaceId } = props;
  const { i18n } = useTranslation();
  const markdownRef = useRef('');
  const navigate = useNavigate();
  const loc = useLocation();
  const { app, theme } = useTheme();
  const [title, onTitle] = useState('');
  const [mentionUsers, setMentionUsers] = useState<OmniboxEditorMentionUser[]>(
    []
  );
  const cache = useMemo(() => getCache(resource.id), [resource.id]);
  const dirtyRef = useRef(Boolean(cache?.title || cache?.content));
  const cachedTitle = cache?.title || resource.name || '';
  const linkBase = useMemo(
    () => `/${namespaceId}/${resource.id}`,
    [namespaceId, resource.id]
  );
  // Snapshot the content once per resource. Pinning it to the resource id means
  // later changes to `resource.content` (autosave echoes, cross-tab
  // `update_resource` events, etc.) never produce a new `content` prop for the
  // editor — otherwise the editor calls `setContent` and the caret jumps to the
  // end. The editor remounts via `key={resource.id}` when switching documents,
  // and `Wrapper` only mounts it once the resource has finished loading.
  // Depends only on resource.id by design — see comment above. `cache` is
  // memoized on resource.id and `resource.content` is intentionally not a
  // dependency so the editor is never re-seeded mid-edit.
  const initialContent = useMemo(
    () => cache?.content || resource.content || '',
    [resource.id]
  );
  const editorContent = useMemo(
    () => contentToTiptapJson(initialContent, { linkBase }),
    [initialContent, linkBase]
  );
  const serializedEditorContent = useMemo(
    () =>
      initialContent
        ? serializeResourceEditorContent(
            {
              json: editorContent,
              markdown: contentToMarkdown(editorContent, {
                linkBase,
                debug: false,
              }),
            },
            SAVE_OMNIBOX_EDITOR_JSON
          )
        : '',
    [initialContent, editorContent, linkBase]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    dirtyRef.current = true;
    onTitle(newTitle);
    updateCacheTitle(resource.id, newTitle);
  };

  const handleEditorUpdate = useCallback(
    (payload: EditorUpdatePayload) => {
      const content = serializeResourceEditorContent(
        payload,
        SAVE_OMNIBOX_EDITOR_JSON
      );
      if (content !== markdownRef.current) {
        dirtyRef.current = true;
      }
      markdownRef.current = content;
      updateCacheContent(resource.id, content);
    },
    [resource.id]
  );

  useAutoSaveResource({
    app,
    contentRef: markdownRef,
    dirtyRef,
    enabled: true,
    namespaceId,
    onResource,
    resource,
    title,
  });

  const uploadImage = useCallback<UploadFunction>(
    async (file, onProgress, abortSignal) => {
      const token = localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('file[]', file);

      const response = await fetch(
        `/api/v1/namespaces/${namespaceId}/resources/${resource.id}/attachments`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
          signal: abortSignal,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = (await response.json()) as UploadResponse;
      const uploaded = data.uploaded[0];
      if (!uploaded) {
        throw new Error(data.failed[0] || 'Upload failed');
      }

      onProgress?.({ progress: 100 });
      return `${linkBase}/attachments/${uploaded.link}`;
    },
    [linkBase, namespaceId, resource.id]
  );

  useEffect(() => {
    let ignore = false;

    async function loadMentionUsers() {
      try {
        const members = await http.get<Member[]>(
          `/namespaces/${namespaceId}/members`,
          { mute: true }
        );

        if (ignore) {
          return;
        }

        setMentionUsers(
          (Array.isArray(members) ? members : []).reduce<
            OmniboxEditorMentionUser[]
          >((users, member) => {
            const id = member.user_id;
            const name = member.username || member.email || id;

            if (!id || !name) {
              return users;
            }

            users.push({
              id,
              name,
              position: member.role,
            });

            return users;
          }, [])
        );
      } catch {
        if (!ignore) {
          setMentionUsers([]);
        }
      }
    }

    loadMentionUsers();

    return () => {
      ignore = true;
    };
  }, [namespaceId]);

  useEffect(() => {
    onTitle(cachedTitle);
    markdownRef.current = serializedEditorContent;
  }, [cachedTitle, serializedEditorContent]);

  useEffect(() => {
    return app.on('save', (onSuccess?: () => void) => {
      const name = title.trim();
      const content = markdownRef.current;
      if (!content && !name) {
        navigate(`/${namespaceId}/${resource.id}`, {
          state: loc.state,
        });
        return;
      }
      http
        .patch(`/namespaces/${namespaceId}/resources/${resource.id}`, {
          name,
          content,
          namespaceId: namespaceId,
        })
        .then((delta: Resource) => {
          app.fire('update_resource', delta);
          onResource(delta);
          dirtyRef.current = false;
          clearCache(resource.id);
          navigate(`/${namespaceId}/${resource.id}`, {
            state: loc.state,
          });
          onSuccess && onSuccess();
        });
    });
  }, [app, title, namespaceId, resource.id, loc.state, navigate, onResource]);

  useEffect(() => {
    const keydownFN = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveResourceEditorCache(resource.id, title, markdownRef.current);
      }
    };
    document.addEventListener('keydown', keydownFN);
    return () => {
      document.removeEventListener('keydown', keydownFN);
    };
  }, [resource.id, title]);

  return (
    <div className="pb-[30vh]">
      <Input
        type="text"
        value={title}
        onChange={handleChange}
        placeholder="Enter title"
        className="mb-4 p-2 border rounded"
      />
      <div className="resource-editable-editor">
        <ResourceOmniboxEditor
          key={resource.id}
          content={editorContent}
          locale={i18n.language}
          theme={theme.content}
          variant="embedded"
          contentWidth={OMNIBOX_EDITOR_CONTENT_WIDTH}
          showHeader={false}
          showToc={true}
          linkBase={linkBase}
          imageUpload={uploadImage}
          mentionUsers={mentionUsers}
          onUpdate={handleEditorUpdate}
          debug={true}
        />
      </div>
    </div>
  );
}

function VditorResourceEditor(props: IEditorProps) {
  const { resource, onResource, namespaceId } = props;
  const { i18n } = useTranslation();
  const root = useRef<any>(null);
  const navigate = useNavigate();
  const loc = useLocation();
  const { app, theme } = useTheme();
  const [vd, setVd] = useState<Vditor>();
  const [title, onTitle] = useState('');
  const contentRef = useRef('');
  const initialCache = useMemo(() => getCache(resource.id), [resource.id]);
  const dirtyRef = useRef(
    Boolean(initialCache?.title || initialCache?.content)
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    dirtyRef.current = true;
    onTitle(newTitle);
    updateCacheTitle(resource.id, newTitle);
  };

  useEffect(() => {
    return app.on('save', (onSuccess?: () => void) => {
      const name = title.trim();
      const content: string | undefined = vd?.getValue();
      if (!content && !name) {
        navigate(`/${namespaceId}/${resource.id}`, {
          state: loc.state,
        });
        return;
      }
      http
        .patch(`/namespaces/${namespaceId}/resources/${resource.id}`, {
          name,
          content,
          namespaceId: namespaceId,
        })
        .then((delta: Resource) => {
          app.fire('update_resource', delta);
          onResource(delta);
          dirtyRef.current = false;
          clearCache(resource.id);
          navigate(`/${namespaceId}/${resource.id}`, {
            state: loc.state,
          });
          onSuccess && onSuccess();
        });
    });
  }, [title, vd, loc.state]);

  useEffect(() => {
    const keydownFN = (e: KeyboardEvent) => {
      if (!vd) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveResourceEditorCache(resource.id, title, vd.getValue());
      }
    };
    document.addEventListener('keydown', keydownFN);
    return () => {
      document.removeEventListener('keydown', keydownFN);
    };
  }, [resource.id, title, vd]);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    const cachedTitle = initialCache?.title || resource.name || '';
    const cachedContent = initialCache?.content || resource.content || '';

    onTitle(cachedTitle);

    if (!resource || !root.current || resource.resource_type === 'folder') {
      return;
    }

    const vditor = new Vditor(root.current, {
      ...(VDITOR_CDN ? { cdn: VDITOR_CDN } : {}),
      tab: '\t',
      preview: markdownPreviewConfig(theme),
      toolbar,
      toolbarConfig: {
        pin: true,
      },
      cache: {
        enable: false,
      },
      mode: 'wysiwyg',
      lang: getLangOnly(i18n) === 'zh' ? 'zh_CN' : 'en_US',
      upload: {
        url: `/api/v1/namespaces/${namespaceId}/resources/${resource.id}/attachments`,
        accept: 'image/*,.wav',
        max: 1024 * 1024 * 5,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        format,
      },
      input: (value: string) => {
        if (value !== contentRef.current) {
          dirtyRef.current = true;
        }
        contentRef.current = value;
        updateCacheContent(resource.id, value);
      },
      after: () => {
        vditor.setValue(cachedContent);
        contentRef.current = cachedContent;
        vditor.setTheme(
          theme.content === 'dark' ? 'dark' : 'classic',
          theme.content,
          theme.code
        );
        if (resource.content) {
          if (vditor.vditor.ir && vditor.vditor.ir.element) {
            addReferrerPolicyForElement(vditor.vditor.ir.element);
          }
          if (vditor.vditor.wysiwyg && vditor.vditor.wysiwyg.element) {
            addReferrerPolicyForElement(vditor.vditor.wysiwyg.element);
          }
        }
        setVd(vditor);
      },
    });
    return () => {
      vd?.destroy();
      setVd(undefined);
    };
  }, [initialCache, resource]);

  useAutoSaveResource({
    app,
    contentRef,
    dirtyRef,
    enabled: Boolean(vd),
    namespaceId,
    onResource,
    resource,
    title,
  });

  useEffect(() => {
    if (!vd) {
      return;
    }
    vd.setTheme(
      theme.content === 'dark' ? 'dark' : 'classic',
      theme.content,
      theme.code
    );
  }, [vd, theme]);

  return (
    <div className="pb-[30vh]">
      <Input
        type="text"
        value={title}
        onChange={handleChange}
        placeholder="Enter title"
        className="mb-4 p-2 border rounded"
      />
      <div ref={root} className="vditor reset-list" />
    </div>
  );
}

export default function Editor(props: IEditorProps) {
  return ENABLE_OMNIBOX_EDITOR ? (
    <OmniboxResourceEditor {...props} />
  ) : (
    <VditorResourceEditor {...props} />
  );
}

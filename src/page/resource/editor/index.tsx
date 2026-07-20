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
  OMNIBOX_EDITOR_CONTENT_WIDTH,
  toolbar,
} from '@/page/resource/editor/const';
import {
  type EditorUpdatePayload,
  serializeResourceEditorContent,
} from '@/page/resource/editor/contentSerialization';
import {
  selectUseOmniboxEditor,
  useResourceStore,
} from '@/page/resource/resourceStore';

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

function saveResourceEditorCache(
  resourceId: string,
  title: string,
  content: string
) {
  updateCacheTitle(resourceId, title);
  updateCacheContent(resourceId, content);
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
  // Match Vditor: folders can open /edit for title, but must not mount the body editor.
  const isFolder = resource.resource_type === 'folder';
  const linkBase = useMemo(
    () => `/${namespaceId}/${resource.id}`,
    [namespaceId, resource.id]
  );

  const initialContent = useMemo(
    () => cache?.content || resource.content || '',
    [resource.id]
  );
  const editorContent = useMemo(
    () => (isFolder ? null : contentToTiptapJson(initialContent, { linkBase })),
    [initialContent, isFolder, linkBase]
  );
  const serializedEditorContent = useMemo(
    () =>
      !isFolder && initialContent && editorContent
        ? contentToMarkdown(editorContent, {
            linkBase,
            debug: false,
          })
        : '',
    [initialContent, editorContent, isFolder, linkBase]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    dirtyRef.current = true;
    onTitle(newTitle);
    updateCacheTitle(resource.id, newTitle);
  };

  const handleEditorUpdate = useCallback(
    (payload: EditorUpdatePayload) => {
      const content = serializeResourceEditorContent(payload);
      if (content !== markdownRef.current) {
        dirtyRef.current = true;
      }
      markdownRef.current = content;
      // Local draft only — server is updated on explicit Save.
      updateCacheContent(resource.id, content);
    },
    [resource.id]
  );

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
    <div
      className="resource-editable-page pb-[30vh]"
      style={
        {
          '--resource-editor-content-width': `${OMNIBOX_EDITOR_CONTENT_WIDTH}px`,
        } as React.CSSProperties
      }
    >
      <div className="resource-editable-title">
        <Input
          type="text"
          value={title}
          onChange={handleChange}
          placeholder="Enter title"
          className="mb-4 p-2 border rounded"
        />
      </div>
      <div className="resource-editable-editor">
        {!isFolder && editorContent ? (
          <ResourceOmniboxEditor
            key={resource.id}
            content={editorContent}
            locale={i18n.language}
            theme={theme.content}
            variant="embedded"
            contentWidth={OMNIBOX_EDITOR_CONTENT_WIDTH}
            showHeader={false}
            showToc={true}
            tocColors={{
              inactive: theme.content === 'dark' ? '#ffffff' : '#000000',
            }}
            linkBase={linkBase}
            imageUpload={uploadImage}
            mentionUsers={mentionUsers}
            onUpdate={handleEditorUpdate}
          />
        ) : null}
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
  const useOmniboxEditor = useResourceStore(selectUseOmniboxEditor);

  return useOmniboxEditor ? (
    <OmniboxResourceEditor {...props} />
  ) : (
    <VditorResourceEditor {...props} />
  );
}

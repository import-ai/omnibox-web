import 'cvnert-editor/style.css';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';
import '../resourceEditor.css';

import {
  contentToTiptapJson,
  CvnertEditor,
  type TiptapJsonContent,
  type UploadFunction,
} from 'cvnert-editor';
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
import { Resource } from '@/interface';
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
  CVNERT_EDITOR_CONTENT_WIDTH,
  ENABLE_CVNERT_EDITOR,
  toolbar,
} from '@/page/resource/editor/const';

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

interface EditorUpdatePayload {
  json?: TiptapJsonContent;
  markdown?: string;
  html?: string;
}

type ResourceCvnertEditorProps = Omit<
  React.ComponentProps<typeof CvnertEditor>,
  'content' | 'onUpdate'
> & {
  content?: string | TiptapJsonContent;
  locale?: string;
  theme?: string;
  onUpdate?: (payload: EditorUpdatePayload) => void;
};

const ResourceCvnertEditor =
  CvnertEditor as React.ComponentType<ResourceCvnertEditorProps>;

function serializeResourceEditorContent(payload: EditorUpdatePayload): string {
  if (payload.json) {
    return JSON.stringify(payload.json);
  }

  return payload.markdown ?? payload.html ?? '';
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

function CvnertResourceEditor(props: IEditorProps) {
  const { resource, onResource, namespaceId } = props;
  const { i18n } = useTranslation();
  const busy = useRef(false);
  const markdownRef = useRef('');
  const navigate = useNavigate();
  const loc = useLocation();
  const { app, theme } = useTheme();
  const [title, onTitle] = useState('');
  const cache = useMemo(() => getCache(resource.id), [resource.id]);
  const cachedTitle = cache?.title || resource.name || '';
  const cachedContent = cache?.content || resource.content || '';
  const linkBase = useMemo(
    () => `/${namespaceId}/${resource.id}`,
    [namespaceId, resource.id]
  );
  const editorContent = useMemo(
    () => contentToTiptapJson(cachedContent, { linkBase }),
    [cachedContent, linkBase]
  );
  const serializedEditorContent = useMemo(
    () => (cachedContent ? JSON.stringify(editorContent) : ''),
    [cachedContent, editorContent]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    onTitle(newTitle);
    updateCacheTitle(resource.id, newTitle);
  };

  useEffect(() => {
    onTitle(cachedTitle);
    markdownRef.current = serializedEditorContent;
  }, [cachedTitle, serializedEditorContent]);

  const handleEditorUpdate = useCallback(
    (payload: EditorUpdatePayload) => {
      const content = serializeResourceEditorContent(payload);
      markdownRef.current = content;
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
        const content = markdownRef.current;
        if (busy.current) {
          return;
        }
        busy.current = true;
        http
          .patch(`/namespaces/${namespaceId}/resources/${resource.id}`, {
            content,
            namespaceId: namespaceId,
          })
          .then(() => {
            busy.current = false;
          });
      }
    };
    document.addEventListener('keydown', keydownFN);
    return () => {
      document.removeEventListener('keydown', keydownFN);
    };
  }, [namespaceId, resource.id]);

  return (
    <div>
      <Input
        type="text"
        value={title}
        onChange={handleChange}
        placeholder="Enter title"
        className="mb-4 p-2 border rounded"
      />
      <div className="resource-editable-editor">
        <ResourceCvnertEditor
          key={resource.id}
          content={editorContent}
          locale={i18n.language}
          theme={theme.content}
          variant="embedded"
          contentWidth={CVNERT_EDITOR_CONTENT_WIDTH}
          showHeader={false}
          showToc={true}
          linkBase={linkBase}
          imageUpload={uploadImage}
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
  const busy = useRef(false);
  const root = useRef<any>(null);
  const navigate = useNavigate();
  const loc = useLocation();
  const { app, theme } = useTheme();
  const [vd, setVd] = useState<Vditor>();
  const [title, onTitle] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
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
        const content = vd.getValue();
        if (busy.current) {
          return;
        }
        busy.current = true;
        http
          .patch(`/namespaces/${namespaceId}/resources/${resource.id}`, {
            content,
            namespaceId: namespaceId,
          })
          .then(() => {
            busy.current = false;
          });
      }
    };
    document.addEventListener('keydown', keydownFN);
    return () => {
      document.removeEventListener('keydown', keydownFN);
    };
  }, [vd, resource]);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    const cache = getCache(resource.id);
    const cachedTitle = cache?.title || resource.name || '';
    const cachedContent = cache?.content || resource.content || '';

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
        updateCacheContent(resource.id, value);
      },
      after: () => {
        vditor.setValue(cachedContent);
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
  }, [resource]);

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
    <div>
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
  return ENABLE_CVNERT_EDITOR ? (
    <CvnertResourceEditor {...props} />
  ) : (
    <VditorResourceEditor {...props} />
  );
}

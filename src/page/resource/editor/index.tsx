import '@import-ai/omnibox-editor/style.css';
import '../resourceEditor.css';

import {
  OmniboxEditor,
  type OmniboxEditorCommentSelection,
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
import { toast } from 'sonner';

import useTheme from '@/hooks/useTheme';
import type { Resource } from '@/interface';
import { http } from '@/lib/request';
import {
  clearCache,
  getCache,
  updateCacheContent,
  updateCacheTitle,
} from '@/page/resource/editor/cache';
import {
  OMNIBOX_EDITOR_CONTENT_WIDTH,
  OMNIBOX_EDITOR_WIDE_CONTENT_WIDTH,
} from '@/page/resource/editor/const';
import {
  type EditorUpdatePayload,
  serializeResourceEditorContent,
} from '@/page/resource/editor/contentSerialization';
import { resolveMentionLabels } from '@/page/resource/mentionLabels';
import { useMentionUsers } from '@/page/resource/useMentionUsers';

import type { ResourceCommentsController } from '../comments/useResourceComments';
import {
  type AutosizeTextAreaRef,
  normalizeTitleInput,
  ResourceTitleTextarea,
} from './ResourceTitleTextarea';

interface IEditorProps {
  comments: ResourceCommentsController;
  onContentDirtyChange: (dirty: boolean) => void;
  namespaceId: string;
  resource: Resource;
  onResource: (resource: Resource) => void;
  showToc: boolean;
  wide: boolean;
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

type BodyEditorFocus = OmniboxEditorCommentSelection['editor'];

type ResourceOmniboxEditorProps = Omit<
  React.ComponentProps<typeof OmniboxEditor>,
  'content' | 'onUpdate' | 'onReady'
> & {
  content?: string | TiptapJsonContent;
  locale?: string;
  theme?: string;
  onUpdate?: (payload: EditorUpdatePayload) => void;
  onReady?: (editor: BodyEditorFocus) => void;
  onNavigateToTitle?: () => void;
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

export default function Editor(props: IEditorProps) {
  const {
    resource,
    onResource,
    namespaceId,
    showToc,
    wide,
    comments,
    onContentDirtyChange,
  } = props;
  const { i18n, t } = useTranslation();
  const markdownRef = useRef('');
  const bodyEditorRef = useRef<BodyEditorFocus | null>(null);
  const titleRef = useRef<AutosizeTextAreaRef | null>(null);
  const navigate = useNavigate();
  const loc = useLocation();
  const { app, theme } = useTheme();
  const [title, onTitle] = useState('');
  const { mentionUsers, namesById, ready } = useMentionUsers(namespaceId);
  const cache = useMemo(() => getCache(resource.id), [resource.id]);
  const dirtyRef = useRef(Boolean(cache?.title || cache?.content));
  const hasCachedContentChange =
    cache?.content !== undefined && cache.content !== (resource.content ?? '');
  const cachedTitle = cache?.title ?? resource.name ?? '';
  const isFolder = resource.resource_type === 'folder';
  const linkBase = useMemo(
    () => `/${namespaceId}/${resource.id}`,
    [namespaceId, resource.id]
  );

  const initialContent = useMemo(
    () => cache?.content ?? resource.content ?? '',
    [resource.id]
  );
  const resolvedContent = useMemo(
    () => resolveMentionLabels(initialContent, namesById),
    [initialContent, namesById]
  );
  if (ready && !dirtyRef.current) {
    markdownRef.current = resolvedContent;
  }
  const editorContent = useMemo(
    () => (isFolder || !ready ? null : resolvedContent),
    [isFolder, ready, resolvedContent]
  );
  const { commentsConfig, getAnchorSync, registerEditor } = comments;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = normalizeTitleInput(e.target.value);
    dirtyRef.current = true;
    onTitle(newTitle);
    updateCacheTitle(resource.id, newTitle);
  };

  const handleEditorUpdate = useCallback(
    (payload: EditorUpdatePayload) => {
      const content = serializeResourceEditorContent(payload);
      if (content !== markdownRef.current) {
        dirtyRef.current = true;
        onContentDirtyChange(content !== (resource.content ?? ''));
        updateCacheContent(resource.id, content);
      }
      markdownRef.current = content;
    },
    [onContentDirtyChange, resource.content, resource.id]
  );

  const handleEditorReady = useCallback(
    (editor: BodyEditorFocus) => {
      bodyEditorRef.current = editor;
      registerEditor(editor);
    },
    [registerEditor]
  );

  const handleTitleEnter = useCallback(() => {
    if (isFolder) {
      return;
    }

    const editor = bodyEditorRef.current;
    if (!editor || editor.isDestroyed) {
      return;
    }

    editor.commands.focus('start');
  }, [isFolder]);

  const handleCodeBlockCopy = useCallback(() => {
    toast(t('actions.copy_content_success'), {
      position: 'bottom-right',
    });
  }, [t]);

  const uploadImage = useCallback<UploadFunction>(
    async (file, onProgress, abortSignal) => {
      const token = localStorage.getItem('token') || '';
      const formData = new FormData();
      formData.append('file[]', file);

      const response = await fetch(
        `/api/v1/namespaces/${namespaceId}/resources/${resource.id}/attachments`,
        {
          method: 'POST',
          headers: {
            'X-Client-Platform': 'web',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
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
    onTitle(cachedTitle);
    if (ready && !dirtyRef.current) {
      markdownRef.current = resolvedContent;
    }
    onContentDirtyChange(hasCachedContentChange);
  }, [
    cachedTitle,
    hasCachedContentChange,
    onContentDirtyChange,
    ready,
    resolvedContent,
  ]);

  useEffect(() => {
    return () => {
      bodyEditorRef.current = null;
    };
  }, [resource.id]);

  const handleNavigateToTitle = useCallback(() => {
    const ta = titleRef.current?.textArea;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }, []);

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
      const anchorSync = resource.content_hash ? getAnchorSync() : null;
      http
        .patch(`/namespaces/${namespaceId}/resources/${resource.id}`, {
          name,
          content,
          namespaceId: namespaceId,
          ...(anchorSync && resource.content_hash
            ? {
                expected_content_hash: resource.content_hash,
                ...anchorSync,
              }
            : {}),
        })
        .then((delta: Resource) => {
          app.fire('update_resource', delta);
          onResource(delta);
          dirtyRef.current = false;
          onContentDirtyChange(false);
          clearCache(resource.id);
          navigate(`/${namespaceId}/${resource.id}`, {
            state: loc.state,
          });
          onSuccess && onSuccess();
        });
    });
  }, [
    app,
    getAnchorSync,
    loc.state,
    namespaceId,
    navigate,
    onResource,
    onContentDirtyChange,
    resource.content_hash,
    resource.id,
    title,
  ]);

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
      className={`resource-editable-page relative pb-[30vh] ${
        wide ? 'resource-editable-page--wide' : ''
      }`}
      style={
        {
          '--resource-editor-content-width': wide
            ? `${OMNIBOX_EDITOR_WIDE_CONTENT_WIDTH}px`
            : `${OMNIBOX_EDITOR_CONTENT_WIDTH}px`,
        } as React.CSSProperties
      }
    >
      <div className="resource-editable-title">
        <ResourceTitleTextarea
          ref={titleRef}
          value={title}
          onChange={handleChange}
          onEnter={handleTitleEnter}
          placeholder={t('resource.title_placeholder')}
          aria-label={t('resource.title')}
        />
      </div>
      <div className="resource-editable-editor">
        {editorContent !== null ? (
          <ResourceOmniboxEditor
            key={resource.id}
            content={editorContent}
            locale={i18n.language}
            theme={theme.content}
            variant="embedded"
            contentWidth={
              wide
                ? OMNIBOX_EDITOR_WIDE_CONTENT_WIDTH
                : OMNIBOX_EDITOR_CONTENT_WIDTH
            }
            showHeader={false}
            showToc={showToc}
            tocColors={{
              inactive: theme.content === 'dark' ? '#ffffff' : '#000000',
            }}
            linkBase={linkBase}
            imageUpload={uploadImage}
            mentionUsers={mentionUsers}
            comments={commentsConfig}
            onReady={handleEditorReady}
            onUpdate={handleEditorUpdate}
            onNavigateToTitle={handleNavigateToTitle}
            onCodeBlockCopy={handleCodeBlockCopy}
          />
        ) : null}
      </div>
    </div>
  );
}

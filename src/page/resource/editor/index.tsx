import '@import-ai/omnibox-editor/style.css';
import '../resourceEditor.css';

import {
  contentToTiptapJson,
  OmniboxEditor,
  type OmniboxEditorCommentSelection,
  type TiptapJsonContent,
  tiptapJsonToMarkdown,
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

import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import useTheme from '@/hooks/useTheme';
import type { Resource } from '@/interface';
import { beginEditorInput } from '@/lib/behaviorRequest';
import {
  clearCacheTitle,
  getCache,
  updateCacheTitle,
} from '@/page/resource/editor/cache';
import {
  OMNIBOX_EDITOR_CONTENT_WIDTH,
  OMNIBOX_EDITOR_WIDE_CONTENT_WIDTH,
} from '@/page/resource/editor/const';
import { isDocumentChanged } from '@/page/resource/editor/contentComparison';
import {
  type EditorUpdatePayload,
  serializeResourceEditorContent,
} from '@/page/resource/editor/contentSerialization';
import { updateResourceEditorDraft } from '@/page/resource/editor/draftCache';
import {
  buildEditBaseline,
  type EditBaseline,
} from '@/page/resource/editor/editBaseline';
import { normalizeResourceEditorContent } from '@/page/resource/editor/normalizeResourceEditorContent';
import { useResourceEditorSave } from '@/page/resource/editor/useResourceEditorSave';
import { useResourceImageUpload } from '@/page/resource/editor/useResourceImageUpload';
import { MentionHoverCard } from '@/page/resource/MentionHoverCard';
import { resolveMentionLabels } from '@/page/resource/mentionLabels';
import { useMentionUsers } from '@/page/resource/useMentionUsers';

import type { ResourceCommentsController } from '../comments/useResourceComments';
import { useResourceImagePreview } from '../useResourceImagePreview';
import { useFocusNewFileTitle } from './focusNewFileTitle';
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
  const { registerImagePreview, imagePreviewProps } = useResourceImagePreview(
    `edit:${namespaceId}:${resource.id}`
  );
  const bodyEditorRef = useRef<BodyEditorFocus | null>(null);
  const titleRef = useRef<AutosizeTextAreaRef | null>(null);
  const editorSurfaceRef = useRef<HTMLDivElement>(null);
  useFocusNewFileTitle(titleRef);
  const navigate = useNavigate();
  const loc = useLocation();
  const { app, theme } = useTheme();
  const [title, onTitle] = useState('');
  const {
    mentionUsers,
    membersById,
    namesById: activeNames,
    ready,
  } = useMentionUsers(namespaceId);
  const namesById = useMemo(
    () => ({
      ...resource.mention_display_names,
      ...comments.mentionDisplayNames,
      ...activeNames,
    }),
    [resource.mention_display_names, comments.mentionDisplayNames, activeNames]
  );
  const cache = useMemo(() => getCache(resource.id), [resource.id]);
  const baselineRef = useRef<EditBaseline | null>(null);
  const baselineResourceIdRef = useRef(resource.id);
  if (baselineResourceIdRef.current !== resource.id) {
    baselineResourceIdRef.current = resource.id;
    baselineRef.current = null;
    bodyEditorRef.current = null;
  }
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
  // Names are snapshotted once per document. Later member refreshes must not
  // rebuild editorContent: the editor package replaces the whole doc on change.
  const openedNamesRef = useRef<{
    id: string;
    names: Record<string, string>;
  } | null>(null);
  if (!ready) {
    openedNamesRef.current = null;
  } else if (openedNamesRef.current?.id !== resource.id) {
    openedNamesRef.current = { id: resource.id, names: namesById };
  }
  const resolvedContent = useMemo(
    () =>
      resolveMentionLabels(initialContent, openedNamesRef.current?.names ?? {}),
    [initialContent, ready, resource.id]
  );
  const editorContent = useMemo(
    () =>
      isFolder || !ready
        ? null
        : normalizeResourceEditorContent(
            contentToTiptapJson(resolvedContent, { linkBase })
          ),
    [isFolder, ready, resolvedContent, linkBase]
  );
  const { commentsConfig, getAnchorSync, registerEditor } = comments;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newTitle = normalizeTitleInput(e.target.value);
    onTitle(newTitle);
    const baseline = baselineRef.current;
    if (baseline && newTitle.trim() === baseline.originalName) {
      clearCacheTitle(resource.id);
    } else {
      updateCacheTitle(resource.id, newTitle);
    }
  };

  const handleEditorUpdate = useCallback(
    (payload: EditorUpdatePayload) => {
      const content = serializeResourceEditorContent(payload);
      const baseline = baselineRef.current;
      if (!baseline || !payload.json) {
        return;
      }
      const bodyChanged = isDocumentChanged(
        baseline.comparableDocument,
        payload.json
      );
      onContentDirtyChange(bodyChanged);
      updateResourceEditorDraft({
        resourceId: resource.id,
        title,
        baselineTitle: baseline.originalName,
        content,
        bodyChanged,
      });
    },
    [onContentDirtyChange, resource.id, title]
  );

  const handleEditorReady = useCallback(
    (editor: BodyEditorFocus) => {
      bodyEditorRef.current = editor;
      registerEditor(editor);
      registerImagePreview(editor);

      if (baselineRef.current?.resourceId === resource.id) {
        return;
      }
      const baseline = buildEditBaseline({
        resourceId: resource.id,
        name: resource.name ?? '',
        content: resource.content ?? '',
        linkBase,
        document: cache?.content === undefined ? editor.getJSON() : undefined,
        schema: editor.schema,
      });
      baselineRef.current = baseline;

      const currentDocument = editor.getJSON();
      const content = tiptapJsonToMarkdown(currentDocument);
      const bodyChanged = isDocumentChanged(
        baseline.comparableDocument,
        currentDocument
      );
      onContentDirtyChange(bodyChanged);
      updateResourceEditorDraft({
        resourceId: resource.id,
        title: cachedTitle,
        baselineTitle: baseline.originalName,
        content,
        bodyChanged,
      });
    },
    [
      cache?.content,
      cachedTitle,
      linkBase,
      onContentDirtyChange,
      registerEditor,
      registerImagePreview,
      resource.content,
      resource.id,
      resource.name,
    ]
  );

  useEffect(() => {
    const editor = bodyEditorRef.current;
    if (!ready || !editor || editor.isDestroyed) {
      return;
    }
    const tr = editor.state.tr;
    let changed = false;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'mention') {
        return;
      }
      const id = String(node.attrs.id ?? '');
      const next = namesById[id];
      if (!next || next === node.attrs.label) {
        return;
      }
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, label: next });
      changed = true;
    });
    if (!changed) {
      return;
    }
    tr.setMeta('addToHistory', false);
    editor.view.dispatch(tr);
  }, [namesById, ready]);

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
    toast.success(t('actions.copy_content_success'), {
      position: 'bottom-right',
    });
  }, [t]);

  const uploadImage = useResourceImageUpload({
    linkBase,
    namespaceId,
    resourceId: resource.id,
  });

  useEffect(() => {
    onTitle(cachedTitle);
  }, [cachedTitle]);

  const handleNavigateToTitle = useCallback(() => {
    const ta = titleRef.current?.textArea;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }, []);

  useResourceEditorSave({
    app,
    baselineRef,
    bodyEditorRef,
    contentHash: resource.content_hash,
    getAnchorSync,
    locationState: loc.state,
    namespaceId,
    navigate,
    onContentDirtyChange,
    onResource,
    resourceId: resource.id,
    title,
  });

  return (
    <div
      onInputCapture={() => beginEditorInput(resource.id)}
      className={`resource-editable-page relative ${
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
      <ImagePreviewDialog {...imagePreviewProps} />
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
      <div className="resource-editable-editor" ref={editorSurfaceRef}>
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
      <MentionHoverCard
        containerRef={editorSurfaceRef}
        membersById={membersById}
      />
    </div>
  );
}

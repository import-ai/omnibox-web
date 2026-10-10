import '@import-ai/omnibox-editor/style.css';
import './resourceEditor.css';

import {
  contentToTiptapJson,
  OmniboxEditor,
  type TiptapJsonContent,
} from '@import-ai/omnibox-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import useTheme from '@/hooks/useTheme';
import { Resource, SharedResource } from '@/interface';
import { cn } from '@/lib/utils';
import {
  OMNIBOX_EDITOR_CONTENT_WIDTH,
  OMNIBOX_EDITOR_WIDE_CONTENT_WIDTH,
} from '@/page/resource/editor/const';
import { resolveMentionLabels } from '@/page/resource/mentionLabels';
import { useMentionUsers } from '@/page/resource/useMentionUsers';

import { ResourceCommentsSheet } from './comments/ResourceCommentsSheet';
import {
  type ResourceCommentsController,
  useResourceComments,
} from './comments/useResourceComments';
import { parseScrollToLine } from './scrollToLine';
import { embedImage, getReadonlyResourceEditorKey } from './utils';

interface IProps {
  comments?: ResourceCommentsController;
  commentsDisabled?: boolean;
  resource: Resource | SharedResource;
  namespaceId?: string;
  showToc?: boolean;
  scrollToLine?: number;
  wide?: boolean;
  linkBase?: string;
  style?: React.CSSProperties;
}

type ResourceOmniboxEditorProps = Omit<
  React.ComponentProps<typeof OmniboxEditor>,
  'content'
> & {
  content?: string | TiptapJsonContent;
  locale?: string;
  theme?: 'light' | 'dark';
};

const ResourceOmniboxEditor =
  OmniboxEditor as React.ComponentType<ResourceOmniboxEditorProps>;

function getResourceEditorContent(
  resource: Resource | SharedResource,
  linkBase?: string,
  namesById: Record<string, string> = {}
): TiptapJsonContent {
  return contentToTiptapJson(
    resolveMentionLabels(embedImage(resource), namesById),
    { linkBase }
  );
}

interface OmniboxRenderProps extends IProps {
  comments: ResourceCommentsController;
}

function OmniboxRender(props: OmniboxRenderProps) {
  const {
    resource,
    comments,
    namespaceId,
    linkBase,
    scrollToLine: requestedLine,
    showToc = true,
    style,
    wide = false,
  } = props;
  const { i18n, t } = useTranslation();
  const { theme } = useTheme();
  const { mentionUsers, namesById, ready } = useMentionUsers(namespaceId);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const search = searchParams.get('query');
  const [isScrollLineVisible, setIsScrollLineVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const content = useMemo(
    () => getResourceEditorContent(resource, linkBase, namesById),
    [linkBase, namesById, resource]
  );
  const targetScrollToLine = requestedLine ?? parseScrollToLine(location.hash);
  const scrollToLine = isScrollLineVisible ? targetScrollToLine : undefined;

  const handleCodeBlockCopy = useCallback(() => {
    toast(t('actions.copy_content_success'), {
      position: 'bottom-right',
    });
  }, [t]);

  useEffect(() => {
    setIsScrollLineVisible(true);
  }, [targetScrollToLine]);

  useEffect(() => {
    if (!isScrollLineVisible) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const highlightedElement = containerRef.current?.querySelector(
        '[data-scroll-line-highlight="true"]'
      );
      if (!highlightedElement) {
        return;
      }

      const highlightedBlock = highlightedElement.closest(
        '.tiptap.ProseMirror > *'
      );
      if (highlightedBlock?.contains(event.target)) {
        return;
      }

      setIsScrollLineVisible(false);
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [isScrollLineVisible]);

  const editorClassName = cn(
    'resource-readonly-editor pb-[30vh]',
    !isScrollLineVisible && 'resource-readonly-editor--scroll-line-dismissed',
    wide && 'resource-readonly-editor--wide'
  );

  if (!ready) {
    return <div ref={containerRef} style={style} className={editorClassName} />;
  }

  return (
    <div ref={containerRef} style={style} className={editorClassName}>
      <ResourceOmniboxEditor
        key={getReadonlyResourceEditorKey(resource)}
        editable={false}
        content={content}
        mentionUsers={mentionUsers}
        linkBase={linkBase}
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
        searchTerm={search ?? undefined}
        scrollToLine={scrollToLine}
        comments={props.commentsDisabled ? undefined : comments.commentsConfig}
        onReady={props.commentsDisabled ? undefined : comments.registerEditor}
        onCodeBlockCopy={handleCodeBlockCopy}
        scrollToLineContent={embedImage(resource)}
      />
    </div>
  );
}

function StandaloneOmniboxRender(props: IProps) {
  const { namespaceId = '', resource } = props;
  const commentsEnabled = !!namespaceId;
  const comments = useResourceComments({
    namespaceId,
    resource,
    enabled: commentsEnabled,
  });

  return (
    <>
      <OmniboxRender {...props} comments={comments} />
      {commentsEnabled ? <ResourceCommentsSheet controller={comments} /> : null}
    </>
  );
}

export default function Render(props: IProps) {
  return props.comments ? (
    <OmniboxRender {...props} comments={props.comments} />
  ) : (
    <StandaloneOmniboxRender {...props} />
  );
}

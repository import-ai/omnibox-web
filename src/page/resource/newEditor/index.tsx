import './styles.css';
import 'katex/dist/katex.min.css';

import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics';
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from '@tiptap/extension-table';
import { Markdown as TiptapMarkdown } from '@tiptap/markdown';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code, Italic, Strikethrough } from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { TooltipProvider } from '@/components/tooltip';
import { cn } from '@/lib/utils';

import { EditorAudio } from './components/audio/audioExtension';
import { DiagramCodeBlock } from './components/diagram/diagramCodeBlockExtension';
import {
  type EditorMode,
  isRenderedEditorMode,
  isSourceEditorMode,
} from './components/editorMode';
import { EditorEmoji } from './components/emoji/editorEmoji';
import InlineToolbarButton from './components/InlineToolbarButton';
import { EditorKeyboardShortcuts } from './components/keyboardShortcuts';
import LinkPopover from './components/link-popover';
import { MarkdownPreview } from './components/preview/MarkdownPreview';
import { getEditorPreviewLinkBase } from './components/previewLinkBase';
import { shortcutLabels } from './components/shortcutLabels';
import TableContextMenu from './components/table/TableContextMenu';
import { TableEditableEdges } from './components/table/tableEditableEdges';
import Toolbar from './components/Toolbar';

const bubbleIconClassName = 'size-4';

interface TiptapProps {
  content: string;
  namespaceId: string;
  onChange: (content: string) => void;
  resourceId: string;
}

const Tiptap = (props: TiptapProps) => {
  const { content, namespaceId, onChange, resourceId } = props;
  const { t } = useTranslation();
  const sourceEditorRef = useRef<HTMLTextAreaElement>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('wysiwyg');
  const [fullscreen, setFullscreen] = useState(false);
  const [recordingLocked, setRecordingLocked] = useState(false);
  const [sourceContent, setSourceContent] = useState(content);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: {
          openOnClick: false,
        },
      }),
      DiagramCodeBlock,
      BlockMath.configure({
        katexOptions: {
          displayMode: true,
          throwOnError: false,
        },
      }),
      InlineMath.configure({
        katexOptions: {
          displayMode: false,
          throwOnError: false,
        },
      }),
      TiptapMarkdown,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'omnibox-tiptap-image',
        },
      }),
      EditorEmoji,
      EditorAudio.configure({
        controls: true,
        preload: 'metadata',
      }),
      Table.configure({
        allowTableNodeSelection: true,
        cellMinWidth: 80,
        handleWidth: 5,
        HTMLAttributes: {
          class: 'omnibox-tiptap-table',
        },
        lastColumnResizable: true,
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TableEditableEdges,
      EditorKeyboardShortcuts,
    ],
    content,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class:
          'omnibox-tiptap-editor px-9 py-2.5 text-base leading-6 text-slate-900 outline-none prose prose-slate max-w-none [&_p]:my-4 [&_hr]:my-3 dark:prose-invert dark:text-slate-100',
      },
    },
    onUpdate: ({ editor }) => {
      const nextContent = editor.getMarkdown();

      setSourceContent(nextContent);
      onChange(nextContent);
    },
  });

  useEffect(() => {
    setSourceContent(currentContent =>
      currentContent === content ? currentContent : content
    );

    if (!isRenderedEditorMode(editorMode)) {
      return;
    }

    if (!editor || editor.getMarkdown() === content) {
      return;
    }

    editor.commands.setContent(content, {
      contentType: 'markdown',
      emitUpdate: false,
    });
  }, [content, editor, editorMode]);

  useEffect(() => {
    editor?.setEditable(
      !recordingLocked && isRenderedEditorMode(editorMode),
      false
    );
  }, [editor, editorMode, recordingLocked]);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFullscreen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [fullscreen]);

  const providerValue = useMemo(() => ({ editor }), [editor]);

  const handleModeChange = (nextMode: EditorMode) => {
    if (nextMode === editorMode) {
      return;
    }

    if (isSourceEditorMode(nextMode)) {
      setSourceContent(editor?.getMarkdown() ?? sourceContent);
      setEditorMode(nextMode);
      return;
    }

    if (isSourceEditorMode(editorMode)) {
      editor?.commands.setContent(sourceContent, {
        contentType: 'markdown',
        emitUpdate: false,
      });
      onChange(sourceContent);
    }

    setEditorMode(nextMode);
  };

  useEffect(() => {
    if (recordingLocked) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isModKey = event.metaKey || event.ctrlKey;

      if (!isModKey || !event.altKey) {
        return;
      }

      if (event.key === '7') {
        event.preventDefault();
        handleModeChange('wysiwyg');
      }

      if (event.key === '8') {
        event.preventDefault();
        handleModeChange('instant');
      }

      if (event.key === '9') {
        event.preventDefault();
        handleModeChange('split');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editorMode, editor, recordingLocked, sourceContent]);

  const handleSourceChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextContent = event.target.value;

    setSourceContent(nextContent);
    onChange(nextContent);
  };

  const selectSourceLine = (line: number) => {
    const textarea = sourceEditorRef.current;

    if (!textarea) {
      return;
    }

    let start = 0;

    for (let currentLine = 1; currentLine < line; currentLine += 1) {
      const nextBreak = sourceContent.indexOf('\n', start);

      if (nextBreak === -1) {
        start = sourceContent.length;
        break;
      }

      start = nextBreak + 1;
    }

    const nextBreak = sourceContent.indexOf('\n', start);
    const end =
      nextBreak === -1
        ? sourceContent.length
        : sourceContent[nextBreak - 1] === '\r'
          ? nextBreak - 1
          : nextBreak;
    const lineHeight =
      Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 24;

    textarea.focus();
    textarea.setSelectionRange(start, end);
    textarea.scrollTop = Math.max(0, (line - 4) * lineHeight);
  };

  return (
    <TooltipProvider>
      <EditorContext.Provider value={providerValue}>
        <div
          className={cn(
            'relative overflow-hidden rounded border border-slate-300 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-950',
            fullscreen &&
              'fixed inset-0 z-40 flex flex-col rounded-none border-0 shadow-none'
          )}
        >
          <Toolbar
            attachmentContext={{ namespaceId, resourceId }}
            editor={editor}
            editorMode={editorMode}
            fullscreen={fullscreen}
            sourceContent={sourceContent}
            onFullscreenChange={setFullscreen}
            onModeChange={handleModeChange}
            recordingLocked={recordingLocked}
            onRecordingChange={setRecordingLocked}
            onSelectSourceLine={selectSourceLine}
          />
          <div
            className={cn(
              'relative bg-white dark:bg-neutral-950',
              fullscreen && 'min-h-0 flex-1 overflow-auto'
            )}
          >
            {isRenderedEditorMode(editorMode) ? (
              <TableContextMenu editor={recordingLocked ? null : editor}>
                <EditorContent
                  editor={editor}
                  className={cn(
                    editorMode === 'instant' && 'omnibox-tiptap-editor-ir'
                  )}
                />
              </TableContextMenu>
            ) : (
              <div
                className={cn(
                  'bg-white dark:bg-neutral-950',
                  fullscreen && 'h-full min-h-0',
                  editorMode === 'split' &&
                    'grid min-h-[420px] grid-cols-1 md:grid-cols-2'
                )}
              >
                <textarea
                  ref={sourceEditorRef}
                  aria-label={
                    editorMode === 'split'
                      ? t('resource.editor.toolbar.split_preview_mode')
                      : t('resource.editor.toolbar.instant_render_mode')
                  }
                  disabled={recordingLocked}
                  value={sourceContent}
                  onChange={handleSourceChange}
                  className={cn(
                    'block min-h-[360px] w-full bg-white px-9 py-4 font-mono text-sm leading-6 text-slate-900 outline-none dark:bg-neutral-950 dark:text-slate-100',
                    'selection:bg-blue-100 dark:selection:bg-blue-500/40',
                    fullscreen && 'h-full min-h-0 resize-none',
                    editorMode === 'split' &&
                      'resize-none border-b border-slate-200 md:border-b-0 md:border-r dark:border-neutral-800'
                  )}
                />
                {editorMode === 'split' && (
                  <div
                    className={cn(
                      'min-h-[360px] overflow-auto px-9 py-4',
                      fullscreen && 'h-full min-h-0'
                    )}
                  >
                    <MarkdownPreview
                      content={sourceContent}
                      linkBase={getEditorPreviewLinkBase()}
                    />
                  </div>
                )}
              </div>
            )}
            {recordingLocked && (
              <div
                aria-live="polite"
                className="absolute inset-0 z-20 flex items-start justify-center bg-slate-950/45 pt-10 backdrop-blur-[1px] dark:bg-black/55"
              >
                <div className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-neutral-800">
                  {t('resource.editor.record.recording')}
                </div>
              </div>
            )}
          </div>
        </div>

        {!recordingLocked && isRenderedEditorMode(editorMode) && (
          <BubbleMenu
            editor={editor}
            className="flex items-center gap-1 rounded border border-slate-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          >
            <InlineToolbarButton
              label={t('resource.editor.toolbar.bold')}
              active={editor?.isActive('bold')}
              shortcut={shortcutLabels.bold}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className={bubbleIconClassName} />
            </InlineToolbarButton>
            <InlineToolbarButton
              label={t('resource.editor.toolbar.italic')}
              active={editor?.isActive('italic')}
              shortcut={shortcutLabels.italic}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className={bubbleIconClassName} />
            </InlineToolbarButton>
            <InlineToolbarButton
              label={t('resource.editor.toolbar.strikethrough')}
              active={editor?.isActive('strike')}
              shortcut={shortcutLabels.strike}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className={bubbleIconClassName} />
            </InlineToolbarButton>
            <InlineToolbarButton
              label={t('resource.editor.toolbar.inline_code')}
              active={editor?.isActive('code')}
              shortcut={shortcutLabels.inlineCode}
              onClick={() => editor?.chain().focus().toggleCode().run()}
            >
              <Code className={bubbleIconClassName} />
            </InlineToolbarButton>
            <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-neutral-700" />
            <LinkPopover
              editor={editor}
              align="center"
              contentSide="top"
              hideWhenUnavailable
              shortcut={shortcutLabels.link}
            />
          </BubbleMenu>
        )}
      </EditorContext.Provider>
    </TooltipProvider>
  );
};

export default Tiptap;

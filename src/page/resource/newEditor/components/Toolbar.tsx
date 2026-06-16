import { Editor, useEditorState } from '@tiptap/react';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  CheckSquare,
  Code,
  CodeXml,
  Heading,
  Image as ImageIcon,
  Italic,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { cn } from '@/lib/utils';

import type { EditorAttachmentContext } from './attachments/attachmentUpload';
import AttachmentUploadButton from './attachments/AttachmentUploadButton';
import { EDITOR_ATTACHMENT_ACCEPT } from './attachments/attachmentValidation';
import EditModeMenu from './edit-mode/EditModeMenu';
import { type EditorMode, isRenderedEditorMode } from './editorMode';
import DiagramInsertMenu from './insert-menu/DiagramInsertMenu';
import EmojiPicker from './insert-menu/EmojiPicker';
import MathInsertMenu from './insert-menu/MathInsertMenu';
import LinkPopover from './link-popover';
import OutlinePopover from './outline/OutlinePopover';
import RecordingButton from './recording/RecordingButton';
import { getToolbarLabel, shortcutLabels } from './shortcutLabels';
import { canInsertTable } from './table/tableActions';
import TableSizePicker from './table/TableSizePicker';
import { insertEmptyParagraph } from './toolbarActions';

const iconClassName = 'size-4';

interface ToolbarProps {
  attachmentContext: EditorAttachmentContext;
  editorMode: EditorMode;
  editor: Editor | null;
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onModeChange?: (mode: EditorMode) => void;
  recordingLocked?: boolean;
  onRecordingChange?: (recording: boolean) => void;
  onSelectSourceLine?: (line: number) => void;
  sourceContent?: string;
}

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  shortcut?: string;
  children: React.ReactNode;
}

function ToolbarButton(props: ToolbarButtonProps) {
  const { active, children, disabled, label, onClick, shortcut } = props;
  const tooltipLabel = getToolbarLabel(label, shortcut);

  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
      className={[
        'flex size-7 items-center justify-center rounded text-slate-600 transition-colors',
        'hover:bg-slate-200 hover:text-slate-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        'disabled:pointer-events-none disabled:text-slate-300',
        'dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white',
        active
          ? 'bg-slate-200 text-slate-950 dark:bg-neutral-800 dark:text-white'
          : '',
      ].join(' ')}
    >
      {children}
    </button>
  );

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {disabled ? (
          <span className="inline-flex cursor-not-allowed">{button}</span>
        ) : (
          button
        )}
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipLabel}</TooltipContent>
    </Tooltip>
  );
}

function ToolbarSeparator() {
  return <div className="mx-1 h-6 w-px bg-slate-300 dark:bg-neutral-700" />;
}

function getActiveListItemName(editor: Editor): 'listItem' | 'taskItem' {
  return editor.isActive('taskItem') ? 'taskItem' : 'listItem';
}

function Toolbar(props: ToolbarProps) {
  const {
    attachmentContext,
    editor,
    editorMode,
    fullscreen,
    onFullscreenChange,
    onModeChange,
    onRecordingChange,
    onSelectSourceLine,
    recordingLocked,
    sourceContent = '',
  } = props;
  const { t } = useTranslation();
  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return null;
      }

      const listItemName = getActiveListItemName(currentEditor);

      return {
        activeBlockquote: currentEditor.isActive('blockquote'),
        activeBold: currentEditor.isActive('bold'),
        activeCode: currentEditor.isActive('code'),
        activeBulletList: currentEditor.isActive('bulletList'),
        activeCodeBlock: currentEditor.isActive('codeBlock'),
        activeHeading: currentEditor.isActive('heading'),
        activeItalic: currentEditor.isActive('italic'),
        activeOrderedList: currentEditor.isActive('orderedList'),
        activeStrike: currentEditor.isActive('strike'),
        activeTaskList: currentEditor.isActive('taskList'),
        canInsertTable: canInsertTable(currentEditor, {
          cols: 3,
          rows: 3,
        }),
        canDecreaseIndent: currentEditor.can().liftListItem(listItemName),
        canIncreaseIndent: currentEditor.can().sinkListItem(listItemName),
        canRedo: currentEditor.can().redo(),
        canUndo: currentEditor.can().undo(),
        listItemName,
      };
    },
  });

  if (!editor || !editorState) {
    return null;
  }

  const tiptapActionsDisabled =
    recordingLocked || !isRenderedEditorMode(editorMode);

  return (
    <div className="bg-white dark:bg-neutral-950">
      <div
        className={cn(
          'group flex flex-nowrap items-center gap-1 overflow-x-auto px-0 py-2',
          fullscreen && 'mx-auto w-full max-w-4xl'
        )}
      >
        <div
          className={cn(
            'flex max-w-0 flex-nowrap items-center gap-1 overflow-hidden opacity-0 transition-[max-width,opacity] duration-200',
            'group-hover:max-w-[720px] group-hover:opacity-100 group-focus-within:max-w-[720px] group-focus-within:opacity-100'
          )}
        >
          <ToolbarButton
            label={t('resource.editor.toolbar.heading')}
            active={editorState.activeHeading}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.heading}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.bold')}
            active={editorState.activeBold}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.italic')}
            active={editorState.activeItalic}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.strikethrough')}
            active={editorState.activeStrike}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.strike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className={iconClassName} />
          </ToolbarButton>
          <LinkPopover
            editor={tiptapActionsDisabled ? null : editor}
            shortcut={shortcutLabels.link}
          />

          <ToolbarSeparator />

          <ToolbarButton
            label={t('resource.editor.toolbar.bullet_list')}
            active={editorState.activeBulletList}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.bulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.ordered_list')}
            active={editorState.activeOrderedList}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.orderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.task_list')}
            active={editorState.activeTaskList}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.taskList}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <CheckSquare className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.decrease_indent')}
            disabled={tiptapActionsDisabled || !editorState.canDecreaseIndent}
            onClick={() =>
              editor
                .chain()
                .focus()
                .liftListItem(editorState.listItemName)
                .run()
            }
          >
            <ListIndentDecrease className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.increase_indent')}
            disabled={tiptapActionsDisabled || !editorState.canIncreaseIndent}
            onClick={() =>
              editor
                .chain()
                .focus()
                .sinkListItem(editorState.listItemName)
                .run()
            }
          >
            <ListIndentIncrease className={iconClassName} />
          </ToolbarButton>

          <ToolbarSeparator />

          <ToolbarButton
            label={t('resource.editor.toolbar.quote')}
            active={editorState.activeBlockquote}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.quote}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.horizontal_rule')}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.horizontalRule}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.code_block')}
            active={editorState.activeCodeBlock}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.codeBlock}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <CodeXml className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.inline_code')}
            active={editorState.activeCode}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.inlineCode}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            <Code className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.insert_before')}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.insertBefore}
            onClick={() => insertEmptyParagraph(editor, 'before')}
          >
            <ArrowUpToLine className={iconClassName} />
          </ToolbarButton>
          <ToolbarButton
            label={t('resource.editor.toolbar.insert_after')}
            disabled={tiptapActionsDisabled}
            shortcut={shortcutLabels.insertAfter}
            onClick={() => insertEmptyParagraph(editor, 'after')}
          >
            <ArrowDownToLine className={iconClassName} />
          </ToolbarButton>

          <ToolbarSeparator />

          <AttachmentUploadButton
            accept={EDITOR_ATTACHMENT_ACCEPT}
            context={attachmentContext}
            editor={editor}
            icon={ImageIcon}
            label={t('resource.editor.toolbar.image')}
            disabled={tiptapActionsDisabled}
          />
          <TableSizePicker
            editor={editor}
            disabled={tiptapActionsDisabled || !editorState.canInsertTable}
          />
          <EmojiPicker editor={editor} disabled={tiptapActionsDisabled} />
          <MathInsertMenu editor={editor} disabled={tiptapActionsDisabled} />
          <DiagramInsertMenu editor={editor} disabled={tiptapActionsDisabled} />

          <ToolbarSeparator />
        </div>

        <RecordingButton
          context={attachmentContext}
          disabled={!isRenderedEditorMode(editorMode)}
          editor={editor}
          label={t('resource.editor.toolbar.record')}
          onRecordingChange={onRecordingChange}
        />

        <ToolbarSeparator />

        <ToolbarButton
          label={t('resource.editor.toolbar.undo')}
          disabled={tiptapActionsDisabled || !editorState.canUndo}
          shortcut={shortcutLabels.undo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className={iconClassName} />
        </ToolbarButton>
        <ToolbarButton
          label={t('resource.editor.toolbar.redo')}
          disabled={tiptapActionsDisabled || !editorState.canRedo}
          shortcut={shortcutLabels.redo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className={iconClassName} />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          label={
            fullscreen
              ? t('resource.editor.toolbar.exit_fullscreen')
              : t('resource.editor.toolbar.fullscreen')
          }
          active={fullscreen}
          disabled={recordingLocked}
          onClick={() => onFullscreenChange?.(!fullscreen)}
        >
          {fullscreen ? (
            <Minimize2 className={iconClassName} />
          ) : (
            <Maximize2 className={iconClassName} />
          )}
        </ToolbarButton>
        <EditModeMenu
          mode={editorMode}
          disabled={recordingLocked}
          onModeChange={mode => onModeChange?.(mode)}
        />
        <OutlinePopover
          editor={editor}
          mode={editorMode}
          disabled={recordingLocked}
          onSelectSourceLine={onSelectSourceLine ?? (() => undefined)}
          sourceContent={sourceContent}
        />
      </div>
    </div>
  );
}

export default Toolbar;

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { ResourceMeta } from '@/interface';
import { cn } from '@/lib/utils';

import {
  createInlineChatTokenIconElement,
  inlineChatTokenClassName,
} from './InlineChatToken';
import { IResTypeContext, ToolType } from './types';

interface IProps {
  value: string;
  disabled: boolean;
  tools: ToolType[];
  selectedResources: IResTypeContext[];
  onChange: (value: string) => void;
  onToolsChange: (value: ToolType[]) => void;
  onSelectedResourcesChange: (value: IResTypeContext[]) => void;
  onSend: () => void;
}

export interface ChatInputHandle {
  clear: () => void;
  focus: () => void;
  insertResource: (resource: ResourceMeta) => void;
  rememberSelection: () => void;
  toggleTool: (tool: ToolType) => void;
}

type TokenData =
  | {
      kind: 'tool';
      label: string;
      tool: ToolType;
    }
  | {
      kind: 'resource';
      label: string;
      resource: ResourceMeta;
      type: IResTypeContext['type'];
    };

interface SerializedRange {
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
}

function getResourceContextType(
  resource: ResourceMeta
): IResTypeContext['type'] {
  return resource.resource_type === 'folder' ||
    resource.resource_type === 'smart_folder'
    ? 'folder'
    : 'resource';
}

function isTokenNode(node: Node | null): node is HTMLElement {
  return node instanceof HTMLElement && Boolean(node.dataset.chatToken);
}

function childIndex(node: Node) {
  return Array.prototype.indexOf.call(node.parentNode?.childNodes ?? [], node);
}

function getNodePath(root: Node, node: Node) {
  const path: number[] = [];
  let current: Node | null = node;
  while (current && current !== root) {
    const parent = current.parentNode;
    if (!parent) return null;
    path.unshift(childIndex(current));
    current = parent;
  }
  return current === root ? path : null;
}

function getNodeFromPath(root: Node, path: number[]) {
  let current: Node | null = root;
  for (const index of path) {
    current = current?.childNodes[index] ?? null;
    if (!current) return null;
  }
  return current;
}

function getMaxOffset(node: Node) {
  return node.nodeType === Node.TEXT_NODE
    ? (node.textContent?.length ?? 0)
    : node.childNodes.length;
}

function sameTools(a: ToolType[], b: ToolType[]) {
  return a.length === b.length && a.every((tool, index) => tool === b[index]);
}

function sameResources(a: IResTypeContext[], b: IResTypeContext[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      item.type === other.type &&
      item.resource.id === other.resource.id &&
      item.resource.name === other.resource.name
    );
  });
}

const ChatInput = forwardRef<ChatInputHandle, IProps>(
  function ChatInput(props, ref) {
    const {
      value,
      disabled,
      tools,
      selectedResources,
      onChange,
      onToolsChange,
      onSelectedResourcesChange,
      onSend,
    } = props;
    const { t } = useTranslation();
    const editorRef = useRef<HTMLDivElement>(null);
    const savedRangeRef = useRef<Range | null>(null);
    const serializedRangeRef = useRef<SerializedRange | null>(null);
    const preferSavedRangeRef = useRef(false);
    const pauseSelectionUpdatesRef = useRef(false);
    const [isComposing, setIsComposing] = useState(false);
    const [empty, setEmpty] = useState(true);

    const getToolLabel = (tool: ToolType) => t(`chat.tools.${tool}`);

    const serializeRange = (editor: HTMLElement, range: Range) => {
      const startPath = getNodePath(editor, range.startContainer);
      const endPath = getNodePath(editor, range.endContainer);
      if (!startPath || !endPath) return null;
      return {
        startPath,
        startOffset: range.startOffset,
        endPath,
        endOffset: range.endOffset,
      };
    };

    const rangeFromSerialized = (serialized: SerializedRange) => {
      const editor = editorRef.current;
      if (!editor) return null;
      const start = getNodeFromPath(editor, serialized.startPath);
      const end = getNodeFromPath(editor, serialized.endPath);
      if (!start || !end) return null;
      const range = document.createRange();
      range.setStart(
        start,
        Math.min(serialized.startOffset, getMaxOffset(start))
      );
      range.setEnd(end, Math.min(serialized.endOffset, getMaxOffset(end)));
      return range;
    };

    const saveSelection = (force = false) => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection || selection.rangeCount === 0) return false;
      if (pauseSelectionUpdatesRef.current && !force) return false;
      if (!force && document.activeElement !== editor) return false;
      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return false;
      savedRangeRef.current = range.cloneRange();
      serializedRangeRef.current = serializeRange(editor, range);
      return true;
    };

    const rangeAtEnd = () => {
      const editor = editorRef.current;
      if (!editor) return null;
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      return range;
    };

    const insertionRange = () => {
      const editor = editorRef.current;
      if (!editor) return null;
      if (preferSavedRangeRef.current) {
        preferSavedRangeRef.current = false;
        const serializedRange = serializedRangeRef.current
          ? rangeFromSerialized(serializedRangeRef.current)
          : null;
        if (serializedRange) return serializedRange;
        if (
          savedRangeRef.current &&
          editor.contains(savedRangeRef.current.commonAncestorContainer)
        ) {
          return savedRangeRef.current.cloneRange();
        }
      }
      const selection = window.getSelection();
      if (
        document.activeElement === editor &&
        selection &&
        selection.rangeCount > 0 &&
        editor.contains(selection.getRangeAt(0).commonAncestorContainer)
      ) {
        return selection.getRangeAt(0).cloneRange();
      }
      if (
        savedRangeRef.current &&
        editor.contains(savedRangeRef.current.commonAncestorContainer)
      ) {
        return savedRangeRef.current.cloneRange();
      }
      return rangeAtEnd();
    };

    const placeCaret = (container: Node, offset: number) => {
      const range = document.createRange();
      range.setStart(container, offset);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      savedRangeRef.current = range.cloneRange();
      serializedRangeRef.current = editorRef.current
        ? serializeRange(editorRef.current, range)
        : null;
    };

    const placeCaretAfter = (node: Node) => {
      const parent = node.parentNode;
      if (!parent) return;
      placeCaret(parent, childIndex(node) + 1);
    };

    const isTokenBoundaryText = (node: Node | null): node is Text => {
      if (node?.nodeType !== Node.TEXT_NODE) return false;
      return node.textContent === '' || node.textContent === ' ';
    };

    const createToken = (token: TokenData) => {
      const span = document.createElement('span');
      span.contentEditable = 'false';
      span.dataset.chatToken = token.kind;
      span.dataset.label = token.label;
      span.className = inlineChatTokenClassName;
      span.append(
        createInlineChatTokenIconElement(
          token.kind === 'resource' ? 'resource' : token.tool
        ),
        document.createTextNode(token.label)
      );
      span.title = token.label;

      if (token.kind === 'tool') {
        span.dataset.tool = token.tool;
        return span;
      }

      span.dataset.resourceId = token.resource.id;
      span.dataset.resourceName = token.resource.name || '';
      span.dataset.resourceType = token.resource.resource_type;
      span.dataset.parentId = token.resource.parent_id || '';
      span.dataset.contextType = token.type;
      return span;
    };

    const tokenDataFromElement = (element: HTMLElement): TokenData | null => {
      const label = element.dataset.label || element.textContent || '';
      if (element.dataset.chatToken === 'tool') {
        const tool = element.dataset.tool as ToolType | undefined;
        if (!tool || tool === ToolType.PRIVATE_SEARCH) return null;
        return { kind: 'tool', label, tool };
      }

      if (element.dataset.chatToken !== 'resource') return null;
      const id = element.dataset.resourceId;
      const resourceType = element.dataset.resourceType as
        | ResourceMeta['resource_type']
        | undefined;
      if (!id || !resourceType) return null;

      const resource: ResourceMeta = {
        id,
        name: element.dataset.resourceName || label,
        parent_id: element.dataset.parentId || null,
        resource_type: resourceType,
      };
      return {
        kind: 'resource',
        label: resource.name || label,
        resource,
        type:
          (element.dataset.contextType as
            | IResTypeContext['type']
            | undefined) || getResourceContextType(resource),
      };
    };

    const readEditor = () => {
      const editor = editorRef.current;
      const tools: ToolType[] = [];
      const resources = new Map<string, IResTypeContext>();
      let query = '';

      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          query += node.textContent || '';
          return;
        }
        if (!(node instanceof HTMLElement)) return;

        const token = tokenDataFromElement(node);
        if (token?.kind === 'tool') {
          if (!tools.includes(token.tool)) tools.push(token.tool);
          return;
        }
        if (token?.kind === 'resource') {
          query += token.label;
          resources.set(`${token.resource.id}:${token.type}`, {
            type: token.type,
            resource: token.resource,
          });
          return;
        }
        if (node.tagName === 'BR') {
          if (
            node.parentNode === editor &&
            !node.nextSibling &&
            node.previousSibling?.nodeType === Node.TEXT_NODE &&
            node.previousSibling.textContent?.endsWith('\n')
          ) {
            return;
          }
          query += '\n';
          return;
        }
        node.childNodes.forEach(walk);
      };

      editor?.childNodes.forEach(walk);
      return {
        query: query.replace(/\u00a0/g, ' '),
        tools,
        resources: Array.from(resources.values()),
      };
    };

    const syncFromDom = () => {
      const state = readEditor();
      if (state.query !== value) onChange(state.query);
      if (!sameTools(tools, state.tools)) onToolsChange(state.tools);
      if (!sameResources(selectedResources, state.resources)) {
        onSelectedResourcesChange(state.resources);
      }
      setEmpty(state.query.length === 0 && state.tools.length === 0);
      pauseSelectionUpdatesRef.current = false;
      saveSelection();
    };

    const insertNodes = (nodes: Node[]) => {
      const editor = editorRef.current;
      const range = insertionRange();
      if (!editor || !range || nodes.length === 0) return;

      editor.focus();
      range.deleteContents();
      const fragment = document.createDocumentFragment();
      nodes.forEach(node => fragment.appendChild(node));
      const last = nodes[nodes.length - 1];
      range.insertNode(fragment);
      placeCaretAfter(last);
      pauseSelectionUpdatesRef.current = false;
      syncFromDom();
    };

    const insertToken = (token: TokenData) => {
      insertNodes([createToken(token), document.createTextNode(' ')]);
    };

    const removeToken = (token: HTMLElement, removeNextSpace = false) => {
      const parent = token.parentNode;
      if (!parent) return;
      const index = childIndex(token);
      const next = token.nextSibling;
      token.remove();
      if (removeNextSpace && isTokenBoundaryText(next)) {
        next.remove();
      }
      placeCaret(parent, Math.min(index, parent.childNodes.length));
      syncFromDom();
    };

    const removeTokenBeforeCaret = () => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (
        !editor ||
        !selection ||
        selection.rangeCount === 0 ||
        !selection.isCollapsed
      ) {
        return false;
      }

      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return false;
      const { startContainer, startOffset } = range;

      if (startContainer.nodeType === Node.TEXT_NODE) {
        const text = startContainer.textContent || '';
        const before = text.slice(0, startOffset);
        const token = startContainer.previousSibling;
        if ((before === '' || before === ' ') && isTokenNode(token)) {
          if (before === ' ') {
            startContainer.textContent = text.slice(startOffset);
          }
          removeToken(token);
          return true;
        }
        return false;
      }

      const container = startContainer as HTMLElement;
      const previous = container.childNodes[startOffset - 1];
      if (isTokenNode(previous)) {
        removeToken(previous, true);
        return true;
      }
      if (
        isTokenBoundaryText(previous) &&
        isTokenNode(previous.previousSibling)
      ) {
        const token = previous.previousSibling;
        previous.remove();
        removeToken(token);
        return true;
      }
      return false;
    };

    const moveCaretBeforeTokenFromRight = () => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (
        !editor ||
        !selection ||
        selection.rangeCount === 0 ||
        !selection.isCollapsed
      ) {
        return false;
      }

      const range = selection.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) return false;
      const { startContainer, startOffset } = range;

      if (startContainer.nodeType === Node.TEXT_NODE) {
        const text = startContainer.textContent || '';
        const before = text.slice(0, startOffset);
        const token = startContainer.previousSibling;
        if ((before === '' || before === ' ') && isTokenNode(token)) {
          const parent = token.parentNode;
          if (!parent) return false;
          placeCaret(parent, childIndex(token));
          return true;
        }
        return false;
      }

      const container = startContainer as HTMLElement;
      const previous = container.childNodes[startOffset - 1];
      if (isTokenNode(previous)) {
        placeCaret(container, childIndex(previous));
        return true;
      }
      if (
        isTokenBoundaryText(previous) &&
        isTokenNode(previous.previousSibling)
      ) {
        placeCaret(container, childIndex(previous.previousSibling));
        return true;
      }
      return false;
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (
        event.key === 'ArrowLeft' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        moveCaretBeforeTokenFromRight()
      ) {
        event.preventDefault();
        return;
      }
      if (event.key === 'Backspace' && removeTokenBeforeCaret()) {
        event.preventDefault();
        return;
      }
      if (isComposing || disabled) return;
      if (event.key !== 'Enter') return;

      if (event.shiftKey) {
        if (!event.metaKey && !event.ctrlKey && !event.altKey) {
          setTimeout(syncFromDom, 0);
        } else {
          event.preventDefault();
        }
        return;
      }
      event.preventDefault();
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      onSend();
    };

    const nodesFromHtml = (html: string, text: string) => {
      if (!html) return [document.createTextNode(text)];
      const template = document.createElement('template');
      template.innerHTML = html;
      const nodes: Node[] = [];

      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          nodes.push(document.createTextNode(node.textContent || ''));
          return;
        }
        if (!(node instanceof HTMLElement)) return;

        const token = tokenDataFromElement(node);
        if (token) {
          nodes.push(createToken(token));
          return;
        }
        if (node.tagName === 'BR') {
          nodes.push(document.createTextNode('\n'));
          return;
        }
        node.childNodes.forEach(walk);
      };

      template.content.childNodes.forEach(walk);
      return nodes.length > 0 ? nodes : [document.createTextNode(text)];
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const html = event.clipboardData.getData('text/html');
      const text = event.clipboardData.getData('text/plain');
      insertNodes(nodesFromHtml(html, text));
    };

    useImperativeHandle(ref, () => ({
      clear: () => {
        if (editorRef.current) editorRef.current.textContent = '';
        syncFromDom();
      },
      focus: () => {
        editorRef.current?.focus();
      },
      insertResource: resource => {
        insertToken({
          kind: 'resource',
          label: resource.name || t('untitled'),
          resource,
          type: getResourceContextType(resource),
        });
      },
      rememberSelection: () => {
        pauseSelectionUpdatesRef.current = true;
        preferSavedRangeRef.current = true;
      },
      toggleTool: tool => {
        const editor = editorRef.current;
        if (!editor || tool === ToolType.PRIVATE_SEARCH) return;
        const existing = editor.querySelector<HTMLElement>(
          `[data-chat-token="tool"][data-tool="${tool}"]`
        );
        if (existing) {
          removeToken(existing, true);
          return;
        }
        insertToken({ kind: 'tool', label: getToolLabel(tool), tool });
      },
    }));

    useEffect(() => {
      const handleSelectionChange = () => saveSelection();
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    });

    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;

      const existingTools = new Set(readEditor().tools);
      tools
        .filter(tool => tool !== ToolType.PRIVATE_SEARCH)
        .forEach(tool => {
          if (!existingTools.has(tool)) {
            editor.append(
              createToken({ kind: 'tool', label: getToolLabel(tool), tool }),
              ' '
            );
          }
        });

      const wantedTools = new Set(
        tools.filter(tool => tool !== ToolType.PRIVATE_SEARCH)
      );
      editor
        .querySelectorAll<HTMLElement>('[data-chat-token="tool"]')
        .forEach(token => {
          if (!wantedTools.has(token.dataset.tool as ToolType)) token.remove();
        });

      const existingResources = new Set(
        readEditor().resources.map(item => `${item.resource.id}:${item.type}`)
      );
      selectedResources.forEach(item => {
        const key = `${item.resource.id}:${item.type}`;
        if (!existingResources.has(key)) {
          editor.append(
            createToken({
              kind: 'resource',
              label: item.resource.name || t('untitled'),
              resource: item.resource,
              type: item.type,
            }),
            ' '
          );
        }
      });

      const wantedResources = new Set(
        selectedResources.map(item => `${item.resource.id}:${item.type}`)
      );
      editor
        .querySelectorAll<HTMLElement>('[data-chat-token="resource"]')
        .forEach(token => {
          const key = `${token.dataset.resourceId}:${token.dataset.contextType}`;
          if (!wantedResources.has(key)) token.remove();
        });

      syncFromDom();
    }, [selectedResources, tools]);

    return (
      <div className="relative mb-[2px] min-h-[60px]">
        {empty && (
          <div className="pointer-events-none absolute left-0 top-0 text-sm leading-7 text-[#9CA3AF] dark:text-gray-400">
            {t('chat.textarea.placeholder')}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'no-scrollbar min-h-[60px] max-h-[200px] cursor-text overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7 outline-none',
            'empty:before:content-none'
          )}
          onInput={syncFromDom}
          onKeyDown={handleKeyDown}
          onKeyUp={() => {
            pauseSelectionUpdatesRef.current = false;
            saveSelection();
          }}
          onMouseUp={() => {
            pauseSelectionUpdatesRef.current = false;
            saveSelection();
          }}
          onBlur={saveSelection}
          onCut={() => setTimeout(syncFromDom, 0)}
          onPaste={handlePaste}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
        />
      </div>
    );
  }
);

export default ChatInput;

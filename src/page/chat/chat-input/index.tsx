import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { WorkspaceResourcePicker } from '@/components/resourcePicker';
import type { ResourceMeta } from '@/interface';
import { normalizeResourceMeta } from '@/lib/resourceMeta';
import { cn } from '@/lib/utils';
import DecisionInput from '@/page/chat/chat-input/DecisionInput';
import {
  ApprovalMode,
  ChatMode,
  ComposerChatImage,
  IResTypeContext,
  SendMessageParams,
  ToolType,
} from '@/page/chat/chat-input/types';
import { MessageDetail } from '@/page/chat/core/types/conversation.ts';
import { getLatestContextCompactCapacity } from '@/page/chat/messages/role/assistantMessageUtils';
import type { TreeNode } from '@/page/sidebar/store';

import ApprovalModeSelect from './ApprovalModeSelect';
import ChatAction from './ChatAction';
import { CHAT_IMAGE_TYPES } from './chatImages';
import ChatInput from './ChatInput';
import ChatTool from './ChatTool';
import ContextCapacityIndicator from './ContextCapacityIndicator';
import ThinkingLevelSelector from './ThinkingLevelSelector';
import { useChatAreaDraftLifecycle } from './useChatAreaDraftLifecycle';
import { type ThinkingSelection, useThinkingLevel } from './useThinkingLevel';

interface IProps {
  messages: MessageDetail[];
  namespaceId?: string;
  navigatePrefix: string;
  selectedResources: IResTypeContext[];
  setSelectedResources: (resources: IResTypeContext[]) => void;
  renderResourcePicker?: (
    onSelect: (resource: ResourceMeta) => void
  ) => ReactNode;
  initialApprovalMode?: ApprovalMode;
  approvalModeResetKey?: string;
  suppressInitialToolRestore?: boolean;
  loading: boolean;
  waitingForAssistantDelta?: boolean;
  imageUploadDisabled?: boolean;
  imageUploadDisabledReason?: string;
  initialQuery?: string;
  sendMessage: (params: SendMessageParams) => void | Promise<void>;
  onStop?: () => void;
  onThinkingSelectionChange?: (
    selection: ThinkingSelection | undefined
  ) => void;
}

export default function ChatArea(props: IProps) {
  const {
    messages,
    namespaceId,
    navigatePrefix,
    selectedResources,
    setSelectedResources,
    renderResourcePicker,
    initialApprovalMode,
    approvalModeResetKey,
    suppressInitialToolRestore = false,
    loading,
    waitingForAssistantDelta = false,
    imageUploadDisabled = false,
    imageUploadDisabledReason,
    initialQuery,
    sendMessage,
    onStop,
  } = props;
  const { t } = useTranslation();
  const {
    config: thinkingConfig,
    selection,
    changeLevel,
    group: thinkingGroup,
    changeGroup,
  } = useThinkingLevel(navigatePrefix, messages);

  useEffect(() => {
    props.onThinkingSelectionChange?.(selection);
  }, [props.onThinkingSelectionChange, selection?.edition, selection?.level]);

  const [mode, setMode] = useState<ChatMode>(ChatMode.ASK);
  const [images, setImages] = useState<ComposerChatImage[]>([]);
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const imageIdRef = useRef(0);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const {
    approvalMode,
    clearComposerAfterSend,
    composerInitialState,
    composerSelectedResources,
    composerTools,
    handleComposerStateChange,
    handleQueryChange,
    handleToolsChange,
    inputRef,
    query,
    setSelectedApprovalMode,
    tools,
  } = useChatAreaDraftLifecycle({
    messages,
    navigatePrefix,
    selectedResources,
    setSelectedResources,
    initialApprovalMode,
    approvalModeResetKey,
    suppressInitialToolRestore,
    initialQuery,
  });
  useEffect(() => {
    if (selection && composerTools.includes(ToolType.REASONING)) {
      inputRef.current?.toggleTool(ToolType.REASONING);
    }
  }, [selection?.edition, composerTools, inputRef]);

  const contextCompactCapacity = getLatestContextCompactCapacity(messages);
  const defaultResourcePicker = namespaceId
    ? (onSelect: (resource: ResourceMeta) => void) => (
        <WorkspaceResourcePicker
          namespaceId={namespaceId}
          onSelect={onSelect}
        />
      )
    : undefined;

  const interrupts = messages.at(-1)?.attrs?.tool_call?.interrupts ?? [];
  const hasUnsupportedImages = imageUploadDisabled && images.length > 0;
  const disabled =
    loading ||
    isSubmitting ||
    hasUnsupportedImages ||
    (interrupts.length === 0 && (!query || query.trim().length === 0));

  useEffect(() => {
    return () => {
      imagesRef.current.forEach(image => URL.revokeObjectURL(image.url));
    };
  }, []);

  const handleImageSelect = useCallback(
    (files: File[]) => {
      if (imageUploadDisabled || submittingRef.current) return;
      const accepted = files.filter(file =>
        CHAT_IMAGE_TYPES.includes(file.type)
      );
      if (accepted.length !== files.length)
        toast.error(t('chat.image.unsupported_format'));
      const added = accepted.map(file => ({
        id: `composer-image-${imageIdRef.current++}`,
        name: file.name,
        url: URL.createObjectURL(file),
        file,
      }));
      setImages(current => [...current, ...added]);
    },
    [imageUploadDisabled, t]
  );

  const [{ isResourceOver }, connectResourceDrop] = useDrop<
    TreeNode | { files: File[] },
    void,
    { isResourceOver: boolean }
  >({
    accept: ['card', NativeTypes.FILE],
    canDrop: (_item, monitor) =>
      monitor.getItemType() === 'card' || !imageUploadDisabled,
    drop: (item, monitor) => {
      if (monitor.getItemType() === NativeTypes.FILE) {
        handleImageSelect((item as { files: File[] }).files);
      } else if (!submittingRef.current) {
        inputRef.current?.insertResource(
          normalizeResourceMeta(item as TreeNode)
        );
      }
    },
    collect: monitor => ({
      isResourceOver: monitor.isOver() && monitor.canDrop(),
    }),
  });
  const resourceDropRef = useCallback(
    (node: HTMLDivElement | null) => {
      connectResourceDrop(node);
    },
    [connectResourceDrop]
  );
  const handleSend = useCallback(async () => {
    if (submittingRef.current || disabled) return;
    const v = query.trim();
    if (v) {
      submittingRef.current = true;
      setIsSubmitting(true);
      try {
        const localTools = selection
          ? tools.filter(tool => tool !== ToolType.REASONING)
          : [...tools];
        const localContext = structuredClone(selectedResources);
        const displayParts = inputRef.current?.getDisplayParts();
        const localDisplayParts = displayParts?.some(
          part => part.type !== 'text'
        )
          ? displayParts
          : images.length
            ? [{ type: 'text' as const, text: v }]
            : undefined;
        const pendingImages = images;
        let prepared = false;
        const clearPreparedDraft = () => {
          if (prepared) return;
          prepared = true;
          pendingImages.forEach(image => URL.revokeObjectURL(image.url));
          setImages([]);
          clearComposerAfterSend();
          setIsPreparingImages(false);
        };
        if (pendingImages.length) setIsPreparingImages(true);
        else clearPreparedDraft();
        await sendMessage({
          query: v,
          selectedResources: localContext,
          tools: localTools,
          mode,
          approvalMode,
          displayParts: localDisplayParts,
          images: pendingImages,
          ...selection,
          onImagesUploaded: clearPreparedDraft,
        });
        clearPreparedDraft();
      } catch {
        // Request and stream layers report errors; allow a new submission.
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
        setIsPreparingImages(false);
      }
    }
  }, [
    approvalMode,
    selection,
    disabled,
    clearComposerAfterSend,
    inputRef,
    mode,
    query,
    selectedResources,
    sendMessage,
    tools,
    images,
  ]);

  const interruptedTurn = [...messages]
    .reverse()
    .find(message => message.message.role === 'user')?.attrs;

  return interrupts.length > 0 ? (
    <DecisionInput
      interrupts={interrupts}
      approvalMode={approvalMode}
      loading={loading}
      sendMessage={params =>
        sendMessage({
          ...params,
          ...(interruptedTurn?.edition && interruptedTurn.level
            ? { edition: interruptedTurn.edition, level: interruptedTurn.level }
            : {}),
        })
      }
    />
  ) : (
    <div
      ref={resourceDropRef}
      onPaste={event => {
        const files = Array.from(event.clipboardData.files);
        if (!files.length) return;
        handleImageSelect(files);
        if (!event.clipboardData.getData('text/plain')) event.preventDefault();
      }}
      className={cn(
        'max-w-[766px] w-full mx-auto rounded-2xl p-3 border border-solid border-gray-200 bg-white dark:bg-[#303030] dark:border-[#303030]',
        isResourceOver && 'ring-2 ring-blue-300'
      )}
    >
      <ChatInput
        ref={inputRef}
        value={query}
        initialComposerState={composerInitialState}
        onComposerStateChange={handleComposerStateChange}
        tools={composerTools}
        selectedResources={composerSelectedResources}
        onChange={handleQueryChange}
        onToolsChange={handleToolsChange}
        onSelectedResourcesChange={setSelectedResources}
        onSend={handleSend}
        images={images}
        readOnly={isPreparingImages}
        onImageRemove={imageId => {
          if (submittingRef.current) return;
          setImages(current => {
            const removed = current.find(image => image.id === imageId);
            if (removed) URL.revokeObjectURL(removed.url);
            return current.filter(image => image.id !== imageId);
          });
        }}
        disabled={disabled}
      />
      <div className="flex items-center justify-between">
        <fieldset
          disabled={isPreparingImages}
          className="flex min-w-0 items-center gap-2"
        >
          <ChatTool
            thinkingSelectorEnabled={Boolean(selection)}
            tools={composerTools}
            renderResourcePicker={renderResourcePicker ?? defaultResourcePicker}
            onBeforeOpen={() => inputRef.current?.rememberSelection()}
            onToolToggle={tool => inputRef.current?.toggleTool(tool)}
            onResourceSelect={resource =>
              inputRef.current?.insertResource(resource)
            }
            onImageSelect={handleImageSelect}
            imageUploadDisabled={imageUploadDisabled || isSubmitting}
            imageUploadDisabledReason={imageUploadDisabledReason}
          />
          <ApprovalModeSelect
            approvalMode={approvalMode}
            setApprovalMode={setSelectedApprovalMode}
          />
        </fieldset>
        <div className="flex items-center gap-2">
          {contextCompactCapacity && (
            <ContextCapacityIndicator capacity={contextCompactCapacity} />
          )}
          {thinkingConfig && selection && (
            <ThinkingLevelSelector
              group={thinkingGroup}
              onGroupChange={changeGroup}
              config={thinkingConfig}
              value={selection}
              onChange={changeLevel}
              disabled={isPreparingImages}
            />
          )}
          <ChatAction
            onSend={handleSend}
            onStop={onStop}
            disabled={disabled}
            disabledReason={
              hasUnsupportedImages
                ? (imageUploadDisabledReason ??
                  t('chat.image.agent_1_1_unsupported'))
                : undefined
            }
            loading={loading}
            waitingForAssistantDelta={waitingForAssistantDelta}
            mode={mode}
            setMode={setMode}
          />
        </div>
      </div>
    </div>
  );
}

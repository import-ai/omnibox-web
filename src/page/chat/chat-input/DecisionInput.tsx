import { Check, ChevronLeft, ChevronRight, Circle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Button as BaseButton } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { ScrollArea, ScrollBar } from '@/components/ui/ScrollArea';
import { processArgs } from '@/lib/toolArgs';
import { cn } from '@/lib/utils.ts';
import {
  ChatMode,
  DecisionType,
  SendMessageParams,
} from '@/page/chat/chat-input/types';
import { ToolCallArgs } from '@/page/chat/components/ToolCallArgs';
import { Interrupt } from '@/page/chat/core/types/conversation';

interface IDecisionInputProps {
  interrupts: Interrupt[];
  loading?: boolean;
  sendMessage: ({
    query,
    tools,
    selectedResources,
    mode,
    decisions,
  }: SendMessageParams) => void;
}

type SelectedDecisions = Partial<Record<number, DecisionType>>;

// Get icon for decision type
function getDecisionIcon(decisionType: string) {
  const lowerType = decisionType.toLowerCase();
  if (lowerType === 'approve' || lowerType === 'accept') {
    return <Check className="size-4 mr-2" />;
  }
  if (lowerType === 'reject' || lowerType === 'decline') {
    return <X className="size-4 mr-2" />;
  }
  return <Circle className="size-4 mr-2" />;
}

// Get decision style classes based on type and selection state
function getDecisionStyle(
  decisionType: string,
  isSelected: boolean,
  isActive: boolean
): string {
  const decision = decisionType.toLowerCase();
  let borderStyle;

  if (!isActive) {
    if (decision === 'approve') {
      borderStyle = 'border-green-50 dark:!border-green-900/50';
    } else {
      borderStyle = 'border-red-50 dark:!border-red-900/50';
    }
  } else {
    borderStyle = 'dark:!border-neutral-500';
  }

  let bgStyle: string;

  if (isSelected) {
    if (decision === 'approve') {
      bgStyle =
        'bg-green-100 dark:bg-green-800/25 hover:bg-green-100 dark:hover:bg-green-800/25';
    } else {
      bgStyle =
        'bg-red-100 dark:bg-red-800/25 hover:bg-red-100 dark:hover:bg-red-800/25';
    }
  } else {
    if (decision === 'approve') {
      bgStyle =
        'bg-green-50 dark:bg-green-950/25 hover:bg-green-50 dark:hover:bg-green-950/25';
    } else {
      bgStyle =
        'bg-red-50 dark:bg-red-950/25 hover:bg-red-50 dark:hover:bg-red-950/25';
    }
  }

  let textHover;

  if (decision === 'approve') {
    textHover = 'hover:text-green-700 dark:hover:text-green-300';
  } else {
    textHover = 'hover:text-red-700 dark:hover:text-red-300';
  }

  let textStyle;

  if (decision === 'approve') {
    textStyle = 'text-green-700 dark:text-green-300';
  } else {
    textStyle = 'text-red-700 dark:text-red-300';
  }
  return cn(
    'focus-visible:ring-0 shadow-none',
    bgStyle,
    borderStyle,
    textStyle,
    textHover
  );
}

export default function DecisionInput(props: IDecisionInputProps) {
  const { interrupts, loading = false, sendMessage } = props;
  const { t } = useTranslation();
  const submittedRef = useRef(false);

  const onSubmit = (decisions: { type: DecisionType }[]) => {
    sendMessage({
      query: '',
      tools: [],
      selectedResources: [],
      mode: ChatMode.ASK,
      decisions,
    });
  };

  if (interrupts.length === 0) {
    return null;
  }

  // Track selected decisions: index -> decision type
  const [selectedDecisions, setSelectedDecisions] = useState<SelectedDecisions>(
    {}
  );

  // Current active card index
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Current highlighted option index within the active card
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);

  // Ref for scroll area to auto-scroll active dot into view
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const submitSelectedDecisions = (
    nextSelectedDecisions: SelectedDecisions
  ) => {
    if (loading || submittedRef.current) {
      return;
    }

    const decisions = interrupts.reduce<{ type: DecisionType }[]>(
      (result, _, idx) => {
        const type = nextSelectedDecisions[idx];
        if (type) {
          result.push({ type });
        }
        return result;
      },
      []
    );

    if (decisions.length !== interrupts.length) {
      return;
    }

    submittedRef.current = true;
    onSubmit(decisions);
  };

  // Handle individual decision selection
  const handleSelectDecision = (
    cardIndex: number,
    decisionType: DecisionType
  ) => {
    if (loading) {
      return;
    }

    const nextSelectedDecisions = {
      ...selectedDecisions,
      [cardIndex]: decisionType,
    };

    setSelectedDecisions(nextSelectedDecisions);
    // Auto-advance to next card (but user can manually go back)
    if (cardIndex >= 0 && cardIndex < interrupts.length - 1) {
      setActiveCardIndex(cardIndex + 1);
    }
    submitSelectedDecisions(nextSelectedDecisions);
  };

  // Current active interrupt
  const activeInterrupt = interrupts[activeCardIndex];
  const activeSelectedDecision = selectedDecisions[activeCardIndex];

  // Sync activeOptionIndex when card changes
  useEffect(() => {
    if (activeSelectedDecision) {
      const selectedIdx = activeInterrupt.decisions.indexOf(
        activeSelectedDecision
      );
      setActiveOptionIndex(selectedIdx >= 0 ? selectedIdx : 0);
    } else {
      setActiveOptionIndex(0);
    }
  }, [activeCardIndex, activeInterrupt.decisions, activeSelectedDecision]);

  // Keyboard navigation — global listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) {
        return;
      }

      const currentOptions = activeInterrupt.decisions;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setActiveCardIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setActiveCardIndex(prev => Math.min(interrupts.length - 1, prev + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveOptionIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveOptionIndex(prev =>
            Math.min(currentOptions.length - 1, prev + 1)
          );
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          if (currentOptions[activeOptionIndex]) {
            handleSelectDecision(
              activeCardIndex,
              currentOptions[activeOptionIndex] as DecisionType
            );
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeCardIndex,
    activeOptionIndex,
    activeInterrupt,
    interrupts.length,
    loading,
    selectedDecisions,
  ]);

  useEffect(() => {
    submittedRef.current = false;
  }, [interrupts]);

  useEffect(() => {
    if (!loading) {
      submittedRef.current = false;
    }
  }, [loading]);

  const canGoLeft = activeCardIndex > 0;
  const canGoRight = activeCardIndex < interrupts.length - 1;

  // Auto-scroll indicator into view when active card changes
  useEffect(() => {
    const container = scrollAreaRef.current;
    if (!container) return;

    const activeDot = container.querySelector(
      `[data-dot-index="${activeCardIndex}"]`
    ) as HTMLElement | null;
    if (activeDot) {
      activeDot.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeCardIndex]);

  return (
    <Card className="max-w-[766px] w-full mx-auto rounded-2xl border border-solid border-gray-200 bg-white dark:bg-[#303030] dark:border-[#303030] shadow-none">
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2">
          <div className="text-base">
            {t(
              `chat.messages.tool_calls.function_name.${activeInterrupt.name}`
            )}
          </div>
          {interrupts.length > 1 && (
            <div className="text-xs text-muted-foreground font-normal">
              {activeCardIndex + 1} / {interrupts.length}
            </div>
          )}
        </CardTitle>
        <CardDescription className="text-xs flex flex-wrap gap-x-2 gap-y-1">
          <ToolCallArgs args={processArgs(activeInterrupt.args, t)} />
        </CardDescription>
      </CardHeader>

      <CardContent
        className={cn(
          'space-y-2 px-3 pt-0',
          interrupts.length > 1 ? 'pb-0' : 'pb-3'
        )}
      >
        {activeInterrupt.decisions.map((decisionType, idx) => {
          const isSelected =
            selectedDecisions[activeCardIndex] === decisionType;
          const isActive = idx === activeOptionIndex;

          return (
            <BaseButton
              key={decisionType}
              variant="outline"
              size="sm"
              className={cn(
                'w-full justify-start text-sm font-normal',
                getDecisionStyle(decisionType, isSelected, isActive)
              )}
              onClick={() =>
                handleSelectDecision(
                  activeCardIndex,
                  decisionType as DecisionType
                )
              }
              onMouseEnter={() => setActiveOptionIndex(idx)}
              disabled={loading}
            >
              {getDecisionIcon(decisionType)}
              <span>{t(`chat.decision.${decisionType.toLowerCase()}`)}</span>
            </BaseButton>
          );
        })}
      </CardContent>

      {interrupts.length > 1 && (
        <CardFooter className="flex gap-3 p-3 items-center justify-end">
          <div className="w-full flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => setActiveCardIndex(prev => Math.max(0, prev - 1))}
              disabled={loading || !canGoLeft}
            >
              <ChevronLeft className="size-4" />
            </Button>

            <ScrollArea className="flex-1" ref={scrollAreaRef}>
              <div className="flex items-center justify-center gap-1.5 py-1">
                {interrupts.map((_, idx) => {
                  const isCurrent = idx === activeCardIndex;
                  const selectedType = selectedDecisions[idx];
                  const lowerType = selectedType?.toLowerCase() ?? '';
                  const isApprove =
                    lowerType === 'approve' || lowerType === 'accept';
                  const isReject =
                    lowerType === 'reject' || lowerType === 'decline';

                  const dotColor = isCurrent
                    ? isApprove
                      ? 'bg-green-500'
                      : isReject
                        ? 'bg-red-500'
                        : 'bg-primary'
                    : isApprove
                      ? 'bg-green-400'
                      : isReject
                        ? 'bg-red-400'
                        : 'bg-muted-foreground/30';

                  return (
                    <button
                      key={idx}
                      data-dot-index={idx}
                      className={cn(
                        'shrink-0 rounded-full transition-all duration-200',
                        isCurrent ? 'w-5 h-2' : 'w-2 h-2',
                        dotColor
                      )}
                      onClick={() => {
                        if (!loading) {
                          setActiveCardIndex(idx);
                        }
                      }}
                      disabled={loading}
                      aria-label={`Go to decision ${idx + 1}`}
                    />
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="invisible" />
            </ScrollArea>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() =>
                setActiveCardIndex(prev =>
                  Math.min(interrupts.length - 1, prev + 1)
                )
              }
              disabled={loading || !canGoRight}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

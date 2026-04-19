import { Check, ChevronLeft, ChevronRight, Circle, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Button as BaseButton } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { processArgs } from '@/lib/tool-args';
import { cn } from '@/lib/utils.ts';
import { DecisionType } from '@/page/chat/chat-input/types';
import { Interrupt } from '@/page/chat/core/types/conversation.ts';

interface IDecisionInputProps {
  interrupts: Interrupt[];
  onDecision: (decisions: { type: DecisionType }[]) => void;
  disabled?: boolean;
}

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
  let borderStyle = '';

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
        'bg-green-100 dark:bg-green-900/50 hover:bg-green-100 dark:hover:bg-green-900/50';
    } else {
      bgStyle =
        'bg-red-100 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/50';
    }
  } else {
    if (decision === 'approve') {
      bgStyle =
        'bg-green-50 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/50';
    } else {
      bgStyle =
        'bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50';
    }
  }

  let textStyle = '';

  if (decision === 'approve') {
    textStyle =
      'text-green-700 dark:text-green-300 hover:text-green-700 dark:hover:text-green-300';
  } else {
    textStyle =
      'text-red-700 dark:text-red-300 hover:text-red-700 dark:hover:text-red-300';
  }
  return cn('focus-visible:ring-0', bgStyle, borderStyle, textStyle);
}

export default function DecisionInput(props: IDecisionInputProps) {
  const { interrupts, onDecision, disabled } = props;
  const { t } = useTranslation();

  if (interrupts.length === 0) {
    return null;
  }

  // Track selected decisions: index -> decision type
  const [selectedDecisions, setSelectedDecisions] = useState<
    Record<number, DecisionType>
  >({});

  // Current active card index
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Current highlighted option index within the active card
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);

  // Ref for scroll area to auto-scroll active dot into view
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Check if all interrupts have been decided
  const allDecided = useMemo(() => {
    return interrupts.every((_, idx) => selectedDecisions[idx] !== undefined);
  }, [interrupts, selectedDecisions]);

  // Handle individual decision selection
  const handleSelectDecision = (
    cardIndex: number,
    decisionType: DecisionType
  ) => {
    setSelectedDecisions(prev => ({
      ...prev,
      [cardIndex]: decisionType,
    }));
    // Auto-advance to next card (but user can manually go back)
    if (cardIndex >= 0 && cardIndex < interrupts.length - 1) {
      setActiveCardIndex(cardIndex + 1);
    }
  };

  // Handle submit all decisions
  const handleSubmit = () => {
    const decisions = interrupts.map((_, idx) => ({
      type: selectedDecisions[idx],
    }));
    onDecision(decisions);
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
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
    disabled,
    activeCardIndex,
    activeOptionIndex,
    activeInterrupt,
    interrupts.length,
  ]);

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
    <div className="py-3">
      {/* Card */}
      <Card className="border-none">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="text-base font-normal">
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
            {processArgs(activeInterrupt.args, t).map((arg, i) => (
              <code
                key={i}
                className="bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded text-xs font-mono"
              >
                {arg}
              </code>
            ))}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 pb-3">
          {activeInterrupt.decisions.map((decisionType, idx) => {
            const isSelected =
              selectedDecisions[activeCardIndex] === decisionType;
            const isActive = idx === activeOptionIndex;

            return (
              <BaseButton
                key={decisionType}
                variant="outline"
                className={cn(
                  'w-full justify-start text-sm font-normal',
                  getDecisionStyle(decisionType, isSelected, isActive)
                )}
                onClick={() =>
                  !disabled &&
                  handleSelectDecision(
                    activeCardIndex,
                    decisionType as DecisionType
                  )
                }
                disabled={disabled}
                onMouseEnter={() => !disabled && setActiveOptionIndex(idx)}
              >
                {getDecisionIcon(decisionType)}
                <span>{t(`chat.decision.${decisionType.toLowerCase()}`)}</span>
                {/*{isSelected && (*/}
                {/*  <Check className="size-4 ml-auto text-green-500" />*/}
                {/*)}*/}
              </BaseButton>
            );
          })}
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-0 items-end">
          {/* Submit button — always visible, disabled until all decided */}
          <Button onClick={handleSubmit} disabled={!allDecided || disabled}>
            {t('chat.decision.submit')}
          </Button>

          {/* Indicators — scrollable when many */}
          {interrupts.length > 1 && (
            <div className="w-full flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() =>
                  setActiveCardIndex(prev => Math.max(0, prev - 1))
                }
                disabled={!canGoLeft || disabled}
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
                        onClick={() => !disabled && setActiveCardIndex(idx)}
                        disabled={disabled}
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
                className="size-7 shrink-0"
                onClick={() =>
                  setActiveCardIndex(prev =>
                    Math.min(interrupts.length - 1, prev + 1)
                  )
                }
                disabled={!canGoRight || disabled}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

import { Check, ChevronLeft, ChevronRight, Circle, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
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

export interface PendingInterrupt {
  name: string;
  args: Record<string, any>;
  decisions: DecisionType[];
  index: number;
}

import { DecisionType } from '@/page/chat/conversation/types';

interface IDecisionInputProps {
  interrupts: PendingInterrupt[];
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
function getDecisionStyle(decisionType: string, isSelected: boolean): string {
  const lowerType = decisionType.toLowerCase();

  if (lowerType === 'approve' || lowerType === 'accept') {
    return isSelected
      ? 'bg-green-50 border-green-400 text-green-700 dark:bg-green-950/50 dark:border-green-600 dark:text-green-300'
      : 'border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950 dark:hover:text-green-300';
  }

  if (lowerType === 'reject' || lowerType === 'decline') {
    return isSelected
      ? 'bg-red-50 border-red-400 text-red-700 dark:bg-red-950/50 dark:border-red-600 dark:text-red-300'
      : 'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300';
  }

  return isSelected
    ? 'bg-gray-50 border-gray-400 text-gray-700 dark:bg-gray-800 dark:border-gray-500 dark:text-gray-300'
    : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-950 dark:hover:text-gray-300';
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
    return interrupts.every(
      interrupt => selectedDecisions[interrupt.index] !== undefined
    );
  }, [interrupts, selectedDecisions]);

  // Handle individual decision selection
  const handleSelectDecision = (index: number, decisionType: DecisionType) => {
    setSelectedDecisions(prev => ({
      ...prev,
      [index]: decisionType,
    }));
    // Auto-advance to next card (but user can manually go back)
    const currentCardIdx = interrupts.findIndex(i => i.index === index);
    if (currentCardIdx >= 0 && currentCardIdx < interrupts.length - 1) {
      setActiveCardIndex(currentCardIdx + 1);
    }
  };

  // Handle submit all decisions
  const handleSubmit = () => {
    const decisions = interrupts.map(interrupt => ({
      type: selectedDecisions[interrupt.index],
    }));
    onDecision(decisions);
  };

  // Current active interrupt
  const activeInterrupt = interrupts[activeCardIndex];
  const activeSelectedDecision = selectedDecisions[activeInterrupt.index];

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
          e.preventDefault();
          if (currentOptions[activeOptionIndex]) {
            handleSelectDecision(
              activeInterrupt.index,
              currentOptions[activeOptionIndex]
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {t(
              `chat.messages.tool_calls.function_name.${activeInterrupt.name}`
            )}
          </CardTitle>
          <CardDescription className="text-xs flex flex-wrap gap-x-2 gap-y-1">
            {processArgs(activeInterrupt.args, {
              private: t('chat.messages.tool_calls.function_args.private'),
              teamspace: t('chat.messages.tool_calls.function_args.teamspace'),
            }).map(arg => (
              <code className="bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded text-xs font-mono">
                {arg}
              </code>
            ))}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-2 pb-3">
          {activeInterrupt.decisions.map((decisionType, idx) => {
            const isSelected =
              selectedDecisions[activeInterrupt.index] === decisionType;
            const isActive = idx === activeOptionIndex;

            return (
              <Button
                key={decisionType}
                variant="outline"
                className={`
                  w-full justify-start text-sm font-medium
                  ${getDecisionStyle(decisionType, isSelected)}
                  ${isActive && !isSelected ? 'ring-2 ring-ring ring-offset-2 dark:ring-offset-gray-900' : ''}
                `}
                onClick={() =>
                  !disabled &&
                  handleSelectDecision(activeInterrupt.index, decisionType)
                }
                disabled={disabled}
                onMouseEnter={() => !disabled && setActiveOptionIndex(idx)}
              >
                {getDecisionIcon(decisionType)}
                <span>
                  {decisionType.toLowerCase() === 'approve'
                    ? t('chat.decision.approve')
                    : decisionType.toLowerCase() === 'reject'
                      ? t('chat.decision.reject')
                      : decisionType}
                </span>
                {isSelected && (
                  <Check className="size-4 ml-auto text-green-500" />
                )}
              </Button>
            );
          })}
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-0">
          {/* Submit button — always visible, disabled until all decided */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!allDecided || disabled}
          >
            <Check className="size-4 mr-1" />
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
                  {interrupts.map((interrupt, idx) => {
                    const isCurrent = idx === activeCardIndex;
                    const selectedType = selectedDecisions[interrupt.index];
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
                        className={`
                          shrink-0 rounded-full transition-all duration-200
                          ${isCurrent ? 'w-5 h-2' : 'w-2 h-2'}
                          ${dotColor}
                        `}
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

          {/* Progress text */}
          {interrupts.length > 1 && (
            <div className="text-center text-xs text-muted-foreground">
              {activeCardIndex + 1} / {interrupts.length}
            </div>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

import { Check, Circle, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

export interface PendingInterrupt {
  name: string;
  args: Record<string, any>;
  decisions: string[];
  index: number;
}

interface IDecisionInputProps {
  interrupts: PendingInterrupt[];
  onDecision: (decisions: { index: number; type: string }[]) => void;
  disabled?: boolean;
}

// Get icon for decision type
function getDecisionIcon(decisionType: string) {
  const lowerType = decisionType.toLowerCase();
  if (lowerType === 'approve' || lowerType === 'accept') {
    return <Check className="size-4 mr-1" />;
  }
  if (lowerType === 'reject' || lowerType === 'decline') {
    return <X className="size-4 mr-1" />;
  }
  return <Circle className="size-4 mr-1" />;
}

// Get button styling based on decision type
function getDecisionClassName(decisionType: string): string {
  const lowerType = decisionType.toLowerCase();
  if (lowerType === 'approve' || lowerType === 'accept') {
    return 'border-green-300 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950 dark:hover:text-green-300';
  }
  if (lowerType === 'reject' || lowerType === 'decline') {
    return 'border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300';
  }
  return 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-950 dark:hover:text-gray-300';
}

export default function DecisionInput(props: IDecisionInputProps) {
  const { interrupts, onDecision, disabled } = props;
  const { t } = useTranslation();

  // Track selected decisions: index -> decision type
  const [selectedDecisions, setSelectedDecisions] = useState<
    Record<number, string>
  >({});

  // Check if all interrupts have been decided
  const allDecided = useMemo(() => {
    return interrupts.every(
      interrupt => selectedDecisions[interrupt.index] !== undefined
    );
  }, [interrupts, selectedDecisions]);

  // Handle individual decision selection
  const handleSelectDecision = (index: number, decisionType: string) => {
    setSelectedDecisions(prev => ({
      ...prev,
      [index]: decisionType,
    }));
  };

  // Handle submit all decisions
  const handleSubmit = () => {
    const decisions = interrupts.map(interrupt => ({
      index: interrupt.index,
      type: selectedDecisions[interrupt.index],
    }));
    onDecision(decisions);
  };

  // Format args for display
  const formatArgs = (args: Record<string, any>) => {
    return Object.entries(args)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
  };

  return (
    <div className="py-3 space-y-4">
      {interrupts.map(interrupt => {
        const selectedDecision = selectedDecisions[interrupt.index];
        const isDecided = selectedDecision !== undefined;

        return (
          <div
            key={interrupt.index}
            className={`p-3 rounded-lg border ${
              isDecided
                ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                : 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20'
            }`}
          >
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <span className="font-medium">{interrupt.name}</span>
              <span className="text-gray-400 dark:text-gray-500 mx-1">
                ({formatArgs(interrupt.args)})
              </span>
            </div>

            {isDecided ? (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Check className="size-4 mr-1 text-green-500" />
                {t('chat.decision.selected')}: {selectedDecision}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {interrupt.decisions.map(decisionType => (
                  <Button
                    key={decisionType}
                    size="sm"
                    variant="outline"
                    className={`${getDecisionClassName(decisionType)}`}
                    onClick={() =>
                      handleSelectDecision(interrupt.index, decisionType)
                    }
                    disabled={disabled}
                  >
                    {getDecisionIcon(decisionType)}
                    {decisionType}
                  </Button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {allDecided && (
        <Button
          className="w-full mt-4"
          onClick={handleSubmit}
          disabled={disabled}
        >
          <Check className="size-4 mr-1" />
          {t('chat.decision.submit')}
        </Button>
      )}
    </div>
  );
}

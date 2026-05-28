import { useEffect, useRef, useState } from 'react';

import {
  SmartFolderCondition,
  SmartFolderField,
  SmartFolderOperator,
} from './index';
import {
  createDefaultCondition,
  getDefaultOperator,
  getInitialConditionForField,
  normalizeConditionValue,
  shouldShowValueInput,
} from './smartFolderUtils';

export function useSmartFolderConditions(maxConditionCount: number) {
  const conditionListRef = useRef<HTMLDivElement>(null);
  const shouldScrollToLatestConditionRef = useRef(false);
  const [conditions, setConditions] = useState<SmartFolderCondition[]>([
    createDefaultCondition(),
  ]);
  const [conditionErrors, setConditionErrors] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    if (!shouldScrollToLatestConditionRef.current) {
      return;
    }

    shouldScrollToLatestConditionRef.current = false;
    conditionListRef.current?.scrollTo({
      top: conditionListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [conditions.length]);

  const resetConditionScroll = () => {
    shouldScrollToLatestConditionRef.current = false;
  };

  const addCondition = (afterIndex?: number) => {
    if (conditions.length >= maxConditionCount) {
      return;
    }

    shouldScrollToLatestConditionRef.current = true;
    setConditions(prev => {
      const next = [...prev];
      next.splice((afterIndex ?? prev.length - 1) + 1, 0, {});
      return next;
    });
  };

  const removeCondition = (index: number) => {
    if (conditions.length <= 1) {
      return;
    }

    setConditions(prev =>
      prev.filter((_, currentIndex) => currentIndex !== index)
    );
    setConditionErrors(prev => {
      const nextErrors: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const currentIndex = Number(key);
        if (currentIndex < index) {
          nextErrors[currentIndex] = value;
        }
        if (currentIndex > index) {
          nextErrors[currentIndex - 1] = value;
        }
      });
      return nextErrors;
    });
  };

  const updateCondition = (
    index: number,
    patch: Partial<SmartFolderCondition>
  ) => {
    setConditions(prev =>
      prev.map((condition, currentIndex) =>
        currentIndex === index ? { ...condition, ...patch } : condition
      )
    );
    setConditionErrors(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleFieldChange = (index: number, field: SmartFolderField) => {
    updateCondition(index, getInitialConditionForField(field));
  };

  const handleOperatorChange = (
    index: number,
    operator: SmartFolderOperator
  ) => {
    const currentCondition = conditions[index];
    updateCondition(index, {
      operator,
      value: normalizeConditionValue(
        currentCondition.field,
        operator,
        shouldShowValueInput(operator) ? currentCondition.value : undefined
      ),
    });
  };

  const handleValueChange = (
    index: number,
    value: SmartFolderCondition['value']
  ) => {
    const currentCondition = conditions[index];
    updateCondition(index, {
      value: normalizeConditionValue(
        currentCondition.field,
        currentCondition.operator || getDefaultOperator(currentCondition.field),
        value
      ),
    });
  };

  return {
    conditionListRef,
    conditions,
    setConditions,
    conditionErrors,
    setConditionErrors,
    resetConditionScroll,
    addCondition,
    removeCondition,
    handleFieldChange,
    handleOperatorChange,
    handleValueChange,
  };
}

import { useEffect, useRef, useState } from 'react';

import {
  ResourceCondition,
  ResourceConditionField,
  ResourceConditionOperator,
} from './index';
import {
  createDefaultCondition,
  getDefaultResourceConditionOperator,
  getInitialResourceConditionForField,
  normalizeResourceConditionValue,
  shouldShowResourceConditionValueInput,
} from './resourceConditionUtils';

export function useResourceConditions(maxConditionCount: number) {
  const conditionListRef = useRef<HTMLDivElement>(null);
  const shouldScrollToLatestConditionRef = useRef(false);
  const [conditions, setConditions] = useState<ResourceCondition[]>([
    createDefaultCondition(),
  ]);
  const [conditionErrors, setConditionErrors] = useState<
    Record<number, string>
  >({});

  const scrollToLatestCondition = () => {
    conditionListRef.current?.scrollTo({
      top: conditionListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const isConditionListScrolledToBottom = () => {
    const list = conditionListRef.current;
    if (!list) {
      return false;
    }

    return list.scrollHeight - list.scrollTop - list.clientHeight <= 8;
  };

  const scrollToLatestConditionAfterNextUpdate = () => {
    shouldScrollToLatestConditionRef.current = true;
  };

  const keepLatestConditionVisibleAfterUpdate = (index: number) => {
    if (index === conditions.length - 1 && isConditionListScrolledToBottom()) {
      scrollToLatestConditionAfterNextUpdate();
    }
  };

  useEffect(() => {
    if (!shouldScrollToLatestConditionRef.current) {
      return;
    }

    shouldScrollToLatestConditionRef.current = false;
    window.requestAnimationFrame(scrollToLatestCondition);
  }, [conditions]);

  const resetConditionScroll = () => {
    shouldScrollToLatestConditionRef.current = false;
  };

  const addCondition = (afterIndex?: number) => {
    if (conditions.length >= maxConditionCount) {
      return;
    }

    scrollToLatestConditionAfterNextUpdate();
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
    patch: Partial<ResourceCondition>
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

  const handleFieldChange = (index: number, field: ResourceConditionField) => {
    keepLatestConditionVisibleAfterUpdate(index);
    updateCondition(index, getInitialResourceConditionForField(field));
  };

  const handleOperatorChange = (
    index: number,
    operator: ResourceConditionOperator
  ) => {
    keepLatestConditionVisibleAfterUpdate(index);
    const currentCondition = conditions[index];
    updateCondition(index, {
      operator,
      value: normalizeResourceConditionValue(
        currentCondition.field,
        operator,
        shouldShowResourceConditionValueInput(operator)
          ? currentCondition.value
          : undefined
      ),
    });
  };

  const handleValueChange = (
    index: number,
    value: ResourceCondition['value']
  ) => {
    const currentCondition = conditions[index];
    updateCondition(index, {
      value: normalizeResourceConditionValue(
        currentCondition.field,
        currentCondition.operator ||
          getDefaultResourceConditionOperator(currentCondition.field),
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

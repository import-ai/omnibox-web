import { useCallback, useEffect, useRef, useState } from 'react';

import { getSearchFieldDebounceDelay } from './searchFieldUtils';

interface UseSearchFieldValueOptions {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
}

export function useSearchFieldValue({
  value,
  onValueChange,
  debounceMs = 0,
}: UseSearchFieldValueOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draftValue, setDraftValue] = useState(value);
  const resolvedDebounceMs = getSearchFieldDebounceDelay(debounceMs);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const commitValue = useCallback(
    (nextValue: string, immediate = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (immediate || resolvedDebounceMs <= 0) {
        onValueChange(nextValue);
        return;
      }

      timerRef.current = setTimeout(() => {
        onValueChange(nextValue);
        timerRef.current = null;
      }, resolvedDebounceMs);
    },
    [onValueChange, resolvedDebounceMs]
  );

  const updateDraftValue = useCallback(
    (nextValue: string) => {
      setDraftValue(nextValue);
      commitValue(nextValue);
    },
    [commitValue]
  );

  const clearValue = useCallback(() => {
    setDraftValue('');
    commitValue('', true);
  }, [commitValue]);

  return {
    draftValue,
    updateDraftValue,
    clearValue,
  };
}

import { DateRange } from 'react-day-picker';

export type RangeSelectionStep = 'start' | 'end';

export interface SmartFolderRangeSelectionState {
  range?: DateRange;
  nextStep: RangeSelectionStep;
}

function sortRange(from: Date, to: Date): DateRange {
  return from.getTime() <= to.getTime() ? { from, to } : { from: to, to: from };
}

export function getNextRangeSelectionState(
  currentState: SmartFolderRangeSelectionState,
  selectedDate: Date
): SmartFolderRangeSelectionState {
  if (currentState.nextStep === 'start') {
    return {
      range: { from: selectedDate, to: selectedDate },
      nextStep: 'end',
    };
  }

  const from = currentState.range?.from ?? selectedDate;

  return {
    range: sortRange(from, selectedDate),
    nextStep: 'start',
  };
}

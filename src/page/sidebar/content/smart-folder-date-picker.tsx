import { format } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DateRange, DayButton, getDefaultClassNames } from 'react-day-picker';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import {
  getNextRangeSelectionState,
  type SmartFolderRangeSelectionState,
} from './smart-folder-date-picker-utils';
import { smartFolderSelectTriggerClass } from './styles';

interface SmartFolderDatePickerProps {
  className?: string;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

interface SmartFolderDateRangePickerProps {
  className?: string;
  disabled?: boolean;
  startDate: string;
  endDate: string;
  onChange: (value: { startDate: string; endDate: string }) => void;
}

function parseDate(value: string) {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function formatDate(value: string) {
  if (!value) {
    return '';
  }

  return value;
}

function parseOptionalDate(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

function toStorageDate(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function normalizeRangeDates(from: Date, to: Date) {
  if (from.getTime() <= to.getTime()) {
    return { from, to };
  }

  return {
    from: to,
    to: from,
  };
}

function isSameDateRange(first?: DateRange, second?: DateRange) {
  return (
    first?.from?.getTime() === second?.from?.getTime() &&
    first?.to?.getTime() === second?.to?.getTime()
  );
}

function getRangeMiddle(range?: DateRange) {
  if (!range?.from || !range.to) {
    return undefined;
  }

  if (range.from.getTime() === range.to.getTime()) {
    return undefined;
  }

  return {
    after: range.from,
    before: range.to,
  };
}

function getDisplayText(range?: DateRange, language?: string) {
  if (!range?.from) {
    return '';
  }

  const locale = language?.startsWith('zh') ? zhCN : enUS;
  const displayFormat = language?.startsWith('zh')
    ? 'yyyy年MM月dd日'
    : 'LLL dd, y';

  if (!range.to) {
    return format(range.from, displayFormat, { locale });
  }

  return `${format(range.from, displayFormat, { locale })} - ${format(range.to, displayFormat, { locale })}`;
}

function SmartFolderRangeDayButton({
  children,
  className,
  day,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        (modifiers.selected || modifiers.range_start) &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-[#f2f2f5] data-[range-middle=true]:text-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-1 rounded-md font-normal leading-none ring-0 outline-none focus:ring-0 focus:outline-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function SmartFolderDatePicker(props: SmartFolderDatePickerProps) {
  const { className, disabled, value, onChange } = props;
  const { i18n, t } = useTranslation();
  const selectedDate = useMemo(() => parseDate(value), [value]);
  const calendarLocale = i18n.language?.startsWith('zh') ? zhCN : enUS;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            smartFolderSelectTriggerClass,
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {formatDate(value) || t('smart_folder.create.pick_date')}
          </span>
          <CalendarIcon className="size-4 text-neutral-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden rounded-md p-0"
        align="start"
      >
        <Calendar
          mode="single"
          locale={calendarLocale}
          selected={selectedDate}
          onSelect={date => {
            if (!date) {
              return;
            }

            const nextMonth = `${date.getMonth() + 1}`.padStart(2, '0');
            const nextDay = `${date.getDate()}`.padStart(2, '0');
            onChange(`${date.getFullYear()}-${nextMonth}-${nextDay}`);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function SmartFolderDateRangePicker(
  props: SmartFolderDateRangePickerProps
) {
  const { className, disabled, startDate, endDate, onChange } = props;
  const { i18n, t } = useTranslation();
  const calendarLocale = i18n.language?.startsWith('zh') ? zhCN : enUS;
  const [selectionState, setSelectionState] =
    useState<SmartFolderRangeSelectionState>({ nextStep: 'start' });

  const dateRange = useMemo<DateRange | undefined>(() => {
    const from = parseOptionalDate(startDate);
    const to = parseOptionalDate(endDate);

    if (!from && !to) {
      return undefined;
    }

    return {
      from,
      to,
    };
  }, [endDate, startDate]);

  useEffect(() => {
    setSelectionState(prev => {
      if (isSameDateRange(prev.range, dateRange)) {
        return prev;
      }

      return { range: dateRange, nextStep: 'start' };
    });
  }, [dateRange]);

  const visibleRange = selectionState.range ?? dateRange;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!visibleRange?.from}
          className={cn(
            smartFolderSelectTriggerClass,
            'w-full min-w-0 justify-start text-left font-normal data-[empty=true]:text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="shrink-0" />
          <span className="min-w-0 truncate">
            {visibleRange?.from
              ? getDisplayText(visibleRange, i18n.language)
              : t('smart_folder.create.pick_date')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="single"
          defaultMonth={visibleRange?.from}
          selected={visibleRange?.from}
          numberOfMonths={2}
          locale={calendarLocale}
          modifiers={{
            today: undefined,
            range_start: visibleRange?.from,
            range_end: visibleRange?.to,
            range_middle: getRangeMiddle(visibleRange),
          }}
          components={{
            DayButton: SmartFolderRangeDayButton,
          }}
          onDayClick={date => {
            const nextState = getNextRangeSelectionState(selectionState, date);
            setSelectionState(nextState);

            if (
              nextState.nextStep !== 'start' ||
              !nextState.range?.from ||
              !nextState.range?.to
            ) {
              return;
            }

            const normalizedRange = normalizeRangeDates(
              nextState.range.from,
              nextState.range.to
            );

            onChange({
              startDate: toStorageDate(normalizedRange.from),
              endDate: toStorageDate(normalizedRange.to),
            });
          }}
          className="rounded-lg bg-white dark:bg-black"
        />
      </PopoverContent>
    </Popover>
  );
}

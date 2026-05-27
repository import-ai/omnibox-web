import { X } from 'lucide-react';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { DatePicker, DateRangePicker } from '@/components/date-picker';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { cn } from '@/lib/utils';

import {
  SmartFolderCondition,
  SmartFolderField,
  SmartFolderOperator,
  SmartFolderRelativeDateUnit,
} from './index';
import {
  getAvailableOperators,
  getFieldType,
  normalizeConditionValue,
  shouldShowValueInput,
  SMART_FOLDER_FIELD_OPTIONS,
  SMART_FOLDER_RELATIVE_DATE_UNITS,
} from './smartFolderUtils';
import { smartFolderInputClass, smartFolderSelectTriggerClass } from './styles';

interface SmartFolderConditionRowProps {
  condition: SmartFolderCondition;
  conditionError?: string;
  hideRemove: boolean;
  index: number;
  onFieldChange: (index: number, field: SmartFolderField) => void;
  onOperatorChange: (index: number, operator: SmartFolderOperator) => void;
  onRemove: (index: number) => void;
  onValueChange: (index: number, value: SmartFolderCondition['value']) => void;
}

export function SmartFolderConditionRow(props: SmartFolderConditionRowProps) {
  const {
    condition,
    conditionError,
    hideRemove,
    index,
    onFieldChange,
    onOperatorChange,
    onRemove,
    onValueChange,
  } = props;
  const { t } = useTranslation();
  const operators = getAvailableOperators(condition.field);
  const fieldType = getFieldType(condition.field);
  const normalizedValue = normalizeConditionValue(
    condition.field,
    condition.operator,
    condition.value
  );

  const handleRelativeDateAmountChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const nextValue = event.target.value.trim();

    if (
      normalizedValue?.kind === 'relative_date' &&
      condition.field &&
      condition.operator
    ) {
      onValueChange(index, {
        ...normalizedValue,
        amount: /^\d*$/.test(nextValue) ? nextValue : '',
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {t('smart_folder.create.condition_title', { index: index + 1 })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'text-muted-foreground hover:text-foreground size-4 rounded-none border-none bg-transparent p-0 shadow-none hover:bg-transparent',
            hideRemove && 'invisible'
          )}
          onClick={() => onRemove(index)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-28 flex-[0.72_1_120px]">
          <Select
            value={condition.field || ''}
            onValueChange={value =>
              onFieldChange(index, value as SmartFolderField)
            }
          >
            <SelectTrigger className={smartFolderSelectTriggerClass}>
              <SelectValue
                placeholder={t('smart_folder.create.select_field')}
              />
            </SelectTrigger>
            <SelectContent>
              {SMART_FOLDER_FIELD_OPTIONS.map(field => (
                <SelectItem value={field} key={field}>
                  {t(`smart_folder.fields.${field}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-28 flex-[0.66_1_112px]">
          {condition.field ? (
            <Select
              value={condition.operator || ''}
              onValueChange={value =>
                onOperatorChange(index, value as SmartFolderOperator)
              }
            >
              <SelectTrigger className={smartFolderSelectTriggerClass}>
                <SelectValue
                  placeholder={t('smart_folder.create.select_operator')}
                />
              </SelectTrigger>
              <SelectContent>
                {operators.map(operator => (
                  <SelectItem value={operator} key={operator}>
                    {t(`smart_folder.operators.${operator}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div />
          )}
        </div>

        <div className="min-w-64 flex-[2_1_260px]">
          {condition.field && condition.operator ? (
            shouldShowValueInput(condition.operator) ? (
              fieldType === 'text' && normalizedValue?.kind === 'text' ? (
                <Input
                  value={normalizedValue.text}
                  autoComplete="off"
                  onChange={event =>
                    onValueChange(index, {
                      ...normalizedValue,
                      text: event.target.value,
                    })
                  }
                  placeholder={t('smart_folder.create.value_placeholder')}
                  className={cn(
                    smartFolderInputClass,
                    'focus-visible:ring-0 focus-visible:ring-transparent'
                  )}
                />
              ) : normalizedValue?.kind === 'relative_date' ? (
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_88px] gap-2 sm:grid-cols-[minmax(96px,1fr)_104px]">
                  <Input
                    value={normalizedValue.amount}
                    autoComplete="off"
                    onChange={handleRelativeDateAmountChange}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={t(
                      'smart_folder.create.relative_value_placeholder'
                    )}
                    className={cn(
                      smartFolderInputClass,
                      'focus-visible:ring-0 focus-visible:ring-transparent'
                    )}
                  />
                  <Select
                    value={normalizedValue.unit}
                    onValueChange={value =>
                      onValueChange(index, {
                        ...normalizedValue,
                        unit: value as SmartFolderRelativeDateUnit,
                      })
                    }
                  >
                    <SelectTrigger className={smartFolderSelectTriggerClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SMART_FOLDER_RELATIVE_DATE_UNITS.map(unit => (
                        <SelectItem value={unit} key={unit}>
                          {t(`smart_folder.units.${unit}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : normalizedValue?.kind === 'single_date' ? (
                <DatePicker
                  value={normalizedValue.date}
                  placeholder={t('smart_folder.create.pick_date')}
                  className={smartFolderSelectTriggerClass}
                  onChange={value =>
                    onValueChange(index, {
                      ...normalizedValue,
                      date: value,
                    })
                  }
                />
              ) : normalizedValue?.kind === 'date_range' ? (
                <DateRangePicker
                  startDate={normalizedValue.startDate}
                  endDate={normalizedValue.endDate}
                  placeholder={t('smart_folder.create.pick_date')}
                  displayFormat={t('smart_folder.date_format')}
                  className={smartFolderSelectTriggerClass}
                  onChange={value =>
                    onValueChange(index, {
                      ...normalizedValue,
                      ...value,
                    })
                  }
                />
              ) : (
                <div />
              )
            ) : (
              <></>
            )
          ) : (
            <div />
          )}
        </div>
      </div>

      {conditionError && (
        <p className="text-xs text-destructive">{conditionError}</p>
      )}
    </div>
  );
}

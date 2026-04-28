import { X } from 'lucide-react';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import {
  SmartFolderDatePicker,
  SmartFolderDateRangePicker,
} from './smart-folder-date-picker';
import {
  SmartFolderCondition,
  SmartFolderField,
  SmartFolderOperator,
  SmartFolderRelativeDateUnit,
} from './smart-folder-types';
import {
  getAvailableOperators,
  getFieldType,
  normalizeConditionValue,
  shouldShowValueInput,
  SMART_FOLDER_FIELD_OPTIONS,
  SMART_FOLDER_RELATIVE_DATE_UNITS,
} from './smart-folder-utils';
import {
  smartFolderConditionErrorClass,
  smartFolderConditionGridClass,
  smartFolderIconButtonClass,
  smartFolderInputClass,
  smartFolderSelectTriggerClass,
} from './styles';

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
    <div className="space-y-1.5">
      <div className={smartFolderConditionGridClass}>
        <Select
          value={condition.field || ''}
          onValueChange={value =>
            onFieldChange(index, value as SmartFolderField)
          }
        >
          <SelectTrigger className={smartFolderSelectTriggerClass}>
            <SelectValue placeholder={t('smart_folder.create.select_field')} />
          </SelectTrigger>
          <SelectContent>
            {SMART_FOLDER_FIELD_OPTIONS.map(field => (
              <SelectItem value={field} key={field}>
                {t(`smart_folder.fields.${field}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <div className="col-span-2 min-w-0 sm:col-span-1">
          {condition.field && condition.operator ? (
            shouldShowValueInput(condition.operator) ? (
              fieldType === 'text' && normalizedValue?.kind === 'text' ? (
                <Input
                  value={normalizedValue.text}
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
                <SmartFolderDatePicker
                  value={normalizedValue.date}
                  onChange={value =>
                    onValueChange(index, {
                      ...normalizedValue,
                      date: value,
                    })
                  }
                />
              ) : normalizedValue?.kind === 'date_range' ? (
                <SmartFolderDateRangePicker
                  startDate={normalizedValue.startDate}
                  endDate={normalizedValue.endDate}
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

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(smartFolderIconButtonClass, hideRemove && 'invisible')}
          onClick={() => onRemove(index)}
        >
          <X className="size-4" />
        </Button>
      </div>

      {conditionError && (
        <p className={smartFolderConditionErrorClass}>{conditionError}</p>
      )}
    </div>
  );
}

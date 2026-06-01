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
  ResourceCondition,
  ResourceConditionField,
  ResourceConditionOperator,
  ResourceConditionRelativeDateUnit,
} from './index';
import {
  getAvailableResourceConditionOperators,
  getResourceConditionFieldType,
  normalizeResourceConditionValue,
  RESOURCE_CONDITION_FIELD_OPTIONS,
  RESOURCE_CONDITION_RELATIVE_DATE_UNITS,
  shouldShowResourceConditionValueInput,
} from './resourceConditionUtils';
import {
  resourceConditionInputClass,
  resourceConditionSelectTriggerClass,
} from './styles';

interface ResourceConditionRowProps {
  condition: ResourceCondition;
  conditionError?: string;
  hideRemove: boolean;
  index: number;
  onFieldChange: (index: number, field: ResourceConditionField) => void;
  onOperatorChange: (
    index: number,
    operator: ResourceConditionOperator
  ) => void;
  onRemove: (index: number) => void;
  onValueChange: (index: number, value: ResourceCondition['value']) => void;
}

export function ResourceConditionRow(props: ResourceConditionRowProps) {
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
  const operators = getAvailableResourceConditionOperators(condition.field);
  const fieldType = getResourceConditionFieldType(condition.field);
  const normalizedValue = normalizeResourceConditionValue(
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
          {t('resource_conditions.condition_title', { index: index + 1 })}
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
              onFieldChange(index, value as ResourceConditionField)
            }
          >
            <SelectTrigger className={resourceConditionSelectTriggerClass}>
              <SelectValue
                placeholder={t('resource_conditions.select_field')}
              />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_CONDITION_FIELD_OPTIONS.map(field => (
                <SelectItem value={field} key={field}>
                  {t(`resource_conditions.fields.${field}`)}
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
                onOperatorChange(index, value as ResourceConditionOperator)
              }
            >
              <SelectTrigger className={resourceConditionSelectTriggerClass}>
                <SelectValue
                  placeholder={t('resource_conditions.select_operator')}
                />
              </SelectTrigger>
              <SelectContent>
                {operators.map(operator => (
                  <SelectItem value={operator} key={operator}>
                    {t(`resource_conditions.operators.${operator}`)}
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
            shouldShowResourceConditionValueInput(condition.operator) ? (
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
                  placeholder={t('resource_conditions.value_placeholder')}
                  className={cn(
                    resourceConditionInputClass,
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
                      'resource_conditions.relative_value_placeholder'
                    )}
                    className={cn(
                      resourceConditionInputClass,
                      'focus-visible:ring-0 focus-visible:ring-transparent'
                    )}
                  />
                  <Select
                    value={normalizedValue.unit}
                    onValueChange={value =>
                      onValueChange(index, {
                        ...normalizedValue,
                        unit: value as ResourceConditionRelativeDateUnit,
                      })
                    }
                  >
                    <SelectTrigger
                      className={resourceConditionSelectTriggerClass}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_CONDITION_RELATIVE_DATE_UNITS.map(unit => (
                        <SelectItem value={unit} key={unit}>
                          {t(`resource_conditions.units.${unit}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : normalizedValue?.kind === 'single_date' ? (
                <DatePicker
                  value={normalizedValue.date}
                  placeholder={t('resource_conditions.pick_date')}
                  className={resourceConditionSelectTriggerClass}
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
                  placeholder={t('resource_conditions.pick_date')}
                  displayFormat={t('resource_conditions.date_format')}
                  className={resourceConditionSelectTriggerClass}
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

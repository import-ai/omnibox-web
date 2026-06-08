import { Plus, X } from 'lucide-react';
import { ChangeEvent, Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { DatePicker, DateRangePicker } from '@/components/date-picker';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { UpgradeActionButton } from '@/components/upgrade-action-button';
import type { Namespace } from '@/interface';
import { cn } from '@/lib/utils';
import type {
  ResourceCondition,
  ResourceConditionField,
  ResourceConditionMatchMode,
  ResourceConditionOperator,
  ResourceConditionRelativeDateUnit,
} from '@/page/resource/conditions';
import {
  getAvailableResourceConditionOperators,
  getConditionLimitValue,
  getResourceConditionFieldType,
  normalizeResourceConditionValue,
  RESOURCE_CONDITION_FIELD_OPTIONS,
  RESOURCE_CONDITION_RELATIVE_DATE_UNITS,
  shouldShowResourceConditionValueInput,
} from '@/page/resource/conditions/resourceConditionUtils';

import {
  searchConditionListClassName,
  searchFilterPanelClassName,
} from './searchLayout';
import { getSearchConditionLimitMessageKey } from './searchUtils';

interface SearchFilterPanelProps {
  canAddCondition: boolean;
  conditionListRef?: React.RefObject<HTMLDivElement | null>;
  conditions: ResourceCondition[];
  currentNamespace?: Namespace;
  matchMode: ResourceConditionMatchMode;
  maxConditionCount: number;
  namespaceId?: string;
  onAddCondition: () => void;
  onFieldChange: (index: number, field: ResourceConditionField) => void;
  onMatchModeChange: (matchMode: ResourceConditionMatchMode) => void;
  onOperatorChange: (
    index: number,
    operator: ResourceConditionOperator
  ) => void;
  onRemoveCondition: (index: number) => void;
  onValueChange: (index: number, value: ResourceCondition['value']) => void;
  remainingConditionCount: number;
}

const compactControlClass =
  'h-8 rounded-md border-line bg-transparent px-3 text-sm shadow-none hover:bg-transparent focus:ring-0 focus:ring-transparent focus:outline-none dark:bg-transparent dark:hover:bg-transparent';
const compactSelectContentClass =
  'w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]';
const compactScrollbarClass =
  '[scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent';

function SearchFilterConditionRow({
  condition,
  hideRemove,
  index,
  onFieldChange,
  onOperatorChange,
  onRemoveCondition,
  onValueChange,
}: {
  condition: ResourceCondition;
  hideRemove: boolean;
  index: number;
  onFieldChange: (index: number, field: ResourceConditionField) => void;
  onOperatorChange: (
    index: number,
    operator: ResourceConditionOperator
  ) => void;
  onRemoveCondition: (index: number) => void;
  onValueChange: (index: number, value: ResourceCondition['value']) => void;
}) {
  const { t } = useTranslation();
  const fieldType = getResourceConditionFieldType(condition.field);
  const operators = getAvailableResourceConditionOperators(condition.field);
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
    <div className="space-y-2">
      <div className="flex h-5 items-center justify-between gap-2">
        <p className="text-sm font-medium leading-5 text-foreground">
          {t('resource_conditions.condition_title', { index: index + 1 })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'size-5 rounded-md border-none bg-transparent p-0 text-foreground shadow-none hover:bg-transparent',
            hideRemove && 'invisible'
          )}
          onClick={() => onRemoveCondition(index)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <Select
          value={condition.field || ''}
          onValueChange={value =>
            onFieldChange(index, value as ResourceConditionField)
          }
        >
          <SelectTrigger
            className={cn(
              compactControlClass,
              'data-[placeholder]:text-foreground'
            )}
          >
            <SelectValue placeholder={t('resource_conditions.select_field')} />
          </SelectTrigger>
          <SelectContent className={compactSelectContentClass}>
            {RESOURCE_CONDITION_FIELD_OPTIONS.map(field => (
              <SelectItem value={field} key={field}>
                {t(`resource_conditions.fields.${field}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {condition.field ? (
          <Select
            value={condition.operator || ''}
            onValueChange={value =>
              onOperatorChange(index, value as ResourceConditionOperator)
            }
          >
            <SelectTrigger className={compactControlClass}>
              <SelectValue
                placeholder={t('resource_conditions.select_operator')}
              />
            </SelectTrigger>
            <SelectContent className={compactSelectContentClass}>
              {operators.map(operator => (
                <SelectItem value={operator} key={operator}>
                  {t(`resource_conditions.operators.${operator}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {condition.field &&
      condition.operator &&
      shouldShowResourceConditionValueInput(condition.operator) ? (
        fieldType === 'text' && normalizedValue?.kind === 'text' ? (
          <Input
            value={normalizedValue.text}
            onChange={event =>
              onValueChange(index, {
                ...normalizedValue,
                text: event.target.value,
              })
            }
            placeholder={t('resource_conditions.value_placeholder')}
            className={cn(
              compactControlClass,
              'focus-visible:ring-0 focus-visible:ring-transparent'
            )}
          />
        ) : normalizedValue?.kind === 'relative_date' ? (
          <div className="grid grid-cols-[minmax(0,1fr)_72px] gap-2">
            <Input
              value={normalizedValue.amount}
              autoComplete="off"
              onChange={handleRelativeDateAmountChange}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={t('resource_conditions.relative_value_placeholder')}
              className={cn(
                compactControlClass,
                'px-2 text-center focus-visible:ring-0 focus-visible:ring-transparent'
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
              <SelectTrigger className={compactControlClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={compactSelectContentClass}>
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
            className={compactControlClass}
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
            className={compactControlClass}
            onChange={value =>
              onValueChange(index, {
                ...normalizedValue,
                ...value,
              })
            }
          />
        ) : null
      ) : null}
    </div>
  );
}

export function SearchFilterPanel({
  canAddCondition,
  conditionListRef,
  conditions,
  currentNamespace,
  matchMode,
  maxConditionCount,
  namespaceId,
  onAddCondition,
  onFieldChange,
  onMatchModeChange,
  onOperatorChange,
  onRemoveCondition,
  onValueChange,
  remainingConditionCount,
}: SearchFilterPanelProps) {
  const { t } = useTranslation();
  const showUpgradeButton =
    maxConditionCount <= getConditionLimitValue('basic');
  const showMatchModeSelect = conditions.length > 1;
  const addButtonTooltip = t(
    getSearchConditionLimitMessageKey(maxConditionCount)
  );

  return (
    <aside className={searchFilterPanelClassName}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-lg font-semibold leading-[1.4] text-foreground">
          {t('search.filters.title')}
        </h2>
        <div className="ml-auto flex items-center gap-2">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {t('search.filters.remaining_conditions', {
              remaining: remainingConditionCount,
              total: maxConditionCount,
            })}
          </span>
          {showUpgradeButton && (
            <UpgradeActionButton
              namespaceId={namespaceId}
              hasPermission={currentNamespace?.is_owner !== false}
              disabledReason={t('chat.trial.not_owner')}
            />
          )}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-sm font-medium leading-[1.4] text-foreground">
          {t('resource_conditions.conditions')}
        </p>
        {showMatchModeSelect && (
          <Select
            value={matchMode}
            onValueChange={value =>
              onMatchModeChange(value as ResourceConditionMatchMode)
            }
          >
            <SelectTrigger className={cn(compactControlClass, 'w-[103px]')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={compactSelectContentClass}>
              <SelectItem value="all">
                {t('smart_folder.match_mode.all')}
              </SelectItem>
              <SelectItem value="any">
                {t('smart_folder.match_mode.any')}
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div
        ref={conditionListRef}
        className={cn(searchConditionListClassName, compactScrollbarClass)}
      >
        {conditions.map((condition, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <div className="h-px bg-slate-100 dark:bg-neutral-800" />
            )}
            <SearchFilterConditionRow
              condition={condition}
              hideRemove={conditions.length <= 1}
              index={index}
              onFieldChange={onFieldChange}
              onOperatorChange={onOperatorChange}
              onRemoveCondition={onRemoveCondition}
              onValueChange={onValueChange}
            />
          </Fragment>
        ))}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="mt-5 inline-flex w-fit">
            <Button
              type="button"
              variant="ghost"
              className="h-5 w-fit gap-1 px-0 text-sm font-normal hover:bg-transparent"
              disabled={!canAddCondition}
              onClick={onAddCondition}
            >
              <Plus className="size-4" />
              {t('resource_conditions.add_condition')}
            </Button>
          </span>
        </TooltipTrigger>
        {!canAddCondition && (
          <TooltipContent>{addButtonTooltip}</TooltipContent>
        )}
      </Tooltip>
    </aside>
  );
}

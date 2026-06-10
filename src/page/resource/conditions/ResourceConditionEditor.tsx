import { Plus } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { cn } from '@/lib/utils';

import {
  ResourceCondition,
  ResourceConditionField,
  ResourceConditionOperator,
} from './index';
import { ResourceConditionRow } from './ResourceConditionRow';

interface ResourceConditionEditorProps {
  addButtonTooltip?: string;
  canAddCondition: boolean;
  conditionErrors: Record<number, string>;
  conditionListRef?: RefObject<HTMLDivElement | null>;
  conditions: ResourceCondition[];
  headerClassName?: string;
  headerContent?: ReactNode;
  listClassName?: string;
  onAddCondition: (afterIndex?: number) => void;
  onFieldChange: (index: number, field: ResourceConditionField) => void;
  onOperatorChange: (
    index: number,
    operator: ResourceConditionOperator
  ) => void;
  onRemoveCondition: (index: number) => void;
  onValueChange: (index: number, value: ResourceCondition['value']) => void;
  titleClassName?: string;
}

export function ResourceConditionEditor({
  addButtonTooltip,
  canAddCondition,
  conditionErrors,
  conditionListRef,
  conditions,
  headerClassName,
  headerContent,
  listClassName,
  onAddCondition,
  onFieldChange,
  onOperatorChange,
  onRemoveCondition,
  onValueChange,
  titleClassName,
}: ResourceConditionEditorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'flex items-center justify-between gap-2',
          headerClassName
        )}
      >
        <p
          className={cn(
            'flex h-9 items-center whitespace-nowrap text-sm font-medium text-foreground',
            titleClassName
          )}
        >
          {t('resource_conditions.conditions')}
        </p>
        {headerContent}
      </div>

      <div
        ref={conditionListRef}
        className={cn('max-h-56 overflow-y-auto pr-1', listClassName)}
      >
        {conditions.map((condition, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <div className="my-5 h-px bg-slate-100 dark:bg-neutral-800" />
            )}
            <ResourceConditionRow
              index={index}
              condition={condition}
              conditionError={conditionErrors[index]}
              hideRemove={conditions.length <= 1}
              onRemove={onRemoveCondition}
              onFieldChange={onFieldChange}
              onOperatorChange={onOperatorChange}
              onValueChange={onValueChange}
            />
          </Fragment>
        ))}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex w-fit">
            <Button
              type="button"
              variant="ghost"
              className="h-8 gap-1 px-0 text-sm font-normal hover:bg-transparent"
              onClick={() => onAddCondition(conditions.length - 1)}
              disabled={!canAddCondition}
            >
              <Plus className="size-4" />
              {t('resource_conditions.add_condition')}
            </Button>
          </span>
        </TooltipTrigger>
        {!canAddCondition && addButtonTooltip && (
          <TooltipContent>{addButtonTooltip}</TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}

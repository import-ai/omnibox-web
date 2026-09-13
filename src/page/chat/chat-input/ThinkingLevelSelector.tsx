import './thinkingLevelSelector.css';

import { Check, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';

import {
  type ThinkingConfig,
  type ThinkingGroup,
  type ThinkingSelection,
  thinkingStep,
} from './useThinkingLevel';

interface Props {
  config: ThinkingConfig;
  group: ThinkingGroup;
  onGroupChange: (group: ThinkingGroup) => void;
  value: ThinkingSelection;
  onChange: (level: string) => void;
  disabled?: boolean;
  proDisabled?: boolean;
}

export default function ThinkingLevelSelector({
  config,
  group,
  onGroupChange,
  value,
  onChange,
  disabled,
  proDisabled = false,
}: Props) {
  const { t } = useTranslation();
  const [modelsOpen, setModelsOpen] = useState(false);
  const options = config[group];
  if (!options) return null;
  const visibleLevels = options.levels;
  const index = Math.max(
    0,
    visibleLevels.findIndex(item => thinkingStep(item) === thinkingStep(value))
  );
  const label = t(`chat.thinking.${value.level}`, {
    defaultValue: value.level,
  });
  const edition = t(`chat.model.${value.edition}`);
  const title = group === 'default' ? `${edition} ${label}` : label;
  return (
    <Popover
      onOpenChange={open => {
        if (!open) setModelsOpen(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${t('chat.thinking_level')}: ${edition} ${label}`}
          className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-black/5 data-[state=open]:bg-black/5 dark:hover:bg-white/10 dark:data-[state=open]:bg-white/10"
        >
          {edition} {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-[240px] max-w-[calc(100vw-32px)] rounded-2xl border-black/10 bg-background px-3 pb-3 pt-2 shadow-xl dark:border-white/10 dark:bg-[#292929]"
      >
        {modelsOpen ? (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setModelsOpen(false)}
              className="mb-2 flex items-center gap-2 p-2 text-sm text-muted-foreground"
            >
              <ChevronLeft className="size-4" />
              {t('chat.model_tier')}
            </button>
            {(['default', 'pro', 'basic'] as ThinkingGroup[])
              .filter(item => config[item])
              .map(item => (
                <span
                  key={item}
                  title={
                    proDisabled && item === 'pro'
                      ? t('chat.agent_credits.compact_tooltip')
                      : undefined
                  }
                >
                  <button
                    type="button"
                    disabled={proDisabled && item === 'pro'}
                    aria-pressed={group === item}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-sm text-left hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
                    onClick={() => {
                      onGroupChange(item);
                      setModelsOpen(false);
                    }}
                  >
                    <span>
                      {t(`chat.model.${item}`)}
                      {item === 'default' && (
                        <span className="block text-xs text-muted-foreground">
                          {t('chat.default_models_description')}
                        </span>
                      )}
                    </span>
                    {group === item && <Check className="size-4" />}
                  </button>
                </span>
              ))}
          </div>
        ) : (
          <>
            <div className="relative mb-3 px-6 text-center">
              <button
                type="button"
                aria-label={t('chat.model_tier')}
                disabled={disabled}
                onClick={() => setModelsOpen(true)}
                className="rounded-xl px-1 py-1 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <span className="flex items-center justify-center gap-1 text-base font-medium text-[#3098ff]">
                  {title}
                  <ChevronRight className="size-4" />
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(`chat.model.${group}`)}
                </span>
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label={t('chat.reset_thinking_level')}
                onClick={() => onChange(thinkingStep(options.default))}
                className="absolute right-0 top-1 rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
            <div
              title={
                proDisabled && group === 'default'
                  ? t('chat.agent_credits.compact_tooltip')
                  : undefined
              }
              className="thinking-slider relative mx-1 h-6 rounded-full bg-black/10 dark:bg-white/10"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
              >
                <div
                  className="h-full bg-[#3098ff]"
                  style={{
                    width: `calc(12px + (100% - 24px) * ${options.levels.length > 1 ? index / (options.levels.length - 1) : 0})`,
                  }}
                />
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-3 inset-y-0 flex items-center justify-between"
              >
                {visibleLevels.map(item => (
                  <span
                    key={thinkingStep(item)}
                    className="size-1 rounded-full bg-foreground/30"
                  />
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={visibleLevels.length - 1}
                step={1}
                value={index}
                disabled={
                  disabled ||
                  visibleLevels.length < 2 ||
                  (proDisabled && group === 'default')
                }
                title={
                  proDisabled && group === 'default'
                    ? t('chat.agent_credits.compact_tooltip')
                    : undefined
                }
                aria-label={t('chat.thinking_level')}
                aria-valuetext={`${edition} ${label}`}
                onChange={event =>
                  onChange(
                    thinkingStep(visibleLevels[Number(event.target.value)])
                  )
                }
                className="relative block h-6 w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 disabled:cursor-default"
              />
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

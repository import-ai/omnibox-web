import './thinkingLevelSelector.css';

import { Check, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BehaviorExposure } from '@/components/BehaviorExposure';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { onOverlayClose, trackButtonClick } from '@/lib/trackButtonClick';
import { cn } from '@/lib/utils';

import { composerControlHoverClass } from './composerControlClass';
import {
  type ThinkingConfig,
  type ThinkingGroup,
  type ThinkingSelection,
  thinkingStep,
} from './useThinkingLevel';

interface Props {
  surface?: 'home' | 'conversation';
  config: ThinkingConfig;
  group: ThinkingGroup;
  onGroupChange: (group: ThinkingGroup) => void;
  onProLocked?: () => void;
  value: ThinkingSelection;
  onChange: (level: string) => void;
  onLevelCommit?: (level: string) => void;
  disabled?: boolean;
  proLocked?: boolean;
  proUnsupported?: boolean;
  basicUnsupported?: boolean;
}

function ModelStrengthPanel({
  active,
  children,
  ...props
}: ComponentProps<typeof PopoverContent> & { active: boolean }) {
  return (
    <BehaviorExposure target="model_strength_panel" active={active}>
      <PopoverContent {...props}>{children}</PopoverContent>
    </BehaviorExposure>
  );
}

export default function ThinkingLevelSelector({
  config,
  surface,
  group,
  onGroupChange,
  onProLocked,
  value,
  onChange,
  onLevelCommit,
  disabled,
  proLocked = false,
  proUnsupported = false,
  basicUnsupported = false,
}: Props) {
  const { t } = useTranslation();
  const [modelsOpen, setModelsOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const options = config[group];
  if (!options) return null;
  // Both signals mean the Pro tier needs a paywall: the namespace is not
  // entitled to it, or its Kibble balance is exhausted. The row must stay
  // clickable so the user can see why instead of a silent no-op.
  const proNeedsPaywall = proLocked || proUnsupported;
  const visibleLevels = options.levels.filter(item => {
    if (group !== 'default') return true;
    if (basicUnsupported && item.edition === 'basic') return false;
    return true;
  });
  const defaultSliderHint =
    group !== 'default'
      ? undefined
      : proNeedsPaywall
        ? t('chat.agent_credits.compact_tooltip')
        : basicUnsupported
          ? t('chat.image.agent_1_1_unsupported')
          : undefined;
  const index = Math.max(
    0,
    visibleLevels.findIndex(item => thinkingStep(item) === thinkingStep(value))
  );
  const label = t(`chat.thinking.${value.level}`, {
    defaultValue: value.level,
  });
  const edition = t(`chat.model.${value.edition}`);
  const title = group === 'default' ? `${edition} ${label}` : label;
  const commitSliderValue = (input: HTMLInputElement) => {
    const next = visibleLevels[Number(input.value)];
    if (!next) return;
    const step = thinkingStep(next);
    // A gated Pro step was never applied; keep the persisted value untouched.
    if (proNeedsPaywall && step.startsWith('pro.')) return;
    onLevelCommit?.(step);
  };
  return (
    <Popover
      open={panelOpen}
      onOpenChange={open => {
        setPanelOpen(open);
        if (!open) setModelsOpen(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          onClick={() => trackButtonClick('chat_thinking_open', { surface })}
          type="button"
          disabled={disabled}
          aria-label={`${t('chat.thinking_level')}: ${edition} ${label}`}
          className={cn(
            'flex h-8 items-center rounded-full px-2 text-xs',
            composerControlHoverClass
          )}
        >
          {edition} {label}
        </button>
      </PopoverTrigger>
      <ModelStrengthPanel
        active={panelOpen}
        onPointerDownOutside={onOverlayClose('chat_overlay_close', 'thinking')}
        side="top"
        align="end"
        sideOffset={8}
        className="w-[240px] max-w-[calc(100vw-32px)] rounded-2xl border-black/10 bg-popover px-3 pb-3 pt-2 shadow-xl dark:border-white/10"
      >
        {modelsOpen ? (
          <div className="space-y-1">
            <button
              type="button"
              onClick={event => {
                trackButtonClick('chat_model_close', { surface });
                const handleClick = () => setModelsOpen(false);
                if (typeof handleClick === 'function') {
                  (handleClick as (value?: typeof event) => void)(event);
                }
              }}
              className="mb-2 flex items-center gap-2 p-2 text-sm text-muted-foreground"
            >
              <ChevronLeft className="size-4" />
              {t('chat.model_tier')}
            </button>
            {(['default', 'pro', 'basic'] as ThinkingGroup[])
              .filter(item => config[item])
              .map(item => {
                const disabledReason =
                  basicUnsupported && item === 'basic'
                    ? t('chat.image.agent_1_1_unsupported')
                    : undefined;
                const button = (
                  <button
                    type="button"
                    disabled={Boolean(disabledReason)}
                    aria-pressed={group === item}
                    className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={event => {
                      trackButtonClick('chat_model_select', { surface });
                      if (proNeedsPaywall && item === 'pro') {
                        onProLocked?.();
                        setModelsOpen(false);
                        return;
                      }
                      const handleClick = () => {
                        onGroupChange(item);
                        setModelsOpen(false);
                      };
                      if (typeof handleClick === 'function') {
                        (handleClick as (value?: typeof event) => void)(event);
                      }
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
                    {group === item && (
                      <Check className="size-4 text-blue-500! [&_path]:text-blue-500!" />
                    )}
                  </button>
                );
                if (!disabledReason) return <div key={item}>{button}</div>;
                return (
                  <TooltipProvider key={item} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block w-full cursor-not-allowed">
                          {button}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{disabledReason}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
          </div>
        ) : (
          <>
            <div className="relative mb-3 px-6 text-center">
              <button
                type="button"
                aria-label={t('chat.model_tier')}
                disabled={disabled}
                onClick={event => {
                  trackButtonClick('chat_model_open', { surface });
                  const handleClick = () => setModelsOpen(true);
                  if (typeof handleClick === 'function') {
                    (handleClick as (value?: typeof event) => void)(event);
                  }
                }}
                className="rounded-xl px-1 py-1 hover:bg-accent"
              >
                <span className="flex items-center justify-center gap-1 text-base font-medium text-[#3098ff]">
                  {title}
                  <ChevronRight className="size-4" />
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(`chat.model.${group}`)}
                </span>
              </button>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="absolute right-0 top-1">
                      <button
                        type="button"
                        disabled={disabled}
                        aria-label={t('chat.restore_default')}
                        onClick={event => {
                          trackButtonClick('chat_model_refresh', { surface });
                          const handleClick = () => onGroupChange('default');
                          if (typeof handleClick === 'function') {
                            (handleClick as (value?: typeof event) => void)(
                              event
                            );
                          }
                        }}
                        className={cn(
                          'rounded-full p-1.5',
                          composerControlHoverClass
                        )}
                      >
                        <RotateCcw className="size-4" />
                      </button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="z-60">
                    {t('chat.restore_default')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div
              title={defaultSliderHint}
              className="thinking-slider relative mx-1 h-6 rounded-full bg-accent"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
              >
                <div
                  className="h-full bg-[#3098ff]"
                  style={{
                    width: `calc(12px + (100% - 24px) * ${visibleLevels.length > 1 ? index / (visibleLevels.length - 1) : 0})`,
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
                disabled={disabled || visibleLevels.length < 2}
                title={
                  visibleLevels.length < options.levels.length
                    ? defaultSliderHint
                    : undefined
                }
                aria-label={t('chat.thinking_level')}
                aria-valuetext={`${edition} ${label}`}
                onChange={event => {
                  const next = thinkingStep(
                    visibleLevels[Number(event.target.value)]
                  );
                  trackButtonClick('chat_thinking_select', {
                    surface,
                    level: next,
                  });
                  if (proNeedsPaywall && next.startsWith('pro.')) {
                    onProLocked?.();
                    return;
                  }
                  onChange(next);
                }}
                onPointerUp={event => commitSliderValue(event.currentTarget)}
                onPointerCancel={event =>
                  commitSliderValue(event.currentTarget)
                }
                onKeyUp={event => {
                  if (
                    [
                      'ArrowLeft',
                      'ArrowRight',
                      'ArrowUp',
                      'ArrowDown',
                      'Home',
                      'End',
                      'PageUp',
                      'PageDown',
                    ].includes(event.key)
                  ) {
                    commitSliderValue(event.currentTarget);
                  }
                }}
                onBlur={event => commitSliderValue(event.currentTarget)}
                className="relative block h-6 w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 disabled:cursor-default"
              />
            </div>
          </>
        )}
      </ModelStrengthPanel>
    </Popover>
  );
}

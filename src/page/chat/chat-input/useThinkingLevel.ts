import { useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';
import type { MessageDetail } from '@/page/chat/core/types/conversation';

export interface ThinkingSelection {
  edition: 'basic' | 'pro';
  level: string;
}
export type ThinkingGroup = 'default' | 'pro' | 'basic';
export interface ThinkingEdition {
  default: ThinkingSelection;
  levels: ThinkingSelection[];
}
export type ThinkingConfig = Partial<Record<ThinkingGroup, ThinkingEdition>>;
export const thinkingStep = (selection: ThinkingSelection) =>
  `${selection.edition}.${selection.level}`;

export function useThinkingLevel(scope: string, messages: MessageDetail[]) {
  const [config, setConfig] = useState<ThinkingConfig>();
  const [group, setGroup] = useState<ThinkingGroup>('default');
  const [step, setStep] = useState<string>();
  const changed = useRef(false);
  const storageKey = `thinking-level:${scope}`;
  const latest = [...messages]
    .reverse()
    .find(message => message.message.role === 'user')?.attrs;

  useEffect(() => {
    let active = true;
    setConfig(undefined);
    setStep(undefined);
    changed.current = false;
    http
      .get<ThinkingConfig>('/config/models', { mute: true })
      .then(result => {
        if (active) setConfig(result);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [scope]);

  useEffect(() => {
    if (!config || changed.current) return;
    let saved: { group?: ThinkingGroup; step?: string } = {};
    try {
      const value = localStorage.getItem(storageKey);
      if (value)
        saved = value.startsWith('{')
          ? JSON.parse(value)
          : { group: 'basic', step: `basic.${value}` };
    } catch {
      /* Use the server default when storage is unavailable or malformed. */
    }
    const next =
      saved.group &&
      ['default', 'pro', 'basic'].includes(saved.group) &&
      config[saved.group]
        ? saved.group
        : config.default
          ? 'default'
          : config.basic
            ? 'basic'
            : 'pro';
    const options = config[next];
    if (!options) return;
    const candidate =
      saved.step ??
      (latest?.edition && latest.level
        ? thinkingStep({ edition: latest.edition, level: latest.level })
        : undefined);
    setGroup(next);
    setStep(
      options.levels.some(item => thinkingStep(item) === candidate)
        ? candidate
        : thinkingStep(options.default)
    );
  }, [config, latest?.edition, latest?.level, storageKey]);

  const select = (nextGroup: ThinkingGroup, nextStep: string) => {
    if (
      !config?.[nextGroup]?.levels.some(item => thinkingStep(item) === nextStep)
    )
      return;
    changed.current = true;
    setGroup(nextGroup);
    setStep(nextStep);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ group: nextGroup, step: nextStep })
      );
    } catch {
      /* Keep the in-memory selection. */
    }
  };
  const changeLevel = (next: string) => select(group, next);
  const changeGroup = (next: ThinkingGroup) => {
    const options = config?.[next];
    if (options) select(next, thinkingStep(options.default));
  };
  const selection = config?.[group]?.levels.find(
    item => thinkingStep(item) === step
  );
  return { config, group, selection, changeLevel, changeGroup };
}

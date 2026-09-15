import { useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';
import {
  isTerminalMessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
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
export type ThinkingConfig = Partial<Record<ThinkingGroup, ThinkingEdition>> & {
  edition?: 'basic' | 'pro';
  pro_available?: boolean;
};
export const thinkingStep = (selection: ThinkingSelection) =>
  `${selection.edition}.${selection.level}`;

export function availableThinkingStep(
  options: ThinkingEdition | undefined,
  locked: { pro?: boolean; basic?: boolean } = {}
) {
  if (!options) return undefined;
  const allowed = options.levels.filter(
    item =>
      !(locked.pro && item.edition === 'pro') &&
      !(locked.basic && item.edition === 'basic')
  );
  const preferred = thinkingStep(options.default);
  if (allowed.some(item => thinkingStep(item) === preferred)) return preferred;
  return allowed[0] ? thinkingStep(allowed[0]) : undefined;
}

export function useThinkingLevel(scope: string, messages: MessageDetail[]) {
  const [config, setConfig] = useState<ThinkingConfig>();
  const [group, setGroup] = useState<ThinkingGroup>('default');
  const [step, setStep] = useState<string>();
  const changed = useRef(false);
  const storageKey = `thinking-level:${scope}`;
  const latest = [...messages]
    .reverse()
    .find(message => message.message.role === 'user')?.attrs;
  const shareId = scope.startsWith('/s/') ? scope.split('/')[2] || '' : '';
  const configUrl = shareId
    ? `/config/models?share_id=${encodeURIComponent(shareId)}`
    : '/config/models';
  // Terminal statuses only. A streaming answer is still running up the bill
  // that decides what comes back, so counting it would re-read the catalog
  // before the turn was charged — and the count would then be unchanged when
  // the turn really did settle, leaving the stale answer in place.
  const settledTurns = messages.filter(
    message =>
      message.message.role === OpenAIMessageRole.ASSISTANT &&
      isTerminalMessageStatus(message.status)
  ).length;

  useEffect(() => {
    let active = true;
    setConfig(undefined);
    setStep(undefined);
    changed.current = false;
    http
      .get<ThinkingConfig>(configUrl, { mute: true })
      .then(result => {
        if (active) setConfig(result);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [configUrl, scope]);

  // Which models a share offers depends on the shared space's credit balance,
  // and the share's own turns are what spend it. Re-read the catalog as each
  // turn settles so a space running dry moves the visitor to Agent 1.1 there
  // and then, rather than at their next page load. Replaced in place: dropping
  // the config first would tear the selector down between turns.
  useEffect(() => {
    if (!shareId || settledTurns === 0) return;
    let active = true;
    http
      .get<ThinkingConfig>(configUrl, { mute: true })
      .then(result => {
        if (active) setConfig(result);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [configUrl, shareId, settledTurns]);

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
  const changeGroup = (next: ThinkingGroup, nextStep?: string) => {
    const options = config?.[next];
    if (options) select(next, nextStep ?? thinkingStep(options.default));
  };
  const selection = config?.[group]?.levels.find(
    item => thinkingStep(item) === step
  );
  const proLocked = config?.edition === 'pro' && config.pro_available === false;
  return {
    config,
    group,
    selection,
    changeLevel,
    changeGroup,
    proLocked,
  };
}

import { Check, Gift, Link, UserPlus } from 'lucide-react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/button';
import { cn } from '@/lib/utils';
import type { InviteOverview, InviteTask } from '@/service/inviteReferral';

import { InviteNote } from './InviteNote';
import { InviteRuleArrow } from './InviteRuleArrow';

const RULE_STEPS = [
  { key: 'copy', Icon: Link },
  { key: 'bind', Icon: UserPlus },
  { key: 'task', Icon: Gift },
] as const;

interface InviteActivityPanelProps {
  overview: InviteOverview;
  onInvite: () => void;
  onTask: (task: InviteTask) => void;
}

function NewcomerTasks({
  overview,
  onTask,
}: {
  overview: InviteOverview;
  onTask: (task: InviteTask) => void;
}) {
  const { t } = useTranslation();
  const tasks = overview.newcomer_tasks;
  if (!tasks) return null;
  const phoneBound = tasks.items.some(
    task => task.task_code === 'phone_bound' && task.status === 'completed'
  );

  return (
    <div className="overflow-hidden rounded-lg border border-[#f2f2f7] bg-white dark:border-border dark:bg-[#262626]">
      <div className="flex items-center justify-between px-4 pt-[23px]">
        <h2 className="text-sm font-medium">
          {t('inviteReferral.tasks.title')}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t('inviteReferral.tasks.expires', { count: tasks.remaining_days })}
        </span>
      </div>
      <div className="mt-2">
        {tasks.items.map((task, index) => {
          const completed = task.status === 'completed';
          const locked =
            !completed && task.task_code !== 'phone_bound' && !phoneBound;
          return (
            <div key={task.task_code}>
              {index > 0 ? (
                <div className="mx-4 h-px bg-[#f2f2f7] dark:bg-border" />
              ) : null}
              <div className="flex min-h-16 items-center px-4 py-3">
                <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-blue-100">
                  {completed ? (
                    <Check
                      className="size-3.5 text-blue-500"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <span className="text-[11px] font-medium text-blue-500">
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-sm font-medium leading-5">{task.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.reward_text}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={completed || locked ? 'outline' : 'default'}
                  className={cn(
                    'h-[25px] min-w-[67px] px-3 text-xs shadow-none',
                    completed &&
                      'border-neutral-200 bg-white text-muted-foreground hover:bg-white disabled:border-neutral-200 disabled:bg-white disabled:text-muted-foreground dark:border-white dark:bg-transparent dark:text-foreground dark:hover:bg-transparent dark:disabled:border-white dark:disabled:bg-transparent dark:disabled:text-foreground',
                    locked &&
                      'border-neutral-200 bg-white text-foreground hover:bg-white dark:!border-neutral-700 dark:!bg-[#262626] dark:text-foreground dark:hover:!bg-[#262626]'
                  )}
                  disabled={completed}
                  onClick={() => {
                    if (locked) {
                      toast(t('inviteReferral.tasks.phoneRequired'), {
                        position: 'bottom-right',
                      });
                      return;
                    }
                    onTask(task);
                  }}
                >
                  {t(
                    completed
                      ? 'inviteReferral.tasks.completed'
                      : 'inviteReferral.tasks.action'
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InviteActivityPanel({
  overview,
  onInvite,
  onTask,
}: InviteActivityPanelProps) {
  const { t } = useTranslation();
  const rewardRules = overview.reward_rules ?? [];
  const notes = overview.notes ?? [];

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-64 pt-6">
        <div className="flex flex-col gap-1">
          {overview.newcomer_tasks ? (
            <NewcomerTasks overview={overview} onTask={onTask} />
          ) : null}
          <div className="rounded-lg bg-white px-3 py-4 dark:bg-[#262626]">
            <h2 className="text-sm font-medium">
              {t('inviteReferral.rules.inviteTitle')}
            </h2>
            <div className="mt-3.5 flex w-full items-start">
              {RULE_STEPS.map(({ key, Icon }, index) => (
                <Fragment key={key}>
                  <div className="flex min-w-0 flex-1 flex-col items-center">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Icon className="size-[18px] text-blue-500" />
                    </div>
                    <p
                      className={cn(
                        'mt-2 w-full min-w-0 text-center text-xs leading-4',
                        index < RULE_STEPS.length - 1 &&
                          'overflow-visible whitespace-nowrap'
                      )}
                    >
                      {t(`inviteReferral.rules.steps.${key}`)}
                    </p>
                  </div>
                  {index < RULE_STEPS.length - 1 ? <InviteRuleArrow /> : null}
                </Fragment>
              ))}
            </div>
            {rewardRules.length > 0 ? (
              <div className="mt-4">
                <h2 className="text-sm font-medium">
                  {t('inviteReferral.rewards.title')}
                </h2>
                <div className="mt-4 overflow-hidden rounded-lg border border-[#f2f2f7] dark:border-border">
                  <div className="grid grid-cols-2">
                    <div className="border-r border-[#f2f2f7] px-3 py-3 text-center text-sm font-medium dark:border-border">
                      {t('inviteReferral.rewards.task')}
                    </div>
                    <div className="px-3 py-3 text-center text-sm font-medium">
                      {t('inviteReferral.rewards.both')}
                    </div>
                  </div>
                  {rewardRules.map(rule => (
                    <div
                      key={rule.task_code}
                      className="grid grid-cols-2 border-t border-[#f2f2f7] dark:border-border"
                    >
                      <div className="border-r border-[#f2f2f7] px-3 py-3 text-center text-xs dark:border-border">
                        {rule.task_text}
                      </div>
                      <div className="px-3 py-3 text-center text-[13px] font-medium text-blue-500">
                        {rule.reward_text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {notes.length > 0 ? (
            <div className="px-3">
              <h2 className="text-sm font-medium">
                {t('inviteReferral.rules.notesTitle')}
              </h2>
              <div className="mt-2 flex flex-col gap-1">
                {notes.map((note, index) => (
                  <InviteNote key={index} note={note} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[200px] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.75)_12%,#fff_28%)] dark:bg-[linear-gradient(180deg,rgba(38,38,38,0.2)_0%,rgba(38,38,38,0.75)_12%,#262626_28%)]"
      />
      <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-5 pt-3">
        <div className="px-5">
          <h2 className="text-base font-medium">
            {t('inviteReferral.share.exclusiveLink')}
          </h2>
          <p className="mt-1 text-sm leading-[26px]">
            {t('inviteReferral.share.exclusiveLinkHint')}
          </p>
        </div>
        <div className="px-2">
          <Button
            type="button"
            className="mt-3 h-12 w-full text-base shadow-none"
            onClick={onInvite}
          >
            {t('inviteReferral.inviteNow')}
          </Button>
        </div>
      </div>
    </div>
  );
}

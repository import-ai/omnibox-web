import { useEffect, useMemo, useRef } from 'react';

import { BIND_CHECK_INTERVAL } from '@/const';
import type { Application } from '@/interface';

const POLLING_TIMEOUT = 5 * 60 * 1000;

interface BindingStatusPollingOptions {
  open: boolean;
  active?: boolean;
  applicationId: string;
  checkApplicationStatus: (
    applicationId: string,
    options?: { signal?: AbortSignal }
  ) => Promise<Application>;
  onBindingComplete: () => void;
}

export function useBindingStatusPolling({
  open,
  active = true,
  applicationId,
  checkApplicationStatus,
  onBindingComplete,
}: BindingStatusPollingOptions) {
  const latest = useRef({
    open,
    active,
    applicationId,
    checkApplicationStatus,
    onBindingComplete,
  });
  latest.current = {
    open,
    active,
    applicationId,
    checkApplicationStatus,
    onBindingComplete,
  };
  const session = useMemo(
    () => ({ deadline: Date.now() + POLLING_TIMEOUT, completed: false }),
    [open, applicationId]
  );

  useEffect(() => {
    if (!open || !active || !applicationId || session.completed) return;

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const isCurrent = () =>
      !disposed &&
      latest.current.open &&
      latest.current.active &&
      latest.current.applicationId === applicationId &&
      latest.current.checkApplicationStatus === checkApplicationStatus &&
      document.visibilityState === 'visible' &&
      !session.completed &&
      Date.now() < session.deadline;

    const pause = () => {
      clearTimeout(timer);
      controller?.abort();
      controller = undefined;
    };

    const poll = async () => {
      if (!isCurrent() || controller) return;
      clearTimeout(timer);
      const request = new AbortController();
      controller = request;
      try {
        const application = await checkApplicationStatus(applicationId, {
          signal: request.signal,
        });
        if (!isCurrent() || request.signal.aborted || controller !== request)
          return;
        if (application.api_key_id) {
          session.completed = true;
          latest.current.onBindingComplete();
        }
      } catch {
        // Transient failures retry while the current session remains active.
      } finally {
        if (controller === request) {
          controller = undefined;
          if (isCurrent()) timer = setTimeout(poll, BIND_CHECK_INTERVAL);
        }
      }
    };

    const calibrate = () => {
      if (document.visibilityState !== 'visible') pause();
      else void poll();
    };

    const remaining = session.deadline - Date.now();
    if (remaining <= 0) return;
    const deadlineTimer = setTimeout(pause, remaining);
    if (document.visibilityState === 'visible') {
      timer = setTimeout(poll, BIND_CHECK_INTERVAL);
    }
    document.addEventListener('visibilitychange', calibrate);
    window.addEventListener('focus', calibrate);
    return () => {
      disposed = true;
      pause();
      clearTimeout(deadlineTimer);
      document.removeEventListener('visibilitychange', calibrate);
      window.removeEventListener('focus', calibrate);
    };
  }, [open, active, applicationId, checkApplicationStatus, session]);
}

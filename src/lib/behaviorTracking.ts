import { type RefObject, useEffect, useRef, useSyncExternalStore } from 'react';
import { v4 as uuidv4 } from 'uuid';

import {
  type BehaviorProps,
  BehaviorTracker,
  type VisitOptions,
} from '@/lib/behaviorEngine';
import { behaviorLeaveReason } from '@/lib/behaviorNavigation';
import {
  beginCommentActivation,
  registerBehaviorRequestStarter,
} from '@/lib/behaviorRequest';
import { subscribeCredentials } from '@/page/user/util';
let trackingEnabled = false;
let sendEvent:
  ((name: string, props: BehaviorProps) => Promise<void>) | undefined;
export function configureBehaviorTracking(
  enabled: boolean,
  send: (name: string, props: BehaviorProps) => Promise<void>
) {
  trackingEnabled = enabled;
  sendEvent = send;
}

function nativeBridge() {
  const native = window as Window & {
    ReactNativeWebView?: { postMessage: (value: string) => void };
    __omniboxNativeBehavior?: boolean;
    __omniboxNativePlatform?: string;
  };
  return native.__omniboxNativeBehavior && native.ReactNativeWebView
    ? native
    : undefined;
}
export const behavior = new BehaviorTracker({
  id: uuidv4,
  now: () => Date.now(),
  monotonic: () => performance.now(),
  enabled: () =>
    trackingEnabled && (!('ReactNativeWebView' in window) || !!nativeBridge()),
  send: (name, props) => {
    const bridge = nativeBridge();
    if (bridge)
      bridge.ReactNativeWebView!.postMessage(
        JSON.stringify({ type: 'omnibox:behavior', event: { name, props } })
      );
    else void sendEvent?.(name, props).catch(() => undefined);
  },
});
function identity() {
  try {
    return localStorage.getItem('uid') || '';
  } catch {
    return '';
  }
}
export function useBehaviorSurface(
  options: VisitOptions & {
    active?: boolean;
    commentAction?: 'annotation_comment' | 'document_comment';
    elementRef?: RefObject<HTMLElement | null>;
  }
) {
  const userId = useSyncExternalStore(subscribeCredentials, identity, () => '');
  const { elementRef, ...serializable } = options;
  const key = JSON.stringify(serializable);
  const lease = useRef<
    | {
        key: string;
        user: string;
        generation: number;
        visit?: ReturnType<typeof behavior.visit>;
      }
    | undefined
  >(undefined);
  useEffect(() => {
    const value = JSON.parse(key) as VisitOptions & {
      active?: boolean;
      commentAction?: 'annotation_comment' | 'document_comment';
      elementRef?: RefObject<HTMLElement | null>;
    };
    if (value.active === false || !trackingEnabled) return;
    const user = identity();
    const ownerKey = key + ':' + userId;
    const state: NonNullable<typeof lease.current> =
      lease.current?.key === ownerKey
        ? lease.current
        : { key: ownerKey, user: userId, generation: 0 };
    lease.current = state;
    const generation = ++state.generation;

    let visit: ReturnType<typeof behavior.visit> | undefined = state.visit;
    const sync = () => {
      if (identity() !== user) {
        visit?.discard();
        visit = undefined;
        return;
      }
      const node = elementRef?.current;
      let visible = !elementRef;
      if (node && !node.closest('[aria-hidden="true"], [inert]')) {
        const box = node.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(window.innerWidth - 1, box.left + box.width / 2)
        );
        const y = Math.max(
          0,
          Math.min(window.innerHeight - 1, box.top + box.height / 2)
        );
        const top =
          typeof document.elementFromPoint === 'function'
            ? document.elementFromPoint(x, y)
            : null;
        visible =
          box.width > 0 &&
          box.height > 0 &&
          box.bottom > 0 &&
          box.top < window.innerHeight &&
          !!top &&
          node.contains(top);
      }
      if (
        visible &&
        document.visibilityState === 'visible' &&
        document.hasFocus()
      ) {
        if (!visit) {
          visit = state.visit = behavior.visit(value);
          if (
            value.commentAction &&
            typeof value.props?.resource_id === 'string'
          )
            beginCommentActivation(
              value.props.resource_id,
              value.commentAction
            );
        } else visit.resume();
      } else
        visit?.pause(
          document.visibilityState === 'visible' && document.hasFocus()
            ? 'occluded'
            : 'background'
        );
    };
    sync();
    const timer = window.setInterval(() => {
      sync();
      visit?.tick();
    }, 1000);
    const pagehide = () => visit?.pause('page_exit');
    window.addEventListener('pagehide', pagehide);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('blur', sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('pagehide', pagehide);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('blur', sync);
      queueMicrotask(() => {
        if (state.generation !== generation) return;
        if (identity() === user) visit?.close(behaviorLeaveReason(value.scope));
        else visit?.discard();
        state.visit = undefined;
      });
    };
  }, [key, userId, elementRef]);
}
export function trackInputActivation(
  target: string,
  props: BehaviorProps = {}
) {
  behavior.emit('input_activation', {
    ...props,
    target,
    activation_id: uuidv4(),
  });
}
export function coreActionHeaders(
  action: ReturnType<BehaviorTracker['startAction']>
): Record<string, string> {
  if (!trackingEnabled || ('ReactNativeWebView' in window && !nativeBridge()))
    return {};
  return {
    ...(nativeBridge()?.__omniboxNativePlatform
      ? { 'X-Client-Platform': nativeBridge()!.__omniboxNativePlatform! }
      : {}),
    'x-omnibox-action-id': action.action_id,
    'x-omnibox-action-type': action.action_type,
    'x-omnibox-action-started-at': action.action_started_at,
  };
}

registerBehaviorRequestStarter(
  (type, props) => coreActionHeaders(behavior.startAction(type, props)),
  identity,
  resourceId => {
    if (behavior.markEditorInput(resourceId))
      behavior.emit('editor_input', {
        resource_id: resourceId,
        has_input: true,
      });
  }
);

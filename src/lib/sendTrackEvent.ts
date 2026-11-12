import FingerprintJS from '@fingerprintjs/fingerprintjs';

import { http } from '@/lib/request';
import { TraceOutbox } from '@/lib/traceOutbox';

class EventStorage {
  private loaded: boolean = false;
  private storageKey = 'omnibox_track_event';
  private cache = new Map<string, boolean>();

  private loadFromStorage() {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    const result = localStorage.getItem(this.storageKey);
    const stored = result ? JSON.parse(result) : {};
    if (stored && typeof stored === 'object') {
      Object.entries(stored).forEach(([key, value]) => {
        this.cache.set(key, value as boolean);
      });
    }
  }

  markEventAsTracked(eventKey: string) {
    this.loadFromStorage();

    this.cache.set(eventKey, true);

    const data = Object.fromEntries(this.cache.entries());

    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  isEventTracked(eventKey: string) {
    this.loadFromStorage();

    return this.cache.has(eventKey);
  }
}

const eventStorage = new EventStorage();

interface Attributes {
  [index: string]: string | number | boolean | undefined;
}

let fingerprintPromise: ReturnType<typeof FingerprintJS.load> | undefined;

async function getVisitorId() {
  try {
    fingerprintPromise ??= FingerprintJS.load();
    const fp = await fingerprintPromise;
    const { visitorId } = await fp.get();
    return visitorId;
  } catch (error) {
    // A blocked or failed load must not disable tracking for the whole page.
    fingerprintPromise = undefined;
    throw error;
  }
}

let chatErrorOutbox: TraceOutbox | undefined;

function chatUserId() {
  try {
    return localStorage.getItem('uid') || undefined;
  } catch {
    return undefined;
  }
}

function chatScope() {
  return typeof window === 'undefined'
    ? 'server'
    : JSON.stringify([window.location.origin, chatUserId() || '']);
}

function getChatErrorOutbox() {
  if (!chatErrorOutbox) {
    chatErrorOutbox = new TraceOutbox({
      read: async () => sessionStorage.getItem('omnibox_chat_error_outbox'),
      write: async value => {
        sessionStorage.setItem('omnibox_chat_error_outbox', value);
      },
      scope: chatScope,
      online: () => navigator.onLine !== false,
      send: async (props, scope) => {
        // Fingerprinting is optional for diagnostic delivery.
        const finger = await getVisitorId().catch(() => undefined);
        if (chatScope() !== scope) throw new Error('Trace scope changed');
        await http.post(
          '/trace',
          { events: [{ name: 'chat_error', props: { ...props, finger } }] },
          {
            mute: true,
            skipAuthRedirect: true,
            timeout: 10_000,
            traceScopeValid: () => chatScope() === scope,
          }
        );
      },
    });
    const flush = () => {
      void chatErrorOutbox?.flush();
    };
    window.addEventListener('online', flush);
    window.addEventListener('omnibox:credential-changed', flush);
    window.addEventListener('storage', flush);
    document.addEventListener('visibilitychange', flush);
  }
  return chatErrorOutbox;
}

const BEHAVIOR_EVENTS = new Set([
  'ui_exposure',
  'active_duration',
  'input_activation',
  'editor_input',
  'core_action_start',
  'core_action_result',
  'onboarding_recording_result',
]);
let behaviorOutbox: TraceOutbox | undefined;
function getBehaviorOutbox() {
  if (!behaviorOutbox) {
    behaviorOutbox = new TraceOutbox({
      read: async () => localStorage.getItem('omnibox_behavior_outbox'),
      write: async value => {
        localStorage.setItem('omnibox_behavior_outbox', value);
      },
      scope: chatScope,
      preserveOccurredAt: true,
      online: () => navigator.onLine !== false,
      send: async (queued, scope) => {
        const name = queued.behavior_event;
        const props = { ...queued };
        delete props.behavior_event;
        delete props.dedupe_key;
        const finger = await getVisitorId().catch(() => undefined);
        if (chatScope() !== scope) throw new Error('Trace scope changed');
        await http.post(
          '/trace',
          { events: [{ name, props: { ...props, finger, platform: 'web' } }] },
          {
            mute: true,
            skipAuthRedirect: true,
            timeout: 10_000,
            traceScopeValid: () => chatScope() === scope,
          }
        );
      },
    });
    const flush = () => {
      void behaviorOutbox?.flush();
    };
    window.addEventListener('online', flush);
    window.addEventListener('omnibox:credential-changed', flush);
    window.addEventListener('storage', flush);
    document.addEventListener('visibilitychange', flush);
  }
  return behaviorOutbox;
}

export async function track(name: string, payload: Attributes = {}) {
  if (BEHAVIOR_EVENTS.has(name)) {
    if (typeof window === 'undefined') return;
    return getBehaviorOutbox().enqueue({
      ...payload,
      behavior_event: name,
      dedupe_key: payload.event_id,
    });
  }
  if (name === 'chat_error') {
    if (typeof window === 'undefined') return;
    return getChatErrorOutbox().enqueue({
      ...payload,
      user_id: chatUserId(),
    });
  }
  if (name === 'login_page_view' || name === 'registration_page_view') {
    const finger = await getVisitorId().catch(() => undefined);
    const event = { name, props: { ...payload, finger } };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await http.post(
          '/trace',
          { events: [event] },
          {
            mute: true,
            skipAuthRedirect: true,
            timeout: 10_000,
          }
        );
        return;
      } catch (error) {
        if (attempt === 1) throw error;
      }
    }
    return;
  }
  const { once = false, userId, ...props } = payload;

  const visitorId =
    name === 'button_click'
      ? await getVisitorId().catch(() => undefined)
      : await getVisitorId();

  // Dealing with many to many relationships
  const key = userId ? `${userId}_${visitorId}` : name;

  // Handle different "once" modes
  if (once && eventStorage.isEventTracked(key)) {
    return;
  }

  http
    .post(
      '/trace',
      {
        events: [
          {
            name,
            props: {
              finger: visitorId,
              ...props,
            },
          },
        ],
      },
      { mute: true }
    )
    .then(() => {
      if (once) {
        eventStorage.markEventAsTracked(key);
      }
    })
    .catch(err => {
      console.error(err);
    });
}

// Restore pending errors after a reload, even before another error occurs.
if (typeof window !== 'undefined') {
  void getChatErrorOutbox().flush();
}

export function getChatErrorScope() {
  return chatScope();
}

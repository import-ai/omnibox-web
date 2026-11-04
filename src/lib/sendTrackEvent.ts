import FingerprintJS from '@fingerprintjs/fingerprintjs';

import { http } from '@/lib/request';

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

export async function track(name: string, payload: Attributes = {}) {
  const { once = false, userId, ...props } = payload;

  const visitorId = await getVisitorId();

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

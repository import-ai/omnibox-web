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
  once?: boolean;
  url?: string;
  referrer?: string;
  finger?: string;
  section?: string;
  language?: string;
}

export function track(name: string, payload: Attributes = {}) {
  const { once = false, ...props } = payload;

  // Handle different "once" modes
  if (once && eventStorage.isEventTracked(name)) {
    return;
  }

  http
    .post('/trace', {
      events: [
        {
          name,
          props,
        },
      ],
    })
    .then(() => {
      if (once) {
        eventStorage.markEventAsTracked(name);
      }
    })
    .catch(err => {
      console.error(err);
    });
}

export type TraceProps = Record<string, string | number | boolean | undefined>;

interface PendingTrace {
  scope: string;
  props: TraceProps;
  occurredAt: number;
}

interface OutboxOptions {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
  scope: () => string;
  send: (props: TraceProps, scope: string) => Promise<void>;
  online?: () => boolean;
}

const MAX_EVENTS = 100;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 10_000;

/** A bounded telemetry queue. It never retries the underlying chat action. */
export class TraceOutbox {
  private pending: PendingTrace[] = [];
  private ready: Promise<void>;
  private writes: Promise<void> = Promise.resolve();
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;

  constructor(private readonly options: OutboxOptions) {
    this.ready = this.load();
  }

  private async load() {
    try {
      const stored: unknown = JSON.parse((await this.options.read()) || '[]');
      if (Array.isArray(stored)) {
        this.pending = stored
          .filter(
            (entry): entry is PendingTrace =>
              entry !== null &&
              typeof entry === 'object' &&
              typeof entry.scope === 'string' &&
              typeof entry.occurredAt === 'number' &&
              Number.isFinite(entry.occurredAt) &&
              entry.props !== null &&
              typeof entry.props === 'object' &&
              !Array.isArray(entry.props) &&
              Object.values(entry.props).every(
                value =>
                  value === undefined ||
                  typeof value === 'string' ||
                  typeof value === 'boolean' ||
                  (typeof value === 'number' && Number.isFinite(value))
              )
          )
          .slice(-MAX_EVENTS);
      }
    } catch {
      // Storage may be disabled; retain new events in memory.
    }
  }

  private prune() {
    const now = Date.now();
    this.pending = this.pending
      .filter(entry => Math.abs(now - entry.occurredAt) < MAX_AGE_MS)
      .slice(-MAX_EVENTS);
  }

  private persist() {
    const snapshot = JSON.stringify(this.pending);
    this.writes = this.writes
      .then(() => this.options.write(snapshot))
      .catch(() => {
        // A storage failure must not prevent delivery from the in-memory queue.
      });
    return this.writes;
  }

  async enqueue(props: TraceProps) {
    const scope = this.options.scope();
    const occurredAt = Date.now();
    await this.ready;
    if (this.disposed) return;
    this.prune();
    if (
      !this.pending.some(
        entry =>
          entry.scope === scope &&
          props.dedupe_key &&
          entry.props.dedupe_key === props.dedupe_key
      )
    ) {
      this.pending.push({
        scope,
        occurredAt,
        props: { ...props, occurred_at: occurredAt },
      });
      this.prune();
      await this.persist();
    }
    void this.flush();
  }

  async flush() {
    await this.ready;
    if (this.running || this.disposed) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.running = true;
    try {
      this.prune();
      while (this.options.online?.() !== false && !this.disposed) {
        const entry = this.pending.find(
          item => item.scope === this.options.scope()
        );
        if (!entry) break;
        try {
          await this.options.send(entry.props, entry.scope);
        } catch {
          break;
        }
        this.pending = this.pending.filter(item => item !== entry);
        await this.persist();
      }
    } finally {
      this.running = false;
      if (!this.disposed && this.pending.length) {
        this.timer = setTimeout(() => {
          void this.flush();
        }, RETRY_MS);
      }
    }
  }

  dispose() {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
  }
}

export type BehaviorValue = string | number | boolean | undefined;
export type BehaviorProps = Record<string, BehaviorValue>;
export type CoreActionType =
  | 'resource_add'
  | 'resource_read'
  | 'resource_edit'
  | 'ai_conversation'
  | 'annotation_comment'
  | 'document_comment';
export interface BehaviorAction {
  action_id: string;
  action_type: CoreActionType;
  action_started_at: string;
}
export interface BehaviorDependencies {
  id: () => string;
  now: () => number;
  monotonic: () => number;
  send: (name: string, props: BehaviorProps) => void;
  enabled?: () => boolean;
}
export interface VisitOptions {
  scope:
    | 'global'
    | 'resource'
    | 'editor'
    | 'conversation'
    | 'onboarding'
    | 'surface';
  target: string;
  props?: BehaviorProps;
  exposure?: boolean;
  reading?: boolean;
}
const ALLOWED_FIELDS = new Set([
  'scope',
  'target',
  'page_key',
  'page_view_id',
  'exposure_id',
  'activation_id',
  'segment_id',
  'started_at',
  'ended_at',
  'duration_ms',
  'business_date',
  'reason',
  'action_id',
  'action_type',
  'action_started_at',
  'origin_platform',
  'status',
  'result_source',
  'resource_id',
  'resource_type',
  'entry',
  'source',
  'enabled',
  'location',
  'space_type',
  'app_id',
  'surface',
  'origin',
  'page',
  'scene',
  'state',
  'failure_reason',
  'attempt_id',
  'has_input',
  'conversation_id',
]);
const DAY = 86_400_000;
const OFFSET = 8 * 3_600_000;
export function behaviorDay(at: number) {
  return new Date(at + OFFSET).toISOString().slice(0, 10);
}
function nextDay(at: number) {
  return (Math.floor((at + OFFSET) / DAY) + 1) * DAY - OFFSET;
}

/** Owns identifiers and event time; platform adapters own visibility and delivery. */
export class BehaviorTracker {
  readonly visits = new Set<BehaviorVisit>();
  markEditorInput(resourceId: string) {
    this.visits.forEach(visit => visit.input(resourceId));
  }
  constructor(readonly dependencies: BehaviorDependencies) {}
  emit(
    name: string,
    props: BehaviorProps,
    occurredAt = this.dependencies.now()
  ) {
    if (this.dependencies.enabled?.() === false) return;
    if (props.target === 'resource_creation_entry') {
      const entry = String(props.entry || '');
      const resourceType =
        entry === 'create_smart_folder'
          ? 'smart_folder'
          : entry === 'create_rss_folder'
            ? 'rss_folder'
            : entry === 'create_folder'
              ? 'folder'
              : ['upload_file', 'file', 'photo', 'record'].includes(entry)
                ? 'file'
                : 'doc';
      props = {
        source: props.location,
        resource_type: resourceType,
        enabled: true,
        ...props,
      };
    }
    props = { page_key: props.target, ...props };
    const safe = Object.fromEntries(
      Object.entries(props).filter(
        ([key, value]) =>
          ALLOWED_FIELDS.has(key) &&
          (value === undefined ||
            typeof value === 'boolean' ||
            (typeof value === 'number' && Number.isFinite(value)) ||
            (typeof value === 'string' && value.length <= 256))
      )
    );
    try {
      this.dependencies.send(name, {
        ...(name === 'ui_exposure' && !safe.exposure_id
          ? { exposure_id: this.dependencies.id() }
          : {}),
        ...safe,
        schema_version: 1,
        event_id: this.dependencies.id(),
        occurred_at: new Date(occurredAt).toISOString(),
      });
    } catch {
      /* Telemetry cannot interrupt product work. */
    }
  }
  startAction(
    actionType: CoreActionType,
    props: BehaviorProps = {},
    at = this.dependencies.now()
  ): BehaviorAction {
    const action = {
      action_id: this.dependencies.id(),
      action_type: actionType,
      action_started_at: new Date(at).toISOString(),
    };
    this.emit('core_action_start', { ...props, ...action }, at);
    return action;
  }
  visit(options: VisitOptions) {
    const visit = new BehaviorVisit(this, options);
    this.visits.add(visit);
    return visit;
  }
}

export class BehaviorVisit {
  readonly pageViewId: string;
  private lastWall: number;
  private lastMono: number;
  private segmentStart: number;
  private pending = 0;
  private dailyRead = 0;
  private readReported = false;
  private hasInput = false;
  private closed = false;
  private paused = false;
  constructor(
    private tracker: BehaviorTracker,
    private options: VisitOptions
  ) {
    const d = tracker.dependencies;
    this.pageViewId = d.id();
    this.lastWall = this.segmentStart = d.now();
    this.lastMono = d.monotonic();
    if (options.exposure !== false)
      tracker.emit(
        'ui_exposure',
        {
          ...options.props,
          scope: options.scope,
          target: options.target,
          page_view_id: this.pageViewId,
          exposure_id: d.id(),
        },
        this.lastWall
      );
  }
  input(resourceId: string) {
    if (
      this.closed ||
      this.options.scope !== 'editor' ||
      this.options.props?.resource_id !== resourceId ||
      this.hasInput
    )
      return;
    this.tick('input');
    this.flush('input', this.lastWall);
    this.hasInput = true;
  }
  private props() {
    return {
      ...(this.options.scope === 'editor' ? { has_input: this.hasInput } : {}),
      ...this.options.props,
      scope: this.options.scope,
      target: this.options.target,
      page_view_id: this.pageViewId,
    };
  }
  private flush(reason: string, end: number) {
    if (this.pending <= 0) return;
    this.tracker.emit(
      'active_duration',
      {
        ...this.props(),
        segment_id: this.tracker.dependencies.id(),
        started_at: new Date(this.segmentStart).toISOString(),
        ended_at: new Date(end).toISOString(),
        duration_ms: Math.round(this.pending),
        business_date: behaviorDay(this.segmentStart),
        reason,
      },
      end
    );
    this.pending = 0;
    this.segmentStart = end;
  }
  tick(reason = 'heartbeat') {
    if (this.closed || this.paused) return;
    const d = this.tracker.dependencies;
    const mono = d.monotonic();
    const elapsed = Math.max(0, mono - this.lastMono);
    const end = this.lastWall + elapsed;
    let cursor = this.lastWall;
    while (cursor < end) {
      const boundary = nextDay(cursor);
      const until = Math.min(end, boundary);
      const ms = until - cursor;
      this.pending += ms;
      const readBefore = this.dailyRead;
      this.dailyRead += ms;
      if (
        this.options.reading &&
        !this.readReported &&
        this.dailyRead > 10_000
      ) {
        this.readReported = true;
        const qualifiedAt = Math.min(
          until,
          cursor + Math.max(0, 10_001 - readBefore)
        );
        const action = this.tracker.startAction(
          'resource_read',
          this.props(),
          qualifiedAt
        );
        this.tracker.emit(
          'core_action_result',
          {
            ...this.props(),
            ...action,
            status: 'success',
            result_source: 'visible_reading',
          },
          qualifiedAt
        );
      }
      if (until === boundary) {
        this.flush('midnight', until);
        this.dailyRead = 0;
        this.readReported = false;
      }
      cursor = until;
    }
    this.lastMono = mono;
    this.lastWall = end;
    if (this.pending >= 30_000 || reason !== 'heartbeat')
      this.flush(reason, end);
  }
  pause(reason = 'background') {
    if (this.closed || this.paused) return;
    this.tick(reason);
    this.paused = true;
  }
  resume() {
    if (this.closed || !this.paused) return;
    const d = this.tracker.dependencies;
    const now = d.now();
    if (behaviorDay(now) !== behaviorDay(this.lastWall)) {
      this.dailyRead = 0;
      this.readReported = false;
    }
    this.lastWall = this.segmentStart = now;
    this.lastMono = d.monotonic();
    this.paused = false;
    if (this.options.exposure !== false)
      this.tracker.emit(
        'ui_exposure',
        { ...this.props(), exposure_id: d.id() },
        now
      );
  }
  discard() {
    this.closed = true;
    this.tracker.visits.delete(this);
  }
  close(reason = 'navigation') {
    if (this.closed) return;
    this.tick(reason);
    this.closed = true;
    this.tracker.visits.delete(this);
  }
}

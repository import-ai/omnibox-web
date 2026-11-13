import assert from 'node:assert/strict';

import { behaviorDay, BehaviorTracker } from './behaviorEngine';
function fixture(wall = Date.parse('2026-11-11T15:59:40Z')) {
  let now = wall,
    mono = 0,
    sequence = 0;
  const events: { name: string; props: Record<string, unknown> }[] = [];
  const tracker = new BehaviorTracker({
    id: () => `id-${++sequence}`,
    now: () => now,
    monotonic: () => mono,
    send: (name, props) => events.push({ name, props }),
  });
  return {
    events,
    tracker,
    advance: (ms: number) => {
      now += ms;
      mono += ms;
    },
    jump: (ms: number) => {
      now += ms;
    },
  };
}
describe('non-button behavior lifecycle', () => {
  it('records one exposure and ignores repeated cleanup', () => {
    const f = fixture();
    const v = f.tracker.visit({ scope: 'surface', target: 'settings' });
    f.advance(500);
    v.close();
    v.close();
    assert.equal(f.events.filter(e => e.name === 'ui_exposure').length, 1);
    assert.equal(f.events.filter(e => e.name === 'active_duration').length, 1);
    assert.equal(
      f.events.find(e => e.name === 'active_duration')!.props.duration_ms,
      500
    );
  });
  it('qualifies reading strictly above ten seconds, once per day', () => {
    const f = fixture();
    const v = f.tracker.visit({
      scope: 'resource',
      target: 'detail',
      reading: true,
    });
    f.advance(10_000);
    v.tick();
    assert.equal(
      f.events.filter(e => e.name === 'core_action_start').length,
      0
    );
    f.advance(100);
    v.tick();
    v.tick();
    assert.equal(
      f.events.filter(e => e.name === 'core_action_start').length,
      1
    );
    const [start, result] = f.events.filter(e =>
      e.name.startsWith('core_action_')
    );
    assert.equal(start.props.action_id, result.props.action_id);
    assert.equal(result.props.status, 'success');
  });
  it('pauses background time while retaining a resource reading visit', () => {
    const f = fixture(Date.parse('2026-11-11T00:00:00Z'));
    const v = f.tracker.visit({
      scope: 'resource',
      target: 'detail',
      reading: true,
    });
    f.advance(5_000);
    v.pause();
    f.advance(5 * 60_000);
    v.tick();
    assert.equal(
      f.events.filter(e => e.name === 'core_action_start').length,
      0
    );
    v.resume();
    f.advance(5_100);
    v.close();
    const durations = f.events.filter(e => e.name === 'active_duration');
    assert.equal(
      durations.reduce((sum, e) => sum + Number(e.props.duration_ms), 0),
      10_100
    );
    assert.equal(
      f.events.filter(e => e.name === 'core_action_start').length,
      1
    );
    const ids = f.events
      .filter(e => e.name === 'ui_exposure')
      .map(e => e.props.exposure_id);
    assert.equal(new Set(ids).size, 2);
  });
  it('splits midnight and qualifies a new day only after new visible reading', () => {
    const f = fixture();
    const v = f.tracker.visit({
      scope: 'resource',
      target: 'detail',
      reading: true,
    });
    f.advance(25_000);
    v.tick();
    const starts = () => f.events.filter(e => e.name === 'core_action_start');
    assert.equal(starts().length, 1);
    assert.equal(
      behaviorDay(Date.parse(String(starts()[0].props.action_started_at))),
      '2026-11-11'
    );
    f.advance(5_000);
    v.tick();
    assert.equal(starts().length, 1);
    f.advance(100);
    v.close();
    assert.equal(starts().length, 2);
    assert.equal(
      behaviorDay(Date.parse(String(starts()[1].props.action_started_at))),
      '2026-11-12'
    );
    const durations = f.events.filter(e => e.name === 'active_duration');
    assert.deepEqual(
      durations.map(e => [e.props.business_date, e.props.duration_ms]),
      [
        ['2026-11-11', 20_000],
        ['2026-11-12', 10_100],
      ]
    );
  });
  it('does not turn midnight while backgrounded into a new core action', () => {
    const f = fixture();
    const v = f.tracker.visit({
      scope: 'resource',
      target: 'detail',
      reading: true,
    });
    f.advance(11_000);
    v.pause();
    f.advance(120_000);
    v.resume();
    f.advance(5_000);
    v.close();
    assert.equal(
      f.events.filter(e => e.name === 'core_action_start').length,
      1
    );
  });
  it('uses incremental heartbeat segments and monotonic time', () => {
    const f = fixture(Date.parse('2026-11-11T00:00:00Z'));
    const v = f.tracker.visit({
      scope: 'global',
      target: 'app',
      exposure: false,
    });
    f.advance(30_000);
    v.tick();
    f.jump(-60_000);
    f.advance(30_000);
    v.tick();
    f.advance(200);
    v.close();
    assert.deepEqual(
      f.events.map(e => e.props.duration_ms),
      [30_000, 30_000, 200]
    );
    assert.equal(new Set(f.events.map(e => e.props.segment_id)).size, 3);
  });
  it('keeps initiation time distinct from later occurrence and generates independent actions', () => {
    const f = fixture();
    const a = f.tracker.startAction('ai_conversation');
    f.advance(120_000);
    const b = f.tracker.startAction('ai_conversation');
    assert.notEqual(a.action_id, b.action_id);
    assert.equal(a.action_started_at, '2026-11-11T15:59:40.000Z');
    assert.equal(b.action_started_at, '2026-11-11T16:01:40.000Z');
    assert.equal(new Set(f.events.map(e => e.props.event_id)).size, 2);
  });
});

it('splits editor dwell at the first real input and releases every completed visit', () => {
  const f = fixture();
  const visit = f.tracker.visit({
    scope: 'editor',
    target: 'resource_detail',
    props: { resource_id: 'resource' },
  });
  f.advance(5000);
  f.tracker.markEditorInput('resource');
  f.advance(3000);
  visit.close();
  const durations = f.events
    .filter(event => event.name === 'active_duration')
    .map(event => event.props);
  assert.deepEqual(
    durations.map(props => [props.duration_ms, props.has_input]),
    [
      [5000, false],
      [3000, true],
    ]
  );
  assert.equal(f.tracker.visits.size, 0);
});
it('drops unexpected dimensions and does not let telemetry transport failures break product work', () => {
  const f = fixture();
  f.tracker.emit('input_activation', {
    target: 'composer',
    content: 'private',
    url: 'private',
    token: 'private',
  });
  assert.equal(f.events[0].props.content, undefined);
  const tracker = new BehaviorTracker({
    id: () => 'id',
    now: () => 0,
    monotonic: () => 0,
    send: () => {
      throw new Error('telemetry');
    },
  });
  assert.doesNotThrow(() => tracker.startAction('resource_add'));
});

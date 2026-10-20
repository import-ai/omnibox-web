import { mentionNamesForDisplay, resolveMentionLabels } from './mentionLabels';

const names = { u1: 'Lizhi（Alice）', u2: 'Bob' };

describe('resolveMentionLabels', () => {
  it('rewrites mention labels from the current member map', () => {
    expect(
      resolveMentionLabels('See [@ id="u1" label="Alice"] later', names)
    ).toBe('See [@ id="u1" label="Lizhi（Alice）"] later');
  });

  it('keeps the original label when the member is gone', () => {
    expect(resolveMentionLabels('See [@ id="gone" label="Old"]', names)).toBe(
      'See [@ id="gone" label="Old"]'
    );
  });

  it('does not rewrite mentions inside fenced or inline code', () => {
    const markdown = [
      'Intro [@ id="u1" label="Alice"]',
      '```',
      '[@ id="u1" label="Alice"]',
      '```',
      'Inline `[@ id="u1" label="Alice"]`',
    ].join('\n');

    expect(resolveMentionLabels(markdown, names)).toBe(
      [
        'Intro [@ id="u1" label="Lizhi（Alice）"]',
        '```',
        '[@ id="u1" label="Alice"]',
        '```',
        'Inline `[@ id="u1" label="Alice"]`',
      ].join('\n')
    );
  });

  it('adds a label when the shortcode only has an id', () => {
    expect(resolveMentionLabels('[@ id="u2"]', names)).toBe(
      '[@ id="u2" label="Bob"]'
    );
  });

  it('canonicalizes attribute order when rewriting a label', () => {
    expect(resolveMentionLabels('[@ label="Alice" id="u1"]', names)).toBe(
      '[@ id="u1" label="Lizhi（Alice）"]'
    );
  });

  it('returns the original markdown when nothing should change', () => {
    const markdown = 'Hello [@ id="u2" label="Bob"]';
    expect(resolveMentionLabels(markdown, names)).toBe(markdown);
    expect(resolveMentionLabels(markdown, {})).toBe(markdown);
  });
});

describe('mentionNamesForDisplay', () => {
  it('keeps the last shown name after the member leaves and updates it on return', () => {
    const namespaceId = 'ns-freeze-labels';
    expect(mentionNamesForDisplay(namespaceId, { u1: 'Live' })).toEqual({
      u1: 'Live',
    });
    const frozen = mentionNamesForDisplay(namespaceId, {});
    expect(resolveMentionLabels('[@ id="u1" label="Old"]', frozen)).toBe(
      '[@ id="u1" label="Live"]'
    );
    const returned = mentionNamesForDisplay(namespaceId, { u1: 'Back' });
    expect(resolveMentionLabels('[@ id="u1" label="Old"]', returned)).toBe(
      '[@ id="u1" label="Back"]'
    );
    expect(mentionNamesForDisplay('ns-freeze-other', {})).toEqual({});
    expect(mentionNamesForDisplay('', { u1: 'Skip' })).toEqual({ u1: 'Skip' });
  });
});

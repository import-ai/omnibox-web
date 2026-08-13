import { resolveCitationTarget } from './citationTarget';

const resourceId = 'Abcd1234Efgh5678';

describe('resolveCitationTarget', () => {
  it.each([
    resourceId,
    `#${resourceId}`,
    `../${resourceId}`,
    `/namespace-a/${resourceId}`,
  ])('resolves an internal resource from %s', link => {
    expect(resolveCitationTarget(link, 'namespace-a')).toEqual({
      kind: 'resource',
      resourceId,
    });
  });

  it('resolves an absolute app URL for the current namespace as a resource', () => {
    expect(
      resolveCitationTarget(
        `https://app.omnibox.test/namespace-a/${resourceId}`,
        'namespace-a',
        { currentOrigin: 'https://app.omnibox.test' }
      )
    ).toEqual({
      kind: 'resource',
      resourceId,
    });
  });

  it('keeps an absolute URL from another namespace as external', () => {
    expect(
      resolveCitationTarget(
        `https://app.omnibox.test/namespace-b/${resourceId}`,
        'namespace-a',
        { currentOrigin: 'https://app.omnibox.test' }
      )
    ).toEqual({
      kind: 'external',
      href: `https://app.omnibox.test/namespace-b/${resourceId}`,
    });
  });

  it('keeps an absolute same-path URL from another host as external', () => {
    expect(
      resolveCitationTarget(
        `https://evil.example/namespace-a/${resourceId}`,
        'namespace-a',
        { currentOrigin: 'https://app.omnibox.test' }
      )
    ).toEqual({
      kind: 'external',
      href: `https://evil.example/namespace-a/${resourceId}`,
    });
  });

  it('keeps an external URL as an external target', () => {
    expect(
      resolveCitationTarget('https://example.com/article', 'namespace-a')
    ).toEqual({
      kind: 'external',
      href: 'https://example.com/article',
    });
  });

  it('does not treat a resource from another namespace as internal', () => {
    expect(
      resolveCitationTarget(`/namespace-b/${resourceId}`, 'namespace-a')
    ).toEqual({
      kind: 'external',
      href: `/namespace-b/${resourceId}`,
    });
  });

  it('returns unavailable for an empty link', () => {
    expect(resolveCitationTarget('', 'namespace-a')).toEqual({
      kind: 'unavailable',
    });
  });

  it.each([
    'javascript:alert(document.domain)',
    'data:text/html,<script>alert(1)</script>',
    'file:///etc/passwd',
  ])('rejects unsafe external protocol in %s', link => {
    expect(resolveCitationTarget(link, 'namespace-a')).toEqual({
      kind: 'unavailable',
    });
  });
});

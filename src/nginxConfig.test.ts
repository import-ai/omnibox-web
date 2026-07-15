import { readFileSync } from 'node:fs';

const config = readFileSync('nginx.conf.template', 'utf8');

function patterns(pattern: RegExp) {
  return [...config.matchAll(pattern)].map(match => new RegExp(match[1], 'i'));
}

const spaRoutes = patterns(/"~\*(\^.*\$)" 1;/g);
const seoRoutes = patterns(/location ~\* "(\^.*\$)"/g);

describe('nginx routes', () => {
  it('preserves case-insensitive routes and sends trailing-slash SEO paths upstream', () => {
    expect(spaRoutes.some(pattern => pattern.test('/User/Login/'))).toBe(true);
    expect(spaRoutes.some(pattern => pattern.test('/Ab3xYz/Chat/42/'))).toBe(
      true
    );
    expect(seoRoutes.some(pattern => pattern.test('/S/Ab3xYz90Qw/'))).toBe(
      true
    );
    expect(
      seoRoutes.some(pattern => pattern.test('/Ab3xYz/0123456789AbCdEf/'))
    ).toBe(true);
    expect(
      spaRoutes.some(pattern => pattern.test('/definitely-not-real-48392'))
    ).toBe(false);
  });
});

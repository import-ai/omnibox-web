import { readFileSync } from 'node:fs';

const config = readFileSync('nginx.conf.template', 'utf8');
const notFoundPage = readFileSync('public/404.html', 'utf8');

function patterns(pattern: RegExp) {
  return [...config.matchAll(pattern)].map(match => new RegExp(match[1], 'i'));
}

const spaRoutes = patterns(/"~\*(\^.*\$)" 1;/g);
const seoRoutes = patterns(/location ~\* "(\^.*\$)"/g);

describe('nginx routes', () => {
  it('whitelists every non-root browser entry route', () => {
    const routes = [
      '/welcome',
      '/oauth/authorize',
      '/user/login',
      '/user/auth/confirm',
      '/user/auth/miniprogram',
      '/user/auth/confirm/google',
      '/user/sign-up',
      '/user/verify-otp',
      '/user/accept-invite',
      '/user/account/delete/confirm',
      '/invite/confirm',
      '/invite/Ab3xYz/Cd4pQr',
      '/Ab3xYz',
      '/Ab3xYz/0123456789AbCdEf',
      '/Ab3xYz/0123456789AbCdEf/edit',
      '/Ab3xYz/chat',
      '/Ab3xYz/chat/conversations',
      '/Ab3xYz/chat/550e8400-e29b-41d4-a716-446655440000',
      '/s/Ab3xYz90Qw',
      '/s/Ab3xYz90Qw/0123456789AbCdEf',
      '/s/Ab3xYz90Qw/chat',
      '/s/Ab3xYz90Qw/chat/550e8400-e29b-41d4-a716-446655440000',
    ];

    expect(
      routes
        .flatMap(route => [route, `${route}/`])
        .filter(route => !spaRoutes.some(pattern => pattern.test(route)))
    ).toEqual([]);
    expect(spaRoutes.some(pattern => pattern.test('/User/Login/'))).toBe(true);
  });

  it('sends trailing-slash SEO paths upstream', () => {
    expect(seoRoutes.some(pattern => pattern.test('/S/Ab3xYz90Qw/'))).toBe(
      true
    );
    expect(
      seoRoutes.some(pattern => pattern.test('/Ab3xYz/0123456789AbCdEf/'))
    ).toBe(true);
  });

  it('rejects unknown URL shapes', () => {
    expect(
      spaRoutes.some(pattern => pattern.test('/not-a-browser-route'))
    ).toBe(false);
    expect(config).toContain('error_page 404 /404.html;');
    expect(config).toContain('location = /404.html');
    expect(notFoundPage).toContain('/images/deleteIcon.png');
    expect(notFoundPage).toContain('href="/"');
    expect(notFoundPage).toContain("localStorage.getItem('i18nextLng')");
    expect(notFoundPage).toContain('404 页面未找到');
  });
});

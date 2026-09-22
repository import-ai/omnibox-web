import { renderToStaticMarkup } from 'react-dom/server';

import { Header } from './Header';

const useTranslationMock = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => useTranslationMock(),
}));

jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/namespace-1/chat' }),
}));

jest.mock('@/hooks/useIsTouch', () => ({
  useIsTouch: () => false,
}));

jest.mock('@/components/notification/hooks/useNotifications', () => ({
  useNotificationUnreadCount: () => 0,
}));

jest.mock('@/page/search', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/invite-dialog/ActionDialog', () => ({
  __esModule: true,
  default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

jest.mock('@/components/notification', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/assets/icons/ChatIcon', () => ({
  ChatIcon: () => <svg data-testid="chat-icon" />,
}));

jest.mock('@/components/ui/Sidebar', () => ({
  SidebarMenu: ({ children }: React.PropsWithChildren) => <nav>{children}</nav>,
  SidebarMenuItem: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
  ),
  SidebarMenuButton: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('@/components/tooltip', () => ({
  TooltipProvider: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
  TooltipContent: ({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
}));

function renderHeader(language: string): string {
  useTranslationMock.mockReturnValue({
    i18n: { language },
    t: (key: string) => key,
  });
  return renderToStaticMarkup(
    <Header onActiveKey={jest.fn()} onSearch={jest.fn()} />
  );
}

describe('Header', () => {
  beforeEach(() => {
    useTranslationMock.mockReset();
  });

  it('opens the Chinese download page from the community entry', () => {
    const html = renderHeader('zh-CN');

    expect(html).toContain('href="/zh-cn/download/"');
    expect(html).toContain('lucide-download');
    expect(html).toContain('download_app');
    expect(html).not.toContain('download_app_qr_title');
    expect(html).not.toContain('download_app_qr_brand');
    expect(html.indexOf('download_app')).toBeLessThan(
      html.indexOf('notification_modal.tags.community')
    );
    expect(html.indexOf('notification_modal.tags.community')).toBeLessThan(
      html.indexOf('inviteReferral.homeEntry')
    );
    expect(html).toContain('lucide-gift');
  });

  it('opens the English download page when the UI language is English', () => {
    const html = renderHeader('en-US');

    expect(html).toContain('href="/en/download/"');
    expect(html).not.toContain('href="/zh-cn/download/"');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';

import { TooltipProvider } from '@/components/tooltip';
import { NamespaceTier } from '@/interface';

import { FooterSidebar } from './FooterSidebar';

const mockTranslate = jest.fn((key: string) => key);

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh-CN' },
    t: mockTranslate,
  }),
}));

jest.mock('@/assets/icons/WechatGroupQrCode', () => ({
  WechatGroupQrCode: () => <svg data-testid="wechat-qr-code" />,
}));

jest.mock('@/components/ui/Sidebar', () => ({
  SidebarFooter: ({ children }: React.PropsWithChildren) => (
    <footer>{children}</footer>
  ),
}));

jest.mock('@/const', () => ({
  DISCORD_LINK: 'https://discord.example.com',
}));

function renderFooter(
  props: React.ComponentProps<typeof FooterSidebar>
): string {
  return renderToStaticMarkup(
    <TooltipProvider>
      <FooterSidebar {...props} />
    </TooltipProvider>
  );
}

describe('FooterSidebar', () => {
  beforeEach(() => {
    mockTranslate.mockClear();
  });

  it('renders the blue upgrade entry for expired premium spaces', () => {
    const html = renderFooter({
      commercial: true,
      currentNamespace: {
        id: 'namespace-1',
        name: 'Premium space',
        tier: NamespaceTier.PREMIUM,
        expired: true,
      },
      namespaceId: 'namespace-1',
    });

    expect(html).toContain('href="/zh-cn/pricing?namespace=namespace-1"');
    expect(html).toContain('text-blue-500');
    expect(mockTranslate).toHaveBeenCalledWith('footer.upgrade');
    expect(html).not.toContain('href="/community/"');
  });

  it('renders the neutral crown and renew copy for active premium spaces', () => {
    const html = renderFooter({
      commercial: true,
      currentNamespace: {
        id: 'namespace-1',
        name: 'Premium space',
        tier: NamespaceTier.PREMIUM,
        expired: false,
      },
      namespaceId: 'namespace-1',
    });

    expect(html).toContain('href="/zh-cn/pricing?namespace=namespace-1"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).not.toContain('text-blue-500');
    expect(mockTranslate).toHaveBeenCalledWith('footer.renew');
  });

  it('renders the blue upgrade icon and upgrade copy for basic spaces', () => {
    const html = renderFooter({
      commercial: true,
      currentNamespace: {
        id: 'namespace-1',
        name: 'Basic space',
        tier: NamespaceTier.BASIC,
      },
      namespaceId: 'namespace-1',
    });

    expect(html).toContain('text-blue-500');
    expect(html).toContain(
      '<circle cx="12" cy="12" r="12" fill="currentColor"></circle>'
    );
    expect(mockTranslate).toHaveBeenCalledWith('footer.upgrade');
  });

  it('updates the namespace included in the pricing link', () => {
    const html = renderFooter({
      commercial: true,
      currentNamespace: {
        id: 'namespace-2',
        name: 'Basic space',
        tier: NamespaceTier.BASIC,
      },
      namespaceId: 'namespace-2',
    });

    expect(html).toContain('href="/zh-cn/pricing?namespace=namespace-2"');
  });

  it('keeps feedback for non-commercial deployments', () => {
    const html = renderFooter({
      commercial: false,
      namespaceId: 'namespace-1',
    });

    expect(html).toContain('href="/community/"');
    expect(html).toContain('lucide-message-circle-warning');
    expect(html).not.toContain('/pricing?namespace=');
  });

  it('keeps the pricing slot empty while namespace data is unavailable', () => {
    const html = renderFooter({
      commercial: true,
      namespaceId: 'namespace-1',
    });

    expect(html).toContain('<span aria-hidden="true" class="size-8"></span>');
    expect(html).not.toContain('/pricing?namespace=');
    expect(mockTranslate).not.toHaveBeenCalledWith('footer.upgrade');
    expect(mockTranslate).not.toHaveBeenCalledWith('footer.renew');
  });
});

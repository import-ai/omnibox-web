import { renderToStaticMarkup } from 'react-dom/server';

import { TooltipProvider } from '@/components/tooltip';
import { NamespaceTier } from '@/interface';

import { FooterSidebar } from './FooterSidebar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh-CN' },
    t: (key: string) => key,
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
  it('renders the localized pricing link for commercial deployments', () => {
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
    expect(html).not.toContain('href="/community/"');
  });

  it('updates the namespace included in the pricing link', () => {
    const html = renderFooter({
      commercial: true,
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
});

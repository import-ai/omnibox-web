import {
  CircleHelp,
  MessageCircleWarning,
  MessagesSquare,
  Smartphone,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { CrownIcon } from '@/assets/icons/CrownIcon';
import { UpgradeIcon } from '@/assets/icons/UpgradeIcon';
import { IconButton } from '@/components/omnibox/IconButton';
import { SidebarFooter } from '@/components/ui/Sidebar';
import useApp from '@/hooks/useApp';
import type { Namespace } from '@/interface';
import { getUpgradeLink } from '@/lib/upgradeLink';

import { getPricingEntryVariant } from './pricingEntry';

interface IProps {
  commercial?: boolean;
  currentNamespace?: Namespace;
  namespaceId: string;
}

type FooterEntry = {
  key: string;
  icon: ReactNode;
  label: string;
} & ({ href: string; onClick?: never } | { href?: never; onClick: () => void });

export function FooterSidebar(props: IProps) {
  const { commercial, currentNamespace, namespaceId } = props;
  const { t, i18n } = useTranslation();
  const app = useApp();
  const pricingEntryVariant = getPricingEntryVariant(currentNamespace);
  const pricingOrFeedbackEntry =
    commercial === false
      ? {
          key: 'feedback',
          icon: <MessageCircleWarning />,
          label: t('footer.feedback'),
          href: '/community/',
        }
      : pricingEntryVariant
        ? {
            key: 'pricing',
            icon:
              pricingEntryVariant === 'upgrade' ? (
                <UpgradeIcon className="text-blue-500" />
              ) : (
                <CrownIcon />
              ),
            label: t(`footer.${pricingEntryVariant}`),
            href: getUpgradeLink(i18n, namespaceId, 'sidebar_footer'),
          }
        : undefined;

  const footerEntries: FooterEntry[] = [
    {
      key: 'docs',
      icon: <CircleHelp />,
      label: t('footer.docs'),
      href: `/docs/${i18n.language.includes('zh') ? 'zh-cn/' : ''}`,
    },
    {
      key: 'contact',
      icon: <MessagesSquare />,
      label: t('footer.contact'),
      onClick: () => app.fire('open_settings', { tab: 'contact' }),
    },
    {
      key: 'download',
      icon: <Smartphone />,
      label: t('footer.download_app'),
      href: `/${i18n.language.startsWith('zh') ? 'zh-cn' : 'en'}/download/`,
    },
    ...(pricingOrFeedbackEntry ? [pricingOrFeedbackEntry] : []),
  ];

  return (
    <SidebarFooter className="flex-row flex-wrap items-center justify-around gap-6 px-6 pb-2">
      {footerEntries.map(item => (
        <IconButton
          key={item.key}
          label={item.label}
          trackName={
            {
              docs: 'sidebar_docs_open',
              contact: 'sidebar_contact_open',
              download: 'sidebar_app_open',
              feedback: 'sidebar_feedback_open',
              pricing: 'sidebar_plan_upgrade',
            }[item.key]
          }
          tone="sidebar"
          className="size-8 cursor-pointer px-0 [&_svg]:size-5!"
          asChild={Boolean(item.href)}
          onClick={item.onClick}
        >
          {item.href ? (
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              {item.icon}
            </a>
          ) : (
            item.icon
          )}
        </IconButton>
      ))}
      {!pricingOrFeedbackEntry && <span aria-hidden className="size-8" />}
    </SidebarFooter>
  );
}

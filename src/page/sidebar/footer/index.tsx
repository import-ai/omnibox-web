import { RiDiscordLine } from '@remixicon/react';
import { CircleHelp, MessageCircleWarning } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { SidebarFooter } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DISCORD_LINK } from '@/const';

import { WechatGroupQrCode } from './QrCode';
import { Wechat } from './Wechat';

export function FooterSidebar() {
  const { t, i18n } = useTranslation();

  return (
    <SidebarFooter className="flex-row flex-wrap items-center justify-around px-6 pb-2 gap-6">
      {[
        {
          icon: <CircleHelp />,
          label: t('footer.docs'),
          value: '/docs/',
        },
        {
          icon: <RiDiscordLine />,
          label: t('footer.discord'),
          value: DISCORD_LINK,
        },
        {
          icon: <Wechat />,
          label: t('footer.wechat'),
          value: '/wechat',
        },
        {
          icon: <MessageCircleWarning />,
          label: t('footer.feedback'),
          value: '/feedback',
        },
      ].map(item =>
        item.value === '/wechat' ? (
          <Tooltip key={item.value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-0 size-8 [&_svg]:size-5 [&_svg]:scale-[1.3] text-neutral-400 hover:text-neutral-400 hover:bg-[#E8E8EE] dark:hover:bg-accent"
              >
                {item.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-white w-[178px] px-[22px] pt-[22px] pb-[16px] rounded-[12px] shadow-sm border border-[#E0E0E0]">
              <WechatGroupQrCode />
              <p className="text-neutral-400 text-center p-0 mt-2 text-[14px] font-[500]">
                {t('footer.join')}
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip key={item.value}>
            <TooltipTrigger asChild>
              <a
                href={`${item.value}${item.value === '/docs/' && i18n.language.includes('zh') ? 'zh-cn/' : ''}`}
                target="_blank"
                className="!text-neutral-400"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0 size-8 [&_svg]:size-5 hover:text-neutral-400 hover:bg-[#E8E8EE] dark:hover:bg-accent"
                >
                  {item.icon}
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>{item.label}</TooltipContent>
          </Tooltip>
        )
      )}
    </SidebarFooter>
  );
}

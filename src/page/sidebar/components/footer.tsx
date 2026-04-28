import { RiDiscordLine } from '@remixicon/react';
import { CircleHelp, MessageCircleWarning } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { WechatGroupQrCode } from '@/assets/icons/wechat-qr-code';
import { Wechat } from '@/assets/icons/wechat-stroke';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import { SidebarFooter } from '@/components/ui/sidebar';
import { DISCORD_LINK } from '@/const';

export function FooterSidebar() {
  const { t, i18n } = useTranslation();

  return (
    <SidebarFooter className="flex-row flex-wrap items-center justify-around gap-6 px-6 pb-2">
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
          value: '/community/',
        },
      ].map(item =>
        item.value === '/wechat' ? (
          <Tooltip key={item.value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 px-0 text-neutral-400 hover:bg-[#E8E8EE] hover:text-neutral-400 dark:hover:bg-accent [&_svg]:size-5 [&_svg]:scale-[1.3]"
              >
                {item.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="w-[178px] rounded-xl border-none px-[22px] pb-4 pt-[22px] shadow-sm">
              <WechatGroupQrCode />
              <p className="mt-2 p-0 text-center">{t('footer.join')}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip key={item.value}>
            <TooltipTrigger asChild>
              <a
                href={`${item.value}${item.value === '/docs/' && i18n.language.includes('zh') ? 'zh-cn/' : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="!text-neutral-400"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 px-0 hover:bg-[#E8E8EE] hover:text-neutral-400 dark:hover:bg-accent [&_svg]:size-5"
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

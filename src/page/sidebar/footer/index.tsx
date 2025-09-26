import { Button } from '@/components/ui/button';
import { SidebarFooter } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { Discord } from './Discord';
import { Docs } from './Docs';
import { Feedback } from './Feedback';
import { QrCode } from './Qrcode';
import { Wechat } from './Wechat';

export function FooterSidebar() {
  return (
    <SidebarFooter className="flex-row flex-wrap items-center justify-around px-[24px] pb-[14px] gap-[24px]">
      {[
        {
          icon: <Docs />,
          label: '帮助文档',
          value: '/docs',
        },
        {
          icon: <Discord />,
          label: 'Discord',
          value: 'https://discord.gg/Uc2HneCC',
        },
        {
          icon: <Wechat />,
          label: '二维码',
          value: '/wechat',
        },
        {
          icon: <Feedback />,
          label: '意见反馈',
          value: '/feedback',
        },
      ].map(item =>
        item.value === '/wechat' ? (
          <Tooltip key={item.value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="px-0 size-[32px] [&_svg]:size-[20px] [&_svg]:scale-[1.3] text-[#8F959E]"
              >
                {item.icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-white w-[178px] px-[22px] pt-[22px] pb-[16px] rounded-[12px] shadow-sm border border-[#E0E0E0]">
              <QrCode />
              <p className="text-[#8F959E] text-center p-0 mt-[8px] text-[14px] font-[500]">
                诚邀您加入种子群
              </p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip key={item.value}>
            <TooltipTrigger asChild>
              <a href={item.value} target="_blank" className="text-[#8F959E]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-0 size-[32px] [&_svg]:size-[20px]"
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

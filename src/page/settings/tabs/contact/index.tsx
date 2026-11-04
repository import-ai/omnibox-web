import { RiDiscordLine } from '@remixicon/react';
import { useTranslation } from 'react-i18next';

import { WeChatIcon } from '@/assets/icons/Wechat';
import { WechatGroupQrCode } from '@/assets/icons/WechatGroupQrCode';
import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
import { Separator } from '@/components/ui/Separator';
import { DISCORD_LINK } from '@/const';
import { SettingsInfoRow } from '@/page/settings/components/SettingsInfoRow';

export default function Contact() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        <h3 className="text-base font-semibold text-foreground">
          {t('setting.contact.title')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('setting.contact.description')}
        </p>
      </div>
      <Separator className="my-6" />
      <SettingsInfoRow
        icon={<WeChatIcon />}
        label={t('setting.contact.wechat_title')}
        description={t('setting.contact.wechat_description')}
      />
      <div className="ml-10 mt-3 w-36 max-w-[calc(100%-2.5rem)] overflow-hidden rounded-sm bg-white p-1.5">
        <WechatGroupQrCode alt={t('setting.contact.wechat_qr_alt')} />
      </div>
      <Separator className="my-6" />
      <SettingsInfoRow
        icon={<RiDiscordLine />}
        label={t('setting.contact.discord_title')}
        description={t('setting.contact.discord_description')}
        button={
          <SettingPageButton
            asChild
            variant="outline"
            className="text-foreground!"
          >
            <a href={DISCORD_LINK} target="_blank" rel="noopener noreferrer">
              {t('setting.contact.join_discord')}
            </a>
          </SettingPageButton>
        }
      />
    </div>
  );
}

import { useTranslation } from 'react-i18next';

import emptyCatDarkUrl from '@/assets/inviteReferral/emptyCatDark.svg';
import emptyCatLightUrl from '@/assets/inviteReferral/emptyCatLight.svg';
import useTheme from '@/hooks/useTheme';

export function InviteEmptyState() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme.content === 'dark';
  const cat = isDark
    ? { src: emptyCatDarkUrl, width: 126, height: 127 }
    : { src: emptyCatLightUrl, width: 132, height: 128 };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="absolute left-1/2 top-[45%] -translate-x-1/2 text-base font-medium text-muted-foreground">
        {t('inviteReferral.records.emptyTitle')}
      </p>
      <img
        src={cat.src}
        alt=""
        width={cat.width}
        height={cat.height}
        className="pointer-events-none absolute bottom-0 right-0 object-contain"
        style={{ width: cat.width, height: cat.height }}
      />
    </div>
  );
}

import { cn } from 'cn';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';

const SettingPageButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(function SettingPageButton({ className, ...props }, ref) {
  const { t } = useTranslation();

  return (
    <div className="grid shrink-0">
      <span
        aria-hidden="true"
        className="invisible col-start-1 row-start-1 h-7 border border-transparent px-2.5 text-[0.8rem] font-medium whitespace-nowrap"
      >
        {t('setting.delete_account.button')}
      </span>
      <Button
        ref={ref}
        size="sm"
        className={cn('col-start-1 row-start-1 w-full px-2.5', className)}
        {...props}
      />
    </div>
  );
});

export { SettingPageButton };

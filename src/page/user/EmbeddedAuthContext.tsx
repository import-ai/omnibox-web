import { createContext, type ReactNode, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { AppleIcon } from '@/assets/icons/AppleIcon';
import { GoogleIcon } from '@/assets/icons/GoogleIcon';
import { WeChatIcon } from '@/assets/icons/Wechat';
import { Button } from '@/components/button';
import { type AuthProvider } from '@/hooks/AuthConfigContext';

export interface EmbeddedAuth {
  login: (
    provider?: AuthProvider,
    target?: 'browser' | 'clipboard'
  ) => Promise<void>;
  cancel: () => Promise<void>;
}
export const EmbeddedAuthContext = createContext<EmbeddedAuth | undefined>(
  undefined
);

export function ProviderLogin({
  provider,
  children,
}: {
  provider: AuthProvider;
  children: ReactNode;
}) {
  const host = useContext(EmbeddedAuthContext);
  const [pending, setPending] = useState(false);
  const { t } = useTranslation();
  if (!host) return children;
  const Icon = { google: GoogleIcon, apple: AppleIcon, wechat: WeChatIcon }[
    provider
  ];
  const login = async () => {
    setPending(true);
    try {
      await host.login(provider);
    } catch {
      toast.error(t('desktop_auth.failed'));
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="grid gap-2">
      <Button
        variant="outline"
        onClick={login}
        disabled={pending}
        className="w-full [&_svg]:size-5"
      >
        <Icon />
        {t(`login.login_use_${provider}`)}
      </Button>
      {pending && (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {t('desktop_auth.waiting')}
          </p>
          <Button
            variant="outline"
            onClick={() =>
              void host
                .cancel()
                .catch(() => toast.error(t('desktop_auth.failed')))
            }
          >
            {t('desktop_auth.cancel')}
          </Button>
        </>
      )}
    </div>
  );
}

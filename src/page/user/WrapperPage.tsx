import { lazy, Suspense, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import logoSvg from '@/assets/logo.svg';
import { LanguageToggle } from '@/components/toggle/LanguageToggle';
import { ThemeToggle } from '@/components/toggle/ThemeToggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import {
  isEditableElement,
  KEYBOARD_INSET_CHANGE_EVENT,
} from '@/lib/visualViewport';

const AppDownload = lazy(() => import('./components/appDownload/AppDownload'));

interface WrapperPageProps {
  showAppDownload?: boolean;
  useCard?: boolean;
  contentClassName?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

function scrollFocusedFieldIntoView(scroller: HTMLElement) {
  const active = document.activeElement;
  if (!isEditableElement(active) || !scroller.contains(active)) return;
  active.scrollIntoView({ block: 'center', inline: 'nearest' });
}

export default function WrapperPage(props: WrapperPageProps) {
  const { useCard = true, extra, children, showAppDownload = false } = props;
  const { t, i18n } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentClassName = cn(
    'flex w-full max-w-sm flex-col gap-6',
    props.contentClassName
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const onFocusIn = () => {
      requestAnimationFrame(() => scrollFocusedFieldIntoView(scroller));
    };
    const onKeyboardInset = () => scrollFocusedFieldIntoView(scroller);

    scroller.addEventListener('focusin', onFocusIn);
    document.addEventListener(KEYBOARD_INSET_CHANGE_EVENT, onKeyboardInset);
    return () => {
      scroller.removeEventListener('focusin', onFocusIn);
      document.removeEventListener(
        KEYBOARD_INSET_CHANGE_EVENT,
        onKeyboardInset
      );
    };
  }, []);

  return (
    <div
      ref={scrollerRef}
      className="absolute inset-0 overflow-y-auto dark:bg-[#262626]"
    >
      <div className="flex min-h-full flex-col gap-4 p-4">
        <div className="flex justify-end gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex gap-2">
            <a
              href={i18n.language.includes('zh') ? '/zh-cn' : '/'}
              className="flex items-center gap-2 font-medium text-black dark:text-white"
            >
              <div className="flex items-center justify-center rounded-md bg-primary text-primary-foreground">
                <img src={logoSvg} alt="OmniBox Logo" className="size-6" />
              </div>
              {t('login.product_name')}
            </a>
          </div>
          {useCard ? (
            <div className={contentClassName}>
              <Card className="dark:border-[#303030] dark:bg-[#171717]">
                <CardHeader className="hidden">
                  <CardTitle></CardTitle>
                  <CardDescription></CardDescription>
                </CardHeader>
                <CardContent>{children}</CardContent>
              </Card>
              {extra}
            </div>
          ) : (
            <div className={contentClassName}>
              {children}
              {extra}
            </div>
          )}
        </div>
        {showAppDownload && (
          <Suspense fallback={null}>
            <AppDownload />
          </Suspense>
        )}
      </div>
    </div>
  );
}

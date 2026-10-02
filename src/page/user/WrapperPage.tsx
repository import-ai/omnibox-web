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
  layout?: 'card' | 'split';
  contentClassName?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

function scrollFocusedFieldIntoView(scroller: HTMLElement) {
  const active = document.activeElement;
  if (
    !isEditableElement(active) ||
    !(active instanceof HTMLElement) ||
    !scroller.contains(active)
  ) {
    return;
  }
  active.scrollIntoView({ block: 'center', inline: 'nearest' });
}

export default function WrapperPage(props: WrapperPageProps) {
  const {
    useCard = true,
    layout = 'card',
    extra,
    children,
    showAppDownload = false,
  } = props;
  const { t, i18n } = useTranslation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentClassName = cn(
    'flex w-full flex-col gap-6',
    layout === 'split' ? 'max-w-xs' : 'max-w-sm',
    props.contentClassName
  );
  const logo = (
    <a
      href={i18n.language.includes('zh') ? '/zh-cn' : '/'}
      className="flex items-center gap-2 font-medium text-foreground"
    >
      <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <img src={logoSvg} alt="OmniBox Logo" className="size-6" />
      </div>
      {t('login.product_name')}
    </a>
  );
  const toggles = (
    <div className="flex justify-end gap-2">
      <LanguageToggle />
      <ThemeToggle />
    </div>
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

  if (layout === 'split') {
    return (
      <div
        ref={scrollerRef}
        className="auth-split absolute inset-0 overflow-y-auto bg-background lg:overflow-hidden"
      >
        <div className="grid min-h-full lg:h-full lg:min-h-0 lg:grid-cols-2">
          <div className="flex min-h-full min-w-0 flex-col gap-4 p-6 md:p-10 lg:min-h-0">
            <div className="flex shrink-0 items-center justify-between gap-2">
              {logo}
              {toggles}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex min-h-full flex-col items-center justify-center gap-6 py-8">
                <div className={contentClassName}>
                  {children}
                  {extra && <div className="mt-6">{extra}</div>}
                </div>
              </div>
            </div>
          </div>
          <div className="auth-split-visual relative hidden overflow-hidden bg-muted lg:block">
            <img
              src={logoSvg}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.35] dark:grayscale"
            />
            {showAppDownload && (
              <Suspense fallback={null}>
                <AppDownload />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="absolute inset-0 overflow-y-auto bg-muted"
    >
      <div className="flex min-h-full flex-col gap-6 p-6 md:p-10">
        {toggles}
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex gap-2">{logo}</div>
          {useCard ? (
            <div className={contentClassName}>
              <Card>
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

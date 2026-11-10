import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { onOverlayClose, trackButtonClick } from '@/lib/trackButtonClick';

interface AgreementConsent {
  agreed: boolean;
  setAgreed: (value: boolean) => void;
  runWithConsent: (action: () => void) => void;
}

const AgreementContext = createContext<AgreementConsent | null>(null);

export function useAgreementConsent() {
  const context = useContext(AgreementContext);
  if (!context) {
    throw new Error('AgreementConsentProvider is required');
  }
  return context;
}

function AgreementText({
  i18nKey,
  inDialog = false,
}: {
  i18nKey: string;
  inDialog?: boolean;
}) {
  const linkClassName = inDialog
    ? 'text-primary! no-underline! hover:text-primary! hover:no-underline!'
    : 'text-muted-foreground! no-underline! hover:text-muted-foreground! hover:no-underline!';
  return (
    <Trans
      i18nKey={i18nKey}
      components={{
        terms: (
          <a
            href="https://www.omnibox.pro/s/w3A0gJXVUI"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={event => event.stopPropagation()}
          />
        ),
        privacy: (
          <a
            href="https://www.omnibox.pro/s/qYdPydLfW7"
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={event => event.stopPropagation()}
          />
        ),
      }}
    />
  );
}

export function AgreementCheckbox() {
  const { agreed, setAgreed } = useAgreementConsent();
  const id = useId();
  return (
    <div className="flex items-start gap-3 text-xs leading-5 text-primary">
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={agreed}
        onCheckedChange={value => {
          trackButtonClick('user_agreement_toggle', { agreed: value === true });
          setAgreed(value === true);
        }}
        aria-labelledby={`${id}-label`}
      />
      <label id={`${id}-label`} htmlFor={id} className="cursor-pointer">
        <AgreementText i18nKey="login.agreement.checkbox_label" />
      </label>
    </div>
  );
}

export function AgreementConsentProvider({
  scopeKey,
  children,
}: {
  scopeKey: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [agreed, setAgreedState] = useState(false);
  const agreedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    pendingAction.current = null;
    setOpen(false);
  }, []);

  useLayoutEffect(() => {
    cancel();
    return () => {
      pendingAction.current = null;
    };
  }, [scopeKey, cancel]);

  const setAgreed = useCallback((value: boolean) => {
    agreedRef.current = value;
    setAgreedState(value);
  }, []);

  const runWithConsent = useCallback((action: () => void) => {
    if (agreedRef.current) {
      action();
    } else if (!pendingAction.current) {
      pendingAction.current = action;
      setOpen(true);
    }
  }, []);

  const confirm = () => {
    const action = pendingAction.current;
    if (!action) return;
    pendingAction.current = null;
    setAgreed(true);
    setOpen(false);
    // Run directly in the confirmation click, including popup-based sign-in.
    action();
  };

  return (
    <AgreementContext.Provider value={{ agreed, setAgreed, runWithConsent }}>
      {children}
      <Dialog open={open} onOpenChange={value => !value && cancel()}>
        <DialogContent
          onPointerDownOutside={onOverlayClose(
            'user_overlay_close',
            'agreement'
          )}
          className="w-[85%] max-w-sm sm:max-w-sm"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-7">
              {t('login.agreement.confirm.title')}
            </DialogTitle>
            <DialogDescription className="leading-6">
              <AgreementText
                i18nKey="login.agreement.confirm.description"
                inDialog
              />
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              trackName="user_agreement_confirm"
              type="button"
              onClick={confirm}
            >
              {t('login.agreement.confirm.button')}
            </Button>
            <Button
              trackName="user_agreement_cancel"
              type="button"
              variant="outline"
              onClick={cancel}
            >
              {t('login.agreement.decline')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AgreementContext.Provider>
  );
}

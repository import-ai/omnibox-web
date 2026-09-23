import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { restoreInviteFromUrl, updateInviteParams } from './authInviteParams';
import { InviteCodeDialog } from './InviteCodeDialog';
import {
  getStoredInviteRegistration,
  isValidInviteCode,
  setStoredInviteRegistration,
} from './registration';

export function InviteCodeEntry() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const linkedCode = params.get('invite_code') || '';
  const [code, setCode] = useState(
    () => getStoredInviteRegistration().code || linkedCode
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isValidInviteCode(linkedCode)) return;
    setCode(linkedCode);
    restoreInviteFromUrl(`invite_code=${linkedCode}`);
  }, [linkedCode]);

  return (
    <>
      <button
        type="button"
        className="w-full text-center text-sm text-muted-foreground hover:underline"
        onClick={() => setOpen(true)}
      >
        {code
          ? t('inviteReferral.code.confirmed', { code })
          : t('inviteReferral.code.entry')}
      </button>
      <InviteCodeDialog
        initialCode={code}
        open={open}
        onOpenChange={setOpen}
        onConfirm={value => {
          setCode(value);
          setStoredInviteRegistration({
            code: value,
            source:
              value === linkedCode
                ? getStoredInviteRegistration().source
                : 'manual',
          });
          setParams(updateInviteParams(params, value), { replace: true });
        }}
      />
    </>
  );
}

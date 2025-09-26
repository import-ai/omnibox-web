import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

import { WECHAT_BOT_QRCODE_URL } from '@/const';

export function QrCode() {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (WECHAT_BOT_QRCODE_URL) {
      QRCode.toDataURL(WECHAT_BOT_QRCODE_URL, {
        width: 134,
        margin: 0,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(url => {
          setQrCodeDataUrl(url);
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [open]);

  return (
    <img
      src={qrCodeDataUrl}
      alt="QR Code"
      className="size-[134px] object-contain"
    />
  );
}

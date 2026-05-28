import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function useQrCode(url: string, enabled: boolean): string {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (enabled && url) {
      QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(dataUrl => {
          setQrCodeDataUrl(dataUrl);
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [enabled, url]);

  return qrCodeDataUrl;
}

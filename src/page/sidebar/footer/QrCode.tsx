import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

import logoUrl from '@/assets/logo.svg';
import weixinqunUrl from '@/assets/wechatGroup.png';
import { WECHAT_GROUP_QRCODE_URL } from '@/const';

export function QrCode() {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (WECHAT_GROUP_QRCODE_URL) {
      QRCode.toDataURL(WECHAT_GROUP_QRCODE_URL, {
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
    <div className="size-[134px] relative">
      <img src={qrCodeDataUrl} alt="QR Code" className="size-[134px]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src={logoUrl}
          alt="OmniBox Logo"
          className="size-10 bg-white p-[3px] rounded-lg shadow-sm"
        />
      </div>
    </div>
  );
}

export function WechatGroupQrCode() {
  return (
    <img src={weixinqunUrl} alt="WeChat Group QR Code" className="size-36" />
  );
}

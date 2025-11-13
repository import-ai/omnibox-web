import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface IProps {
  data: string;
}

export function QrCode(props: IProps) {
  const { data } = props;
  const [url, onUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(data, {
      width: 134,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then(onUrl)
      .catch(err => {
        console.error('Error generating QR code:', err);
      });
  }, [data]);

  return (
    <div className="size-[134px]">
      <img src={url} alt="QR Code" className="size-[134px]" />
    </div>
  );
}

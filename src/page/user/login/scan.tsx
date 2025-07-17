import { http } from '@/lib/request';
import extension from '@/lib/extension';
import { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function ScanForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect');
  const [qrcode, onQrcode] = useState('');
  const timer = useRef<NodeJS.Timeout>(null);
  const refetch = () => {
    http.get('/wechat/qrcode').then((response) => {
      onQrcode(response.qrcode);
      timer.current && clearInterval(timer.current);
      timer.current = setInterval(() => {
        http.get(`/wechat/check/${response.state}`).then((stateResponse) => {
          switch (stateResponse.status) {
            case 'success':
              timer.current && clearInterval(timer.current);
              localStorage.setItem('uid', stateResponse.user.id);
              localStorage.setItem('token', stateResponse.user.access_token);
              if (redirect) {
                location.href = decodeURIComponent(redirect);
              } else {
                extension().then((val) => {
                  if (val) {
                    navigate('/', { replace: true });
                  }
                });
              }
              break;
            case 'expired':
              timer.current && clearInterval(timer.current);
              refetch();
              break;
          }
        });
      }, 2000);
    });
  };

  useEffect(() => {
    const beforeUnload = () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    refetch();
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);

  return (
    <div className="size-[200px] overflow-hidden bg-gray-400 rounded-sm">
      {qrcode ? <img src={qrcode} className="size-[200px]" /> : null}
    </div>
  );
}

import { http } from '@/lib/request';
import { LoaderCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ScanForm() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    http
      .get('/wechat/qrcode')
      .then((response) => {
        let colorScheme = 'light';
        const themeStorage = localStorage.getItem('theme');
        if (themeStorage) {
          const theme = JSON.parse(themeStorage);
          colorScheme = theme.content || 'light';
        }
        // @ts-ignore
        new WxLogin({
          stylelite: 1,
          scope: response.scope,
          self_redirect: false,
          state: response.state,
          id: 'wx-login-container',
          appid: response.app_id,
          color_scheme: colorScheme,
          redirect_uri: response.redirect_uri,
          onReady: function (isReady: boolean) {
            if (!isReady) {
              return;
            }
            setLoading(false);
            const iframe = document.querySelector(
              '#wx-login-container iframe',
            ) as HTMLIFrameElement;
            if (iframe) {
              iframe.width = '200px';
              iframe.height = '160px';
              iframe.setAttribute(
                'sandbox',
                'allow-scripts allow-top-navigation allow-same-origin',
              );
            }
          },
        });
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-[200px] h-[160px] relative overflow-hidden rounded-sm">
      <div id="wx-login-container" className="w-full h-full" />
      {loading && (
        <div className="absolute left-0 top-0 z-10 flex items-center justify-center w-full h-full text-foreground">
          <LoaderCircle className="transition-transform animate-spin" />
        </div>
      )}
    </div>
  );
}

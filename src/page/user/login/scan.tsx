import { useEffect } from 'react';
import { http } from '@/lib/request';

export function ScanForm() {
  useEffect(() => {
    http.get('/wechat/qrcode').then((response) => {
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
    });
  }, []);

  return (
    <div
      id="wx-login-container"
      className="w-[200px] h-[160px] overflow-hidden rounded-sm"
    />
  );
}

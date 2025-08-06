import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { http } from '@/lib/request';
import { LoaderCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function ScanForm() {
  const { i18n } = useTranslation();
  const [opacity, setOpacity] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // @ts-ignore
    const handler = window.WxLogin;
    (handler
      ? Promise.resolve(handler)
      : new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src =
            '//res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
          script.onload = () => {
            // @ts-ignore
            resolve(window.WxLogin);
            script.remove();
          };
          script.onerror = reject;
          document.body.appendChild(script);
        })
    )
      .then(WxLogin => {
        return http.get('/wechat/qrcode').then(response => {
          let colorScheme = 'light';
          const themeStorage = localStorage.getItem('theme');
          if (themeStorage) {
            const theme = JSON.parse(themeStorage);
            colorScheme = theme.content || 'light';
          }
          // @ts-ignore
          new WxLogin({
            scope: response.scope,
            self_redirect: false,
            state: response.state,
            id: 'wx-login-container',
            appid: response.app_id,
            color_scheme: colorScheme,
            redirect_uri: response.redirect_uri,
            lang: i18n.language == 'en' ? 'en' : 'cn',
            href: 'data:text/css;base64,LndlYl9xcmNvZGVfcGFuZWxfYXJlYSAud2ViX3FyY29kZV9wYW5lbF9ub3JtYWxfbG9naW57DQogIHBhZGRpbmctdG9wOiAxMHB4Ow0KfQ0KDQoud2ViX3FyY29kZV9wYW5lbF9hcmVhIC53ZWJfcXJjb2RlX3BhbmVsX3F1aWNrX2xvZ2luew0KICBwYWRkaW5nLXRvcDogMTAwcHg7DQp9',
            onReady: function (isReady: boolean) {
              if (!isReady) {
                return;
              }
              setLoading(false);
              const iframe = document.querySelector(
                '#wx-login-container iframe'
              ) as HTMLIFrameElement;
              if (iframe) {
                iframe.width = '100%';
                iframe.setAttribute(
                  'sandbox',
                  'allow-scripts allow-top-navigation allow-same-origin'
                );
              }
              setOpacity(false);
            },
          });
        });
      })
      .catch(error => {
        toast.error(error && error.message ? error.message : error, {
          position: 'bottom-right',
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="h-[400px] relative overflow-hidden rounded-sm mx-[-24px]">
      <div
        id="wx-login-container"
        className={cn('w-full h-full', { 'opacity-0': opacity })}
      />
      {loading && (
        <div className="absolute left-0 top-0 z-10 flex items-center justify-center w-full h-full text-foreground">
          <LoaderCircle className="transition-transform animate-spin" />
        </div>
      )}
    </div>
  );
}

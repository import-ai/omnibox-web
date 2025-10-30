import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useDevice } from '@/hooks/use-device';
import { http } from '@/lib/request';

import { QrCode } from './qrcode';

export default function WeixinPay() {
  const [code, onCode] = useState('');
  const { mobile, wechat } = useDevice();
  const handleTransactions = () => {
    const productId = 'product-xxx';
    let type: 'native' | 'jsapi' | 'h5' = mobile ? 'h5' : 'native';
    if (wechat) {
      type = 'jsapi';
    }
    http
      .post(`/pay/weixin/transactions/${type}/${productId}`)
      .then(response => {
        const { orderId, ...args } = response;
        if (type === 'jsapi') {
          function onBridgeReady() {
            WeixinJSBridge.invoke('getBrandWCPayRequest', args, function () {
              http
                .get(`/pay/weixin/query/${orderId}`)
                .then(() => {
                  toast('支付成功', { position: 'bottom-right' });
                })
                .catch(error => {
                  toast(error.message, { position: 'bottom-right' });
                });
            });
          }
          if (typeof WeixinJSBridge == 'undefined') {
            if (document.addEventListener) {
              document.addEventListener(
                'WeixinJSBridgeReady',
                onBridgeReady,
                false
              );
              // @ts-ignore
            } else if (document.attachEvent) {
              // @ts-ignore
              document.attachEvent('WeixinJSBridgeReady', onBridgeReady);
              // @ts-ignore
              document.attachEvent('onWeixinJSBridgeReady', onBridgeReady);
            }
          } else {
            onBridgeReady();
          }
          return;
        }
        if (type === 'h5') {
          location.href = `${args.h5_url}&redirect_url=${encodeURIComponent(location.href + '?return_from_pay=1')}`;
          return;
        }
        if (type === 'native') {
          onCode(args.code_url);
          return;
        }
      });
  };

  if (code) {
    return <QrCode data={code} />;
  }

  return <Button onClick={handleTransactions}>下单</Button>;
}

declare let WeixinJSBridge: any;

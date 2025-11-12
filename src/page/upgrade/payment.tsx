import { ArrowLeft, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDevice } from '@/hooks/use-device';
import { Order, OrderStatus } from '@/interface';
import { http } from '@/lib/request';

import { QrCode } from './qrcode';

type PaymentMethod = 'wechat' | 'alipay';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
}

const paymentOptions: PaymentOption[] = [
  {
    id: 'wechat',
    name: '微信支付',
    description: '使用微信扫码或在微信内支付',
  },
  {
    id: 'alipay',
    name: '支付宝',
    description: '使用支付宝扫码或跳转支付',
  },
];

export default function Payment() {
  const navigate = useNavigate();
  const codeOrderId = useRef('');
  const [code, setCode] = useState('');
  const { mobile, wechat } = useDevice();
  const [searchParams] = useSearchParams();
  const orderType = searchParams.get('type');
  const productId = searchParams.get('productId');
  const orderIdFromPay = searchParams.get('orderId');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
  const queryOrder = (
    type: string,
    orderId: string,
    isPolling: boolean = false
  ): Promise<boolean> => {
    return http
      .get(`/pay/${type}/query/${orderId}`)
      .then((order: Order) => {
        if (order.status === OrderStatus.PAID) {
          toast('支付成功', { position: 'bottom-right' });
          setTimeout(() => {
            navigate('/upgrade');
          }, 1000);
          return true;
        } else if (!isPolling) {
          toast('支付失败', { position: 'bottom-right' });
        }
        return false;
      })
      .catch(error => {
        if (!isPolling) {
          toast(error.message, { position: 'bottom-right' });
        }
        return false;
      });
  };
  const handlePayment = () => {
    if (!selectedMethod) {
      toast.error('请选择支付方式', { position: 'bottom-right' });
      return;
    }
    if (!productId) {
      toast.error('产品信息缺失', { position: 'bottom-right' });
      return;
    }
    if (selectedMethod === 'wechat') {
      handleWechatPay();
    } else if (selectedMethod === 'alipay') {
      handleAlipay();
    }
  };
  const handleWechatPay = () => {
    let type: 'native' | 'jsapi' | 'h5' = mobile ? 'h5' : 'native';
    if (wechat) {
      type = 'jsapi';
    }
    http
      .post(`/pay/weixin/transactions/${type}/${productId}`, { mute: true })
      .then(response => {
        const { order_id, ...args } = response;
        if (type === 'jsapi') {
          function onBridgeReady() {
            WeixinJSBridge.invoke('getBrandWCPayRequest', args, function () {
              queryOrder('weixin', order_id);
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
          location.href = `${args.h5_url}&redirect_url=${encodeURIComponent(location.href + '&type=weixin&orderId=' + order_id)}`;
          return;
        }
        if (type === 'native') {
          codeOrderId.current = order_id;
          setCode(args.code_url);
          return;
        }
      })
      .catch(err => {
        if (err.response.data.code === 'wechat_not_bound') {
          toast('请完成授权后再次尝试支付，开始授权中...', {
            position: 'bottom-right',
          });
          setTimeout(() => {
            http
              .get('/wechat/auth-url')
              .then(authUrl => {
                location.href = authUrl;
              })
              .catch(error => {
                toast.error(error.message, { position: 'bottom-right' });
              });
          }, 2000);
        } else {
          toast(err.response.data.message, { position: 'bottom-right' });
        }
      });
  };
  const handleAlipay = () => {
    const type = mobile ? 'h5' : 'native';
    http
      .post(
        `/pay/alipay/transactions/${type}/${productId}?returnUrl=${encodeURIComponent(location.href + '&type=alipay')}`
      )
      .then(response => {
        location.href = response.url;
      })
      .catch(error => {
        toast.error(error.message || '支付失败，请稍后重试', {
          position: 'bottom-right',
        });
      });
  };
  const handleBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    if (!orderIdFromPay || !orderType) {
      return;
    }
    queryOrder(orderType, orderIdFromPay);
  }, [orderIdFromPay, orderType]);

  useEffect(() => {
    if (!code) {
      return;
    }

    const POLLING_INTERVAL = 2000;
    const MAX_POLLING_TIME = 5 * 60 * 1000;
    const startTime = Date.now();
    let timerId: NodeJS.Timeout;

    const poll = async () => {
      if (Date.now() - startTime > MAX_POLLING_TIME) {
        clearInterval(timerId);
        toast('支付超时，请重新发起支付', { position: 'bottom-right' });
        return;
      }

      const shouldStop = await queryOrder('weixin', codeOrderId.current, true);
      if (shouldStop) {
        clearInterval(timerId);
      }
    };

    timerId = setInterval(poll, POLLING_INTERVAL);

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [code]);

  if (orderIdFromPay) {
    return (
      <div className="container mx-auto max-w-md py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>查询中</CardTitle>
            <CardDescription>正在查询订单状态</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (code) {
    return (
      <div className="container mx-auto max-w-md py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">扫码支付</CardTitle>
            <CardDescription className="text-center">
              请使用微信扫描二维码完成支付
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <QrCode data={code} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="container mx-auto max-w-md py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>错误</CardTitle>
            <CardDescription>产品信息缺失</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack} className="w-full">
              返回
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          返回
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>选择支付方式</CardTitle>
          <CardDescription>请选择您方便的支付方式完成购买</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {paymentOptions.map(option => (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedMethod === option.id
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'border-border'
                }`}
                onClick={() => setSelectedMethod(option.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{option.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  {selectedMethod === option.id && (
                    <Check className="h-6 w-6 text-primary" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handlePayment}
            disabled={!selectedMethod}
          >
            确认支付
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

declare let WeixinJSBridge: any;

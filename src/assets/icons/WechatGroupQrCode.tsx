import wechatGroupUrl from '@/assets/wechatGroup.png';

export function WechatGroupQrCode({
  alt = 'WeChat Group QR Code',
}: {
  alt?: string;
}) {
  return <img src={wechatGroupUrl} alt={alt} />;
}

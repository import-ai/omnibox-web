import isMobile from 'ismobilejs';

export function useDevice() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isPhone = isMobile(userAgent).phone;
  const isWeChat = userAgent.includes('micromessenger');

  return {
    desktop: !isPhone,
    mobile: isPhone,
    wechat: isWeChat,
  };
}

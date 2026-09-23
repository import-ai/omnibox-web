import { create } from 'qrcode';

/** Uses the public site so QR codes also work from local and test deployments. */
export function getAppDownloadUrl(language: string): string {
  return `https://www.omnibox.pro/${language.startsWith('zh') ? 'zh-cn' : 'en'}/download/`;
}

/** Excludes H5, including iPads requesting desktop websites. */
export function isMobileDownloadClient(
  client: Pick<Navigator, 'userAgent' | 'maxTouchPoints'>
): boolean {
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(client.userAgent) ||
    (/Macintosh/i.test(client.userAgent) && client.maxTouchPoints > 1)
  );
}

/** Whole modules cleared so the 36px artwork fits the 144px compact QR. */
const LOGO_MODULE_TARGET = 13;

/** Builds a high-correction QR with a function-pattern-free logo area. */
export function createDownloadQr(url: string) {
  const { modules } = create(url, { errorCorrectionLevel: 'H' });
  const size = modules.size;
  let logoSize = Math.min(LOGO_MODULE_TARGET, size - 14);
  if ((size - logoSize) % 2 !== 0) logoSize -= 1;
  const overlapsReserved = (width: number) => {
    const start = (size - width) / 2;
    for (let y = start; y < start + width; y++) {
      for (let x = start; x < start + width; x++) {
        if (modules.isReserved(y, x)) return true;
      }
    }
    return false;
  };
  while (logoSize > 0 && overlapsReserved(logoSize)) logoSize -= 2;
  logoSize = Math.max(0, logoSize);
  return { modules, size, logoSize, logoStart: (size - logoSize) / 2 };
}

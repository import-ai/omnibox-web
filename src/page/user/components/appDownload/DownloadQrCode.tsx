import { useMemo } from 'react';

import darkLogo from '@/assets/appDownload/catDark.svg';
import darkLogoLarge from '@/assets/appDownload/catDarkLarge.svg';
import lightLogo from '@/assets/appDownload/catLight.svg';
import lightLogoLarge from '@/assets/appDownload/catLightLarge.svg';

import { createDownloadQr } from './downloadQr';

type DownloadQrVariant = 'compact' | 'expanded';

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x="0.5"
        y="0.5"
        width="6"
        height="6"
        rx="1.1"
        fill="none"
        stroke="currentColor"
      />
      <rect x="2" y="2" width="3" height="3" rx="0.55" fill="currentColor" />
    </g>
  );
}

function QrDots({ qr }: { qr: ReturnType<typeof createDownloadQr> }) {
  const { size, logoStart, logoSize, modules } = qr;
  const dots = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const finder =
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7);
      const logo =
        x >= logoStart &&
        x < logoStart + logoSize &&
        y >= logoStart &&
        y < logoStart + logoSize;
      if (!modules.get(y, x) || finder || logo) continue;
      dots.push(
        <circle
          key={`${x}-${y}`}
          cx={x + 0.5}
          cy={y + 0.5}
          r="0.4"
          fill="currentColor"
        />
      );
    }
  }
  return <>{dots}</>;
}

/** Renders a scannable dot QR with four-module quiet zones and themed artwork. */
export function DownloadQrCode({
  url,
  variant = 'compact',
}: {
  url: string;
  variant?: DownloadQrVariant;
}) {
  const qr = useMemo(() => createDownloadQr(url), [url]);
  const { size, logoSize } = qr;
  // Share the compact QR's 36/144 artwork ratio and surrounding gap at both sizes.
  const imageSize = (36 * (size + 8)) / 144;
  const imageStart = (size - imageSize) / 2;
  const logos =
    variant === 'expanded'
      ? { light: lightLogoLarge, dark: darkLogoLarge }
      : { light: lightLogo, dark: darkLogo };
  return (
    <svg
      className={`app-download-qr ${variant === 'compact' ? 'app-download-qr-compact' : ''}`}
      viewBox={`-4 -4 ${size + 8} ${size + 8}`}
      width={variant === 'expanded' ? 430 : undefined}
      height={variant === 'expanded' ? 430 : undefined}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="-4"
        y="-4"
        width={size + 8}
        height={size + 8}
        fill="var(--download-qr-surface)"
      />
      <QrDots qr={qr} />
      <Finder x={0} y={0} />
      <Finder x={size - 7} y={0} />
      <Finder x={0} y={size - 7} />
      {logoSize > 0 && (
        <>
          <image
            className="app-download-logo-light"
            href={logos.light}
            x={imageStart}
            y={imageStart}
            width={imageSize}
            height={imageSize}
          />
          <image
            className="app-download-logo-dark"
            href={logos.dark}
            x={imageStart}
            y={imageStart}
            width={imageSize}
            height={imageSize}
          />
        </>
      )}
    </svg>
  );
}

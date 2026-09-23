import { useEffect, useState } from 'react';

import CatHeadIcon from '@/assets/icons/CatHeadIcon';

interface HomeMascotProps {
  blinkSignal: number;
  compact?: boolean;
}

export default function HomeMascot({
  blinkSignal,
  compact = false,
}: HomeMascotProps) {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    let resetTimer: number | undefined;
    const blink = () => {
      window.clearTimeout(resetTimer);
      setBlinking(true);
      resetTimer = window.setTimeout(() => setBlinking(false), 170);
    };

    if (blinkSignal > 0) {
      blink();
    }
    const interval = window.setInterval(blink, 4200);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(resetTimer);
    };
  }, [blinkSignal]);

  return (
    <CatHeadIcon
      className={compact ? 'h-[77px] w-[73px]' : 'h-[98px] w-[92px]'}
      eyesKey={blinkSignal}
      eyesClassName={
        blinking
          ? 'origin-center motion-safe:animate-cat-blink-on-press'
          : 'origin-center'
      }
    />
  );
}

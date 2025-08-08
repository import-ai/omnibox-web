import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

type TypewriterProps = {
  text?: string;
  typeSpeed?: number;
  className?: string;
  onComplete?: () => void;
};

export const Typewriter = ({
  text = '',
  typeSpeed = 33,
  onComplete,
  className,
}: TypewriterProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete); // Ref to store the latest onComplete

  // Keep onComplete callback reference up-to-date without causing effect re-runs
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const startTyping = () => {
      let currentIndex = 0;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          onCompleteRef.current?.();
        }
      }, typeSpeed);
    };
    startTyping();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text]);

  return (
    <span
      className={cn('whitespace-pre-wrap leading-7', className)}
      dangerouslySetInnerHTML={{ __html: displayedText }}
    />
  );
};

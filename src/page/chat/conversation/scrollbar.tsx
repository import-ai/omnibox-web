import { useEffect, useRef } from 'react';

interface IProps {
  children: React.ReactNode;
}

export default function Scrollbar(props: IProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const container = containerRef.current;
    if (!root || !container) {
      return;
    }
    const scrollToBottom = () => {
      if (root.scrollHeight - root.scrollTop - root.clientHeight < 200) {
        root.scrollTop = root.scrollHeight;
      }
    };
    const observer = new ResizeObserver(() => {
      scrollToBottom();
    });
    observer.observe(container);
    scrollToBottom();
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="flex min-h-0 w-full shrink grow justify-center overflow-y-auto p-4 [scrollbar-gutter:stable_both-edges]"
    >
      <div ref={containerRef} className="h-fit w-full max-w-3xl">
        {props.children}
      </div>
    </div>
  );
}

import { useRef, useEffect } from 'react';

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
      className="flex justify-center p-4 w-full overflow-y-auto h-[calc(100vh-234px)] [scrollbar-gutter:stable_both-edges]"
    >
      <div ref={containerRef} className="max-w-3xl h-fit">
        {props.children}
      </div>
    </div>
  );
}

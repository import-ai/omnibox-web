import Vditor from 'vditor';
import { useRef, useEffect } from 'react';
import useTheme from '@/hooks/use-theme';

interface IProps {
  content: string;
}

export function Markdown(props: IProps) {
  const { content } = props;
  const { theme } = useTheme();
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (element.current) {
      Vditor.preview(element.current, content, {
        cdn: 'https://cdn.jsdelivr.net/npm/vditor@3.10.8',
        theme: {
          current: theme.skin,
        },
        mode: theme.content,
        hljs: {
          defaultLang: 'plain',
          style: theme.code,
          lineNumber: true,
        },
      });
    }
  }, [content, theme]);

  return <div ref={element} />;
}

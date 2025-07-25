import Vditor from 'vditor';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';
import { LAZY_LOAD_IMAGE, VDITOR_CDN } from '@/const';
import { useEffect, useRef } from 'react';
import useTheme from '@/hooks/use-theme';
import { useNavigate } from 'react-router-dom';
import { addReferrerPolicyForString } from '@/lib/add-referrer-policy';
import { Theme } from '@/interface';
import '@/components/markdown/index.css';

interface IProps {
  content: string;
}

export function markdownPreviewConfig(theme: Theme) {
  return {
    hljs: {
      defaultLang: 'plain',
      style: theme.code,
      lineNumber: true,
    },
    markdown: {
      toc: true,
    },
    math: {
      inlineDigit: true,
    },
  };
}

export function Markdown(props: IProps) {
  const { content } = props;
  const { theme } = useTheme();
  const navigate = useNavigate();
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!element.current) {
      return;
    }
    const clickFN = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      if (!link) {
        return;
      }
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('/')) {
        return;
      }
      event.preventDefault();
      navigate(href);
    };
    element.current.addEventListener('click', clickFN);
    return () => {
      if (element.current) {
        element.current.removeEventListener('click', clickFN);
      }
    };
  }, []);

  useEffect(() => {
    if (element.current) {
      Vditor.preview(element.current, content, {
        ...(VDITOR_CDN ? { cdn: VDITOR_CDN } : {}),
        ...markdownPreviewConfig(theme),
        theme: {
          current: theme.content,
        },
        anchor: 1,
        mode: theme.content,
        transform: addReferrerPolicyForString,
        lazyLoadImage: LAZY_LOAD_IMAGE,
      });
    }
  }, [content, theme]);

  return <div className="reset-list" ref={element} />;
}

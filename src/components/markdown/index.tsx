import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';
import '@/components/markdown/index.css';

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Vditor from 'vditor';

import { LAZY_LOAD_IMAGE, VDITOR_CDN } from '@/const';
import useTheme from '@/hooks/useTheme';
import { Theme } from '@/interface';
import { addReferrerPolicyForString } from '@/lib/addReferrerPolicy';

interface IProps {
  content: string;
  linkBase?: string;
  openLinksInNewWindow?: boolean;
  style?: React.CSSProperties;
  onRendered?: () => void;
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
  const {
    style,
    content,
    linkBase,
    openLinksInNewWindow = false,
    onRendered,
  } = props;
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
      if (!href || openLinksInNewWindow || !href.startsWith('/')) {
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
  }, [navigate, openLinksInNewWindow]);

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
        markdown: {
          linkBase,
        },
        after: () => {
          if (openLinksInNewWindow) {
            element.current?.querySelectorAll('a').forEach(link => {
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
            });
          }
          if (onRendered) {
            onRendered();
          }
        },
      });
    }
  }, [content, theme, onRendered, openLinksInNewWindow]);

  return <div style={style} className="reset-list" ref={element} />;
}

import { ArrowDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { commentViewportPlacement } from './commentViewportPlacement';
import { useResourceCommentsPanel } from './ResourceCommentsContext';

interface ResourceCommentJumpButtonProps {
  firstThreadId: string | null;
  onJump: (threadId: string) => void;
}

export function ResourceCommentJumpButton({
  firstThreadId,
  onJump,
}: ResourceCommentJumpButtonProps) {
  const { t } = useTranslation();
  const panel = useResourceCommentsPanel();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const root = panel?.rootElement;
    const panelElement = panel?.panelElement;
    const scroll = panelElement?.querySelector<HTMLElement>(
      '[data-comments-scroll]'
    );
    if (!root || !scroll || !firstThreadId) {
      setVisible(false);
      return;
    }

    let frame = 0;
    const measure = () => {
      const card = Array.from(
        scroll.querySelectorAll<HTMLElement>('[data-thread-id]')
      ).find(element => element.dataset.threadId === firstThreadId);
      const wrapper = card?.parentElement;
      if (
        !card ||
        wrapper?.style.visibility === 'hidden' ||
        card.getClientRects().length === 0
      ) {
        setVisible(false);
        return;
      }
      const scrollRect = scroll.getBoundingClientRect();
      const viewTop = scrollRect.top + scroll.clientTop;
      const placement = commentViewportPlacement(
        card.getBoundingClientRect(),
        viewTop,
        viewTop + scroll.clientHeight
      );
      setVisible(placement === 'below');
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    schedule();
    scroll.addEventListener('scroll', schedule);
    root.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const observer =
      typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(schedule);
    observer?.observe(scroll, {
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
      subtree: true,
    });

    return () => {
      cancelAnimationFrame(frame);
      scroll.removeEventListener('scroll', schedule);
      root.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
    };
  }, [firstThreadId, panel]);

  if (!visible || !firstThreadId) {
    return null;
  }

  return (
    <button
      type="button"
      className="resource-comments-jump"
      onClick={() => onJump(firstThreadId)}
    >
      <ArrowDown aria-hidden="true" />
      {t('resource_comments.jump_to_first')}
    </button>
  );
}

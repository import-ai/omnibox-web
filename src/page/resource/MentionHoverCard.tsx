import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/HoverCard';

import {
  type MentionCardField,
  mentionCardInitial,
  type MentionCardMember,
  mentionCardRows,
} from './mentionCard';

const CLOSE_DELAY_MS = 100;

const FIELD_LABELS: Record<MentionCardField, string> = {
  nickname: 'manage.nickname',
  username: 'form.username',
  email: 'form.email',
  note: 'manage.note',
};

type ActiveMention = {
  id: string;
  member: MentionCardMember;
  rect: DOMRect;
};

function mentionElement(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }
  const mention = target.closest('[data-type="mention"]');
  return mention instanceof HTMLElement ? mention : null;
}

export function MentionHoverCard({
  containerRef,
  membersById,
}: {
  containerRef: RefObject<HTMLElement | null>;
  membersById: Record<string, MentionCardMember>;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<ActiveMention | null>(null);
  const closeTimer = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const membersRef = useRef(membersById);
  membersRef.current = membersById;

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      setActive(null);
    }, CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) {
      return;
    }

    const openMention = (mention: HTMLElement) => {
      const id = mention.getAttribute('data-id')?.trim();
      if (!id) {
        return;
      }
      const member = membersRef.current[id];
      if (!member || mentionCardRows(member).length === 0) {
        return;
      }
      clearCloseTimer();
      setActive(current =>
        current?.id === id
          ? current
          : { id, member, rect: mention.getBoundingClientRect() }
      );
    };

    const onOver = (event: MouseEvent) => {
      const mention = mentionElement(event.target);
      if (!mention || !root.contains(mention)) {
        return;
      }
      openMention(mention);
    };

    const onOut = (event: MouseEvent) => {
      const mention = mentionElement(event.target);
      if (!mention || !root.contains(mention)) {
        return;
      }
      const next = event.relatedTarget;
      if (next instanceof Node && mention.contains(next)) {
        return;
      }
      if (next instanceof Node && cardRef.current?.contains(next)) {
        return;
      }
      scheduleClose();
    };

    root.addEventListener('mouseover', onOver);
    root.addEventListener('mouseout', onOut);
    return () => {
      root.removeEventListener('mouseover', onOver);
      root.removeEventListener('mouseout', onOut);
      clearCloseTimer();
    };
  }, [clearCloseTimer, containerRef, scheduleClose]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const close = () => setActive(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [active]);

  if (!active || typeof document === 'undefined') {
    return null;
  }

  const rows = mentionCardRows(active.member);
  if (rows.length === 0) {
    return null;
  }

  return createPortal(
    <HoverCard open>
      <HoverCardTrigger asChild>
        <span
          aria-hidden
          style={{
            position: 'fixed',
            top: active.rect.top,
            left: active.rect.left,
            width: active.rect.width,
            height: active.rect.height,
            pointerEvents: 'none',
          }}
        />
      </HoverCardTrigger>
      <HoverCardContent
        ref={cardRef}
        side="bottom"
        align="start"
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <div className="flex gap-3">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
          >
            {mentionCardInitial(active.member)}
          </span>
          <div className="min-w-0 space-y-1.5">
            {rows.map(row => (
              <div key={row.field}>
                <div className="text-xs text-muted-foreground">
                  {t(FIELD_LABELS[row.field])}
                </div>
                <div className="break-words text-sm">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>,
    document.body
  );
}

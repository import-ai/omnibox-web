import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/HoverCard';

import {
  hasMentionCard,
  type MentionCardField,
  mentionCardInitial,
  type MentionCardMember,
  mentionCardRows,
} from './mentionCard';

const FIELD_LABELS: Record<MentionCardField, string> = {
  nickname: 'manage.nickname',
  username: 'form.username',
  email: 'form.email',
  phone: 'form.phone',
  note: 'manage.note',
};

const CLOSE_DELAY_MS = 100;

export function MentionCard({ member }: { member: MentionCardMember }) {
  const { t } = useTranslation();
  const rows = mentionCardRows(member);
  const avatar = member.avatar?.trim();
  if (!rows.length && !avatar) {
    return null;
  }
  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8 text-xs">
        {avatar ? <AvatarImage src={avatar} alt="" /> : null}
        <AvatarFallback>{mentionCardInitial(member)}</AvatarFallback>
      </Avatar>
      {rows.length ? (
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
      ) : null}
    </div>
  );
}

type ActiveMention = {
  id: string;
  member: MentionCardMember;
  rect: DOMRect;
  anchor: HTMLElement;
  anchorKey: number;
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
  containerRef: { readonly current: HTMLElement | null };
  membersById: Record<string, MentionCardMember>;
}) {
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
      if (!member || !hasMentionCard(member)) {
        return;
      }
      clearCloseTimer();
      setActive(current => {
        if (current?.anchor === mention) return current;
        return {
          id,
          member,
          rect: mention.getBoundingClientRect(),
          anchor: mention,
          anchorKey: (current?.anchorKey ?? 0) + 1,
        };
      });
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

  if (
    !active ||
    typeof document === 'undefined' ||
    !hasMentionCard(active.member)
  ) {
    return null;
  }

  return createPortal(
    <HoverCard key={active.anchorKey} open>
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
        className="z-[80]"
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleClose}
      >
        <MentionCard member={active.member} />
      </HoverCardContent>
    </HoverCard>,
    document.body
  );
}

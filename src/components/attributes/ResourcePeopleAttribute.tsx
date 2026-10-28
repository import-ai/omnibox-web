import { UserRound, Users } from 'lucide-react';
import { type ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ATTRIBUTE_STYLES } from '@/components/attributes/constants';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import type { ResourceContributor } from '@/interface';
import { MentionHoverCard } from '@/page/resource/MentionHoverCard';
import { useMentionUsers } from '@/page/resource/useMentionUsers';

import { truncateContributorLabel } from './resourcePeople';

function ContributorAvatar({ person }: { person: ResourceContributor }) {
  return (
    <Avatar size="sm" className="size-6">
      <AvatarFallback className="text-xs">{person.initial}</AvatarFallback>
    </Avatar>
  );
}

function ContributorIdentity({ person }: { person: ResourceContributor }) {
  const hoverable = Boolean(person.interactive && person.user_id);
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1"
      data-type={hoverable ? 'mention' : undefined}
      data-id={hoverable ? person.user_id : undefined}
    >
      <ContributorAvatar person={person} />
      <span className="whitespace-nowrap">
        {truncateContributorLabel(person.label)}
      </span>
    </span>
  );
}

function PeopleRow({
  kind,
  people,
}: {
  kind: 'creator' | 'collaborators';
  people: ResourceContributor[];
}) {
  const { t } = useTranslation();
  if (people.length === 0) {
    return null;
  }
  const separator = t('resource.attrs.contributor_separator');
  const icon: ReactNode =
    kind === 'creator' ? (
      <UserRound className={ATTRIBUTE_STYLES.icon} />
    ) : (
      <Users className={ATTRIBUTE_STYLES.icon} />
    );
  const label =
    kind === 'creator'
      ? t('resource.attrs.creator')
      : t('resource.attrs.collaborators');

  return (
    <div
      className={ATTRIBUTE_STYLES.containerStart}
      data-testid={
        kind === 'creator' ? 'resource-creator' : 'resource-collaborators'
      }
    >
      <div className={ATTRIBUTE_STYLES.containerLabel}>
        {icon}
        <span className={ATTRIBUTE_STYLES.label}>{label}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-y-1">
        {people.map((person, index) => (
          <span
            key={`${person.user_id ?? person.label}-${index}`}
            className="inline-flex items-center"
          >
            <ContributorIdentity person={person} />
            {index < people.length - 1 && <span>{separator}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ResourceContributors({
  namespaceId,
  creator,
  collaborators,
}: {
  namespaceId: string;
  creator?: ResourceContributor | null;
  collaborators?: ResourceContributor[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const people = [...(creator ? [creator] : []), ...(collaborators ?? [])];
  const canHover = people.some(person => person.interactive && person.user_id);
  const { membersById } = useMentionUsers(canHover ? namespaceId : undefined);
  if (people.length === 0) {
    return null;
  }

  return (
    <div ref={rootRef} className="space-y-2">
      {creator ? <PeopleRow kind="creator" people={[creator]} /> : null}
      {collaborators?.length ? (
        <PeopleRow kind="collaborators" people={collaborators} />
      ) : null}
      {canHover ? (
        <MentionHoverCard containerRef={rootRef} membersById={membersById} />
      ) : null}
    </div>
  );
}

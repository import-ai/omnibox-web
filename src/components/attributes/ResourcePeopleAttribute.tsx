import { UserRound, Users } from 'lucide-react';
import { type ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { ATTRIBUTE_STYLES } from '@/components/attributes/constants';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import type { ResourceContributor } from '@/interface';
import type { MentionCardMember } from '@/page/resource/mentionCard';
import { MentionHoverCard } from '@/page/resource/MentionHoverCard';
import { useMentionUsers } from '@/page/resource/useMentionUsers';

import {
  contributorInitial,
  liveContributorLabel,
  truncateContributorLabel,
} from './resourcePeople';

function ContributorAvatar({ person }: { person: ResourceContributor }) {
  return (
    <Avatar size="sm" className="size-6">
      <AvatarFallback className="text-xs">{person.initial}</AvatarFallback>
    </Avatar>
  );
}

function displayedContributor(
  person: ResourceContributor,
  member?: MentionCardMember
): ResourceContributor {
  if (!person.interactive || !member) {
    return person;
  }
  const label = liveContributorLabel(person.label, member);
  return {
    ...person,
    label,
    initial: contributorInitial(label),
  };
}

function ContributorIdentity({
  person,
  member,
}: {
  person: ResourceContributor;
  member?: MentionCardMember;
}) {
  const shown = displayedContributor(person, member);
  const hoverable = Boolean(shown.interactive && shown.user_id && member);
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1"
      data-type={hoverable ? 'mention' : undefined}
      data-id={hoverable ? shown.user_id : undefined}
    >
      <ContributorAvatar person={shown} />
      <span className="whitespace-nowrap">
        {truncateContributorLabel(shown.label)}
      </span>
    </span>
  );
}

function PeopleRow({
  kind,
  people,
  membersById,
}: {
  kind: 'creator' | 'collaborators';
  people: ResourceContributor[];
  membersById: Record<string, MentionCardMember>;
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
            <ContributorIdentity
              person={person}
              member={person.user_id ? membersById[person.user_id] : undefined}
            />
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
      {creator ? (
        <PeopleRow
          kind="creator"
          people={[creator]}
          membersById={membersById}
        />
      ) : null}
      {collaborators?.length ? (
        <PeopleRow
          kind="collaborators"
          people={collaborators}
          membersById={membersById}
        />
      ) : null}
      {canHover ? (
        <MentionHoverCard containerRef={rootRef} membersById={membersById} />
      ) : null}
    </div>
  );
}

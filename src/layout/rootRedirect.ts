import type { InviteLanding } from '@/page/inviteReferral/registration';

export const LAST_NAMESPACE_ID_KEY = 'last_namespace_id';

interface RootNamespace {
  id: string;
}

interface RootDestinationOptions {
  inviteLanding: InviteLanding | null;
  lastNamespaceId: string | null;
}

/**
 * Chooses the in-product destination for a signed-in visitor on the root path.
 * The last visited namespace wins so reloading the root does not move the user
 * to a different space, and pending invite referrals keep their entry page.
 */
export function resolveRootDestination(
  namespaces: RootNamespace[],
  { inviteLanding, lastNamespaceId }: RootDestinationOptions
): string {
  const namespace =
    namespaces.find(item => item.id === lastNamespaceId) ?? namespaces[0];

  if (!namespace) {
    return '/welcome';
  }
  if (inviteLanding === 'activation') {
    return `/${namespace.id}/invite-referral?entry=activation`;
  }
  if (inviteLanding) {
    return `/${namespace.id}/invite-referral`;
  }
  return `/${namespace.id}/chat`;
}

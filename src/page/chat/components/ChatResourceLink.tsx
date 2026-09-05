import type { ComponentProps } from 'react';

import { useChatResourceNavigation } from '@/page/chat/useChatResourceNavigation';

interface ChatResourceLinkProps extends Omit<
  ComponentProps<'a'>,
  'onClick' | 'rel' | 'target'
> {
  lineNumber?: number;
  onOpened?: () => void;
  resourceId: string;
}

/** Preserves a real link while opening normal clicks in the Copilot split. */
export function ChatResourceLink({
  lineNumber,
  onOpened,
  resourceId,
  ...props
}: ChatResourceLinkProps) {
  const { getResourceLinkProps } = useChatResourceNavigation();

  return (
    <a {...props} {...getResourceLinkProps(resourceId, onOpened, lineNumber)} />
  );
}

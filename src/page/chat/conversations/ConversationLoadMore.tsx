import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface ConversationLoadMoreProps {
  hasMore: boolean;
  loading: boolean;
  hasError: boolean;
  onLoadMore: () => void;
}

export default function ConversationLoadMore({
  hasMore,
  loading,
  hasError,
  onLoadMore,
}: ConversationLoadMoreProps) {
  const { t } = useTranslation();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || hasError) {
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          onLoadMore();
        }
      },
      { root: sentinel.closest('[data-sidebar="content"]') }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, hasError, onLoadMore]);

  if (!hasMore && !loading && !hasError) {
    return null;
  }

  return (
    <div ref={sentinelRef} className="flex min-h-8 items-center justify-center">
      {loading ? <Spinner className="size-4" /> : null}
      {hasError && !loading ? (
        <Button variant="ghost" size="sm" onClick={onLoadMore}>
          {t('common.retry')}
        </Button>
      ) : null}
    </div>
  );
}

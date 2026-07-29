import { useEffect, useState } from 'react';

import { Markdown } from '@/components/markdown';

const NOTIFICATION_ASSET_PATTERN =
  /\/api\/v1\/notification-assets\/[A-Za-z0-9._~%+-]+/g;

interface SystemNotificationContentProps {
  active: boolean;
  content: string;
}

async function loadNotificationAsset(
  url: string,
  signal: AbortSignal
): Promise<Blob> {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal,
  });
  if (!response.ok) {
    throw new Error('Notification image load failed');
  }
  return response.blob();
}

export function SystemNotificationContent({
  active,
  content,
}: SystemNotificationContentProps) {
  const [resolvedContent, setResolvedContent] = useState(content);

  useEffect(() => {
    setResolvedContent(content);
    if (!active) {
      return;
    }

    const assetUrls = Array.from(
      new Set(content.match(NOTIFICATION_ASSET_PATTERN) ?? [])
    );
    if (assetUrls.length === 0) {
      return;
    }

    const controller = new AbortController();
    const objectUrls: string[] = [];

    void Promise.all(
      assetUrls.map(async assetUrl => {
        try {
          const blob = await loadNotificationAsset(assetUrl, controller.signal);
          if (controller.signal.aborted) {
            return [assetUrl, assetUrl] as const;
          }
          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);
          return [assetUrl, objectUrl] as const;
        } catch {
          return [assetUrl, assetUrl] as const;
        }
      })
    ).then(replacements => {
      if (controller.signal.aborted) {
        return;
      }
      setResolvedContent(
        replacements.reduce(
          (value, [assetUrl, objectUrl]) =>
            value.split(assetUrl).join(objectUrl),
          content
        )
      );
    });

    return () => {
      controller.abort();
      objectUrls.forEach(objectUrl => URL.revokeObjectURL(objectUrl));
    };
  }, [active, content]);

  return <Markdown content={resolvedContent} openLinksInNewWindow />;
}

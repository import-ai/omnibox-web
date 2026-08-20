import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import { ChatIcon } from '@/assets/icons/ChatIcon';
import useTheme from '@/hooks/useTheme';
import {
  fetchConversationShare,
  type PublicConversationShare,
} from '@/service/conversationShare';

const DOWNLOAD_URL = 'https://www.omnibox.pro/download';

function usePublicShare(shareId: string | undefined) {
  const [share, setShare] = useState<PublicConversationShare | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(shareId));
  const [isInvalid, setIsInvalid] = useState(!shareId);

  useEffect(() => {
    if (!shareId) return;
    const controller = new AbortController();
    setIsLoading(true);
    setIsInvalid(false);
    fetchConversationShare(shareId)
      .then(response => {
        if (controller.signal.aborted) return;
        setShare(response);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setShare(null);
        setIsInvalid(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [shareId]);

  return { isInvalid, isLoading, share };
}

function isWeChatBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

function launchOmniBox(shareId: string, onShowWeChatGuide: () => void) {
  if (isWeChatBrowser()) {
    onShowWeChatGuide();
    return;
  }

  window.location.href = `omnibox://conversation-share?share_id=${encodeURIComponent(shareId)}`;
  if (!/iPad|iPhone|iPod/i.test(navigator.userAgent)) {
    window.setTimeout(() => {
      window.location.assign(DOWNLOAD_URL);
    }, 1200);
  }
}

function SharedMessage({
  content,
  role,
}: {
  content: string;
  role: 'answer' | 'question';
}) {
  const { t } = useTranslation();
  const isQuestion = role === 'question';
  return (
    <article className={isQuestion ? 'ml-auto max-w-[76%]' : 'max-w-full'}>
      {!isQuestion && (
        <span className="mb-3 block text-sm font-medium text-neutral-400 dark:text-neutral-500">
          {t('conversation_share.answer_author')}
        </span>
      )}
      <div
        className={
          isQuestion
            ? 'rounded-2xl bg-neutral-100 px-4 py-3 text-[16px] leading-7 text-neutral-900 dark:bg-white dark:text-[#171717]'
            : 'conversation-share-markdown overflow-x-auto text-[16px] leading-8 text-neutral-800 dark:text-neutral-100 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-neutral-400 [&_blockquote]:pl-4 [&_blockquote]:text-neutral-600 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-[24px] [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[18px] [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-4 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-neutral-200 [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:px-3 [&_th]:py-2 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 dark:[&_blockquote]:border-neutral-600 dark:[&_blockquote]:text-neutral-300 dark:[&_code]:bg-neutral-800 dark:[&_td]:border-neutral-700 dark:[&_th]:border-neutral-700 dark:[&_th]:bg-neutral-800'
        }
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </article>
  );
}

function ShareFooter({ onOpenApp }: { onOpenApp: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDarkTheme = theme.content === 'dark';
  const title = t('conversation_share.open_app_cta');
  const subtitle = t('conversation_share.open_app_subtitle_dark');
  const catAsset = isDarkTheme
    ? '/images/conversation-share-cat-light.svg'
    : '/images/conversation-share-cat-dark.svg';
  const overlayStyle = {
    background: isDarkTheme
      ? 'linear-gradient(180deg, rgba(38, 38, 38, 0) 0%, rgba(38, 38, 38, 0.46) 46%, rgba(38, 38, 38, 0.78) 78%, rgba(38, 38, 38, 0.94) 94%, #262626 100%)'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.9) 90%, #FFFFFF 100%)',
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-40"
        style={overlayStyle}
      />
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-[184px] pb-[max(14px,env(safe-area-inset-bottom))]">
        <button
          aria-label={t('conversation_share.open_app')}
          className={
            isDarkTheme
              ? 'flex h-10 w-full items-center gap-2 overflow-hidden rounded-[10px] bg-[linear-gradient(90deg,#FAFAFA_0%,#FFFFFF_100%)] px-2.5 text-left text-[#171717] shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition-transform active:scale-[0.99]'
              : 'flex h-10 w-full items-center gap-2 overflow-hidden rounded-[10px] bg-[linear-gradient(90deg,#171717_0%,#404040_100%)] px-2.5 text-left text-white shadow-[0_4px_14px_rgba(0,0,0,0.16)] transition-transform active:scale-[0.99]'
          }
          onClick={onOpenApp}
          type="button"
        >
          <img
            alt=""
            aria-hidden="true"
            className="h-11 w-auto shrink-0 translate-y-2"
            src={catAsset}
          />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-[12px] font-medium leading-4">
              {title}
            </strong>
            <span
              className={
                isDarkTheme
                  ? 'mt-0.5 block truncate text-[6px] font-normal leading-2 text-neutral-500'
                  : 'mt-0.5 block truncate text-[6px] font-normal leading-2 text-neutral-300'
              }
            >
              {subtitle}
            </span>
          </span>
        </button>
        <p
          className={
            isDarkTheme
              ? 'mt-3 text-center text-[10px] font-normal leading-4 text-neutral-300'
              : 'mt-3 text-center text-[10px] font-normal leading-4 text-neutral-400'
          }
        >
          {t('conversation_share.ai_disclaimer')}
        </p>
      </div>
    </>
  );
}

function InvalidSharePage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-svh items-center justify-center bg-white px-6 text-center dark:bg-[#262626]">
      <section className="flex flex-col items-center">
        <img
          alt=""
          aria-hidden="true"
          className="size-28 object-contain"
          src="/images/deleteIcon.png"
        />
        <p className="mt-7 text-base leading-6 text-neutral-500 dark:text-neutral-400">
          {t('conversation_share.invalid')}
        </p>
      </section>
    </main>
  );
}

export default function ConversationSharePage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { share_id: shareId } = useParams();
  const { isInvalid, isLoading, share } = usePublicShare(shareId);
  const [showWeChatGuide, setShowWeChatGuide] = useState(false);
  const isDarkTheme = theme.content === 'dark';

  const handleOpenApp = useCallback(() => {
    if (!share?.id) return;
    launchOmniBox(share.id, () => setShowWeChatGuide(true));
  }, [share?.id]);

  useEffect(() => {
    document.title = share?.title
      ? `${share.title} - ${t('conversation_share.brand')}`
      : t('conversation_share.title');
  }, [share?.title, t]);

  if (isInvalid) return <InvalidSharePage />;

  return (
    <main className="h-full min-h-0 overflow-y-auto overscroll-y-contain bg-white pb-40 text-neutral-900 [-webkit-overflow-scrolling:touch] dark:bg-[#262626] dark:text-white">
      <header
        className={`mx-auto flex h-20 w-full max-w-[760px] items-center px-5 ${
          isDarkTheme ? 'justify-end' : 'justify-between'
        }`}
      >
        {!isDarkTheme && (
          <div className="flex min-w-0 items-center gap-3">
            <ChatIcon className="size-11 shrink-0 rounded-xl" />
            <span className="truncate text-[23px] font-semibold tracking-normal">
              {t('conversation_share.brand')}
            </span>
          </div>
        )}
        <button
          aria-label={t('conversation_share.open_app')}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg transition-transform active:scale-[0.98] ${
            isDarkTheme
              ? 'bg-white text-[#171717]'
              : 'ml-4 bg-[#171717] text-white'
          }`}
          onClick={handleOpenApp}
          type="button"
        >
          {t('conversation_share.open_app')}
        </button>
      </header>
      <div className="mx-auto w-full max-w-[760px] px-5 pb-8 pt-8">
        {isLoading ? (
          <div
            aria-label={t('conversation_share.loading')}
            className="animate-pulse space-y-6"
          >
            <div className="h-8 w-3/5 rounded bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            <div className="h-52 rounded bg-neutral-100 dark:bg-neutral-800" />
          </div>
        ) : (
          <>
            <h1 className="border-b border-neutral-200 pb-5 text-[28px] font-semibold leading-9 tracking-normal dark:border-neutral-700">
              {t('conversation_share.title')}
            </h1>
            {share?.groups.map((group, index) => (
              <section className="mt-8 space-y-7" key={`${share.id}-${index}`}>
                <SharedMessage content={group.question} role="question" />
                <SharedMessage content={group.answer} role="answer" />
              </section>
            ))}
          </>
        )}
      </div>
      {share && <ShareFooter onOpenApp={handleOpenApp} />}
      {showWeChatGuide && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/70 p-6 text-right text-base leading-7 text-white">
          <button
            aria-label={t('conversation_share.close_guide')}
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/15 text-2xl"
            onClick={() => setShowWeChatGuide(false)}
            type="button"
          >
            ×
          </button>
          <p className="mt-16 max-w-56">
            {t('conversation_share.wechat_guide')}
          </p>
        </div>
      )}
    </main>
  );
}

import axios from 'axios';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

import HomeMascot from './HomeMascot';

export interface RecommendedQuestionItem {
  id: string;
  question: string;
}

interface IProps {
  footer?: ReactNode;
  enabled: boolean;
  namespaceId: string;
  className?: string;
  compact?: boolean;
  onSelect: (item: RecommendedQuestionItem) => void;
}

export default function RecommendedQuestions({
  footer,
  enabled,
  namespaceId,
  className,
  compact = false,
  onSelect,
}: IProps) {
  const { t } = useTranslation();
  const [blinkSignal, setBlinkSignal] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<RecommendedQuestionItem[]>([]);

  useEffect(() => {
    setQuestions([]);
    setQuestionIndex(0);
    if (!enabled || !namespaceId) {
      return;
    }

    let active = true;
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/wizard/recommended-questions`, {
        cancelToken: source.token,
        mute: true,
      })
      .then((data: { questions?: RecommendedQuestionItem[] }) => {
        if (!active) {
          return;
        }
        setQuestions(data?.questions || []);
      })
      .catch(error => {
        if (active && !axios.isCancel(error)) {
          setQuestions([]);
        }
      });

    return () => {
      active = false;
      source.cancel();
    };
  }, [enabled, namespaceId]);

  const question =
    questions.length > 0
      ? questions[questionIndex % questions.length]
      : undefined;

  const handleNextQuestion = () => {
    setBlinkSignal(signal => signal + 1);
    if (questions.length > 1) {
      setQuestionIndex(index => index + 1);
    }
  };

  const handleSelect = () => {
    if (question) {
      onSelect(question);
    }
  };

  return (
    <div
      className={cn(
        'flex items-end overflow-hidden pt-8',
        compact
          ? 'min-h-0 gap-2 pl-4 sm:pl-8'
          : 'min-h-44 gap-6 pl-10 sm:pl-14',
        className
      )}
    >
      <button
        type="button"
        onClick={handleNextQuestion}
        aria-label={t('chat.home.nextRecommendedQuestion')}
        className={cn(
          'shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
          compact ? 'ml-2 -mb-4' : '-mb-6'
        )}
      >
        <HomeMascot blinkSignal={blinkSignal} compact={compact} />
      </button>
      <div className="min-w-0 flex-1 ml-4">
        <button
          type="button"
          onClick={handleSelect}
          disabled={!question}
          className={cn(
            'relative mb-4 flex min-w-0 items-center rounded-full text-left text-muted-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
            compact
              ? 'h-16 w-full pl-6 pr-5 text-xs'
              : 'h-[86px] max-h-[86px] w-[430.048px] pl-16 pr-8 text-sm sm:text-base'
          )}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full fill-white stroke-border dark:fill-muted"
            preserveAspectRatio="none"
            viewBox="0 0 403.033 124.392"
          >
            <path d="M75.529 0.5H341.472C375.195 0.5 402.533 27.8373 402.533 61.5596C402.533 95.1301 375.432 122.404 341.862 122.618L141.974 123.891L110.852 123.882L80.3015 123.873L13.0896 123.853C2.60239 123.849 -3.26877 111.762 3.21166 103.517L12.198 92.083C15.2767 88.1659 16.8343 83.2669 16.5837 78.291L15.8279 63.2832C14.1081 29.132 41.3346 0.500163 75.529 0.5Z" />
          </svg>
          <span className="relative min-w-0 w-full line-clamp-3 break-words">
            {question?.question ?? t('chat.textarea.placeholder')}
          </span>
        </button>
        <div className="min-h-8">{footer}</div>
      </div>
    </div>
  );
}

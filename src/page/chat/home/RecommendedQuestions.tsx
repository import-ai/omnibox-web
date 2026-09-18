import axios from 'axios';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/Spinner';
import { http } from '@/lib/request';

import HomeMascot from './HomeMascot';

export interface RecommendedQuestionItem {
  id: string;
  question: string;
}

interface IProps {
  footer?: ReactNode;
  enabled: boolean;
  namespaceId: string;
  loadingQuestionId?: string | null;
  onSelect: (item: RecommendedQuestionItem) => void;
}

export default function RecommendedQuestions({
  footer,
  enabled,
  namespaceId,
  loadingQuestionId,
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
    <div className="flex min-h-36 items-end gap-1 overflow-hidden pl-4 pt-8 sm:pl-8">
      <button
        type="button"
        onClick={handleNextQuestion}
        aria-label={t('chat.home.nextRecommendedQuestion')}
        disabled={!!loadingQuestionId}
        className="-mb-5 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
      >
        <HomeMascot blinkSignal={blinkSignal} />
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handleSelect}
          disabled={!question || !!loadingQuestionId}
          className="relative mb-4 flex h-20 w-full min-w-0 max-w-sm items-center rounded-full pl-12 pr-6 text-left text-sm text-foreground transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:pl-14 sm:text-base"
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full fill-white stroke-border dark:fill-muted"
            preserveAspectRatio="none"
            viewBox="0 0 243 71.4334"
          >
            <path
              transform="matrix(1 0 -0.02478 1 9.79 0)"
              d="M43.3358 0.5H197.856C217.104 0.50003 232.707 16.1031 232.707 35.3506C232.707 54.512 217.238 70.0788 198.077 70.2002L82.1258 70.9326L64.1161 70.9277L46.4364 70.9229L7.53892 70.9111C1.6635 70.9091 -1.61506 64.1262 2.03306 59.5205L7.18443 53.0166C8.99965 50.7247 9.91846 47.8506 9.77036 44.9307L9.33189 36.2734C8.34461 16.8166 23.8539 0.5 43.3358 0.5Z"
            />
          </svg>
          <span className="relative line-clamp-2 break-words">
            {question?.question ?? t('chat.textarea.placeholder')}
          </span>
          {question && loadingQuestionId === question.id && (
            <Spinner className="relative ml-2 shrink-0" />
          )}
        </button>
        <div className="min-h-8">{footer}</div>
      </div>
    </div>
  );
}

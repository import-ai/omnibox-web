import axios from 'axios';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

import HomeMascot from './HomeMascot';
import SpeechBubbleShape from './SpeechBubbleShape';

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

const QUESTION_FADE_DURATION_MS = 150;

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
  const [transitionPhase, setTransitionPhase] = useState<
    'idle' | 'fadingOut' | 'fadingIn'
  >('idle');

  useEffect(() => {
    setQuestions([]);
    setQuestionIndex(0);
    setTransitionPhase('idle');
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

  useEffect(() => {
    if (transitionPhase === 'idle') {
      return;
    }

    const timer = window.setTimeout(() => {
      if (transitionPhase === 'fadingOut') {
        setQuestionIndex(index => index + 1);
        setTransitionPhase('fadingIn');
      } else {
        setTransitionPhase('idle');
      }
    }, QUESTION_FADE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [transitionPhase, enabled, namespaceId]);

  const question =
    questions.length > 0
      ? questions[questionIndex % questions.length]
      : undefined;

  const handleNextQuestion = () => {
    if (transitionPhase !== 'idle') {
      return;
    }
    setBlinkSignal(signal => signal + 1);
    if (questions.length > 1) {
      setTransitionPhase('fadingOut');
    }
  };

  const handleSelect = () => {
    if (question && transitionPhase === 'idle') {
      onSelect(question);
    }
  };

  return (
    <div
      className={cn(
        'flex items-end pt-8',
        compact
          ? 'min-h-0 gap-2 overflow-hidden pl-4 sm:pl-8'
          : 'min-h-44 gap-8 pl-4 sm:pl-[50px]',
        className
      )}
    >
      <button
        type="button"
        onClick={handleNextQuestion}
        disabled={transitionPhase !== 'idle'}
        aria-label={t('chat.home.nextRecommendedQuestion')}
        className={cn(
          'shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
          compact ? 'ml-2 -mb-4' : '-mb-[26px]'
        )}
      >
        <HomeMascot blinkSignal={blinkSignal} compact={compact} />
      </button>
      <div className={cn('min-w-0 flex-1', compact && 'ml-4')}>
        <button
          type="button"
          onClick={handleSelect}
          disabled={!question || transitionPhase !== 'idle'}
          className={cn(
            'group relative mb-4 flex min-h-12 w-fit min-w-recommended-question max-w-recommended-question items-center rounded-full text-left text-sm font-normal leading-recommended-question text-muted-foreground transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compact ? 'pl-7 pr-5 py-3' : 'pl-8 pr-4 py-3',
            transitionPhase === 'fadingOut' && 'opacity-0'
          )}
        >
          <SpeechBubbleShape compact={compact} />
          <span
            className={cn(
              'relative z-[1] line-clamp-3 break-all transition-opacity duration-150 motion-reduce:transition-none',
              !question && 'opacity-60',
              transitionPhase === 'idle' && question && 'group-hover:opacity-80'
            )}
          >
            {question?.question ?? t('chat.textarea.placeholder')}
          </span>
        </button>
        <div className="min-h-8">{footer}</div>
      </div>
    </div>
  );
}

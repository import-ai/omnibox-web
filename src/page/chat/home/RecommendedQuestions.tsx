import axios from 'axios';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CopilotSpeechBubbleIcon from '@/assets/icons/CopilotSpeechBubbleIcon';
import SpeechBubbleIcon from '@/assets/icons/SpeechBubbleIcon';
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

  const BubbleIcon = compact ? CopilotSpeechBubbleIcon : SpeechBubbleIcon;

  return (
    <div
      className={cn(
        'flex items-end overflow-hidden pt-8',
        compact ? 'min-h-0 gap-2 pl-4 sm:pl-8' : 'min-h-44 gap-2 pl-4 sm:pl-14',
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
          compact ? 'ml-2 -mb-4' : '-mb-7'
        )}
      >
        <HomeMascot blinkSignal={blinkSignal} compact={compact} />
      </button>
      <div className="min-w-0 flex-1 ml-4">
        <button
          type="button"
          onClick={handleSelect}
          disabled={!question || transitionPhase !== 'idle'}
          className={cn(
            'group relative mb-4 flex min-h-18 w-fit min-w-recommended-question max-w-recommended-question items-center rounded-full text-left text-sm font-normal leading-recommended-question text-muted-foreground transition-opacity duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compact ? 'pl-7 pr-5 py-3' : 'pl-8 pr-4 py-4',
            transitionPhase === 'fadingOut' && 'opacity-0'
          )}
        >
          <BubbleIcon className="absolute inset-0 h-full w-full fill-chat-composer stroke-border dark:fill-chat-composer-dark dark:stroke-none" />
          <span
            className={cn(
              'relative line-clamp-3 break-all transition-opacity duration-150 motion-reduce:transition-none',
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

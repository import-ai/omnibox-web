import axios from 'axios';
import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { http } from '@/lib/request';

export interface RecommendedQuestionItem {
  id: string;
  question: string;
}

interface IProps {
  namespaceId: string;
  loadingQuestionId?: string | null;
  onSelect: (item: RecommendedQuestionItem) => void;
}

export default function RecommendedQuestions({
  namespaceId,
  loadingQuestionId,
  onSelect,
}: IProps) {
  const [questions, setQuestions] = useState<RecommendedQuestionItem[]>([]);

  useEffect(() => {
    setQuestions([]);
    if (!namespaceId) {
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
  }, [namespaceId]);

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {questions.map(item => (
        <Button
          key={item.id}
          variant="outline"
          size="sm"
          className="h-auto min-h-8 max-w-full whitespace-normal rounded-full px-3 py-1.5 font-normal text-muted-foreground hover:text-foreground disabled:border-neutral-200 disabled:bg-white disabled:text-muted-foreground dark:disabled:border-neutral-800 dark:disabled:bg-transparent dark:disabled:text-muted-foreground sm:max-w-xl"
          disabled={!!loadingQuestionId}
          loading={loadingQuestionId === item.id}
          onClick={() => onSelect(item)}
        >
          <span className="min-w-0 break-words text-center">
            {item.question}
          </span>
        </Button>
      ))}
    </div>
  );
}

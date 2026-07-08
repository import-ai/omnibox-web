import axios from 'axios';
import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { http } from '@/lib/request';

interface RecommendedQuestionItem {
  question: string;
}

interface IProps {
  namespaceId: string;
  loadingQuestion?: string | null;
  onSelect: (question: string) => void;
}

export default function RecommendedQuestions({
  namespaceId,
  loadingQuestion,
  onSelect,
}: IProps) {
  const [questions, setQuestions] = useState<RecommendedQuestionItem[]>([]);

  useEffect(() => {
    if (!namespaceId) return;
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/recommended-questions`, {
        cancelToken: source.token,
        mute: true,
      })
      .then((data: { questions?: RecommendedQuestionItem[] }) => {
        setQuestions(data?.questions || []);
      });
    return () => source.cancel();
  }, [namespaceId]);

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {questions.map(item => (
        <Button
          key={item.question}
          variant="outline"
          size="sm"
          className="rounded-full px-3 font-normal text-muted-foreground hover:text-foreground"
          disabled={!!loadingQuestion}
          loading={loadingQuestion === item.question}
          onClick={() => onSelect(item.question)}
        >
          {item.question}
        </Button>
      ))}
    </div>
  );
}

/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import HomeMascot from './HomeMascot';
import RecommendedQuestions from './RecommendedQuestions';

jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('keeps the mascot mounted before configuration and questions arrive', async () => {
  jest.useFakeTimers();
  const container = document.createElement('div');
  const root = createRoot(container);
  let resolveQuestions: (value: {
    questions: { id: string; question: string }[];
  }) => void = () => {
    throw new Error('Question request has not started');
  };
  jest.mocked(http.get).mockReturnValue(
    new Promise(resolve => {
      resolveQuestions = resolve;
    })
  );
  const onSelect = jest.fn();
  const render = (enabled: boolean) => (
    <RecommendedQuestions
      enabled={enabled}
      namespaceId="space"
      onSelect={onSelect}
    />
  );

  try {
    await act(async () => root.render(render(false)));
    const mascot = container.querySelector('svg');
    const bubble = container.querySelectorAll('button')[1];
    expect(mascot).not.toBeNull();
    expect(bubble.disabled).toBe(true);
    expect(bubble.textContent).toBe('chat.textarea.placeholder');
    expect(http.get).not.toHaveBeenCalled();

    await act(async () => root.render(render(true)));
    expect(container.querySelector('svg')).toBe(mascot);
    expect(container.querySelectorAll('button')[1]).toBe(bubble);

    expect(bubble.classList.contains('invisible')).toBe(false);

    await act(async () =>
      resolveQuestions({ questions: [{ id: 'one', question: 'Question' }] })
    );
    expect(container.querySelector('svg')).toBe(mascot);
    expect(container.querySelectorAll('button')[1]).toBe(bubble);
    expect(bubble.textContent).toBe('Question');
    expect(bubble.classList.contains('invisible')).toBe(false);
    expect(bubble.disabled).toBe(false);
    const mascotButton = container.querySelectorAll('button')[0];
    const initialEyes = mascot?.querySelector('g');
    expect(mascotButton.disabled).toBe(false);
    await act(async () => mascotButton.click());
    const blinkingEyes = mascot?.querySelector('g');
    expect(blinkingEyes).not.toBe(initialEyes);
    expect(
      blinkingEyes?.classList.contains('motion-safe:animate-cat-blink-on-press')
    ).toBe(true);
    expect(blinkingEyes?.querySelectorAll('path')).toHaveLength(4);
    await act(async () => jest.advanceTimersByTime(170));
    expect(
      mascot
        ?.querySelector('g')
        ?.classList.contains('motion-safe:animate-cat-blink-on-press')
    ).toBe(false);
    expect(bubble.textContent).toBe('Question');
    await act(async () => bubble.click());
    expect(onSelect).toHaveBeenCalledWith({ id: 'one', question: 'Question' });
  } finally {
    await act(async () => root.unmount());
    jest.useRealTimers();
  }
});

it('fades out before switching and prevents repeated switching during the fade', async () => {
  jest.useFakeTimers();
  const container = document.createElement('div');
  const root = createRoot(container);
  const questions = [
    { id: 'one', question: 'First question' },
    { id: 'two', question: 'Second question' },
    { id: 'three', question: 'Third question' },
  ];
  jest.mocked(http.get).mockResolvedValue({ questions });
  const onSelect = jest.fn();

  try {
    await act(async () =>
      root.render(
        <RecommendedQuestions enabled namespaceId="space" onSelect={onSelect} />
      )
    );
    const [mascot, bubble] = container.querySelectorAll('button');
    await act(async () => mascot.click());
    expect(bubble.textContent).toBe('First question');
    expect(bubble.classList.contains('opacity-0')).toBe(true);
    expect(bubble.disabled).toBe(true);
    await act(async () => {
      mascot.click();
      bubble.click();
      jest.advanceTimersByTime(150);
    });
    expect(onSelect).not.toHaveBeenCalled();
    expect(bubble.textContent).toBe('Second question');
    expect(bubble.classList.contains('opacity-0')).toBe(false);
    expect(mascot.disabled).toBe(true);
    await act(async () => jest.advanceTimersByTime(150));
    expect(mascot.disabled).toBe(false);
    await act(async () => bubble.click());
    expect(onSelect).toHaveBeenCalledWith(questions[1]);
    await act(async () => mascot.click());
  } finally {
    await act(async () => root.unmount());
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  }
});

it('blinks automatically and clears timers on unmount', async () => {
  jest.useFakeTimers();
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<HomeMascot blinkSignal={0} />));
    await act(async () => jest.advanceTimersByTime(4200));
    expect(
      container
        .querySelector('g')
        ?.classList.contains('motion-safe:animate-cat-blink-on-press')
    ).toBe(true);
    await act(async () => jest.advanceTimersByTime(170));
    expect(
      container
        .querySelector('g')
        ?.classList.contains('motion-safe:animate-cat-blink-on-press')
    ).toBe(false);
    await act(async () => jest.advanceTimersByTime(4030));
    expect(
      container
        .querySelector('g')
        ?.classList.contains('motion-safe:animate-cat-blink-on-press')
    ).toBe(true);
    expect(container.querySelectorAll('g path')).toHaveLength(4);
  } finally {
    await act(async () => root.unmount());
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  }
});

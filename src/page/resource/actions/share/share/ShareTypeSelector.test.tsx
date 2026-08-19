/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { ShareTypeSelector } from './ShareTypeSelector';

jest.mock('i18next', () => ({ t: (key: string) => key }));
jest.mock('@/components/ui/Select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid="share-type-option" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ShareTypeSelector', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('offers doc-only, chat-only and full sharing in that order', async () => {
    await act(async () => {
      root.render(<ShareTypeSelector shareType="doc_only" />);
    });

    const options = Array.from(
      container.querySelectorAll('[data-testid="share-type-option"]')
    );
    expect(options.map(option => option.getAttribute('data-value'))).toEqual([
      'doc_only',
      'chat_only',
      'all',
    ]);
    expect(options.map(option => option.textContent)).toEqual([
      'share.share.share_type.doc_only',
      'share.share.share_type.chat_only',
      'share.share.share_type.all',
    ]);
  });
});

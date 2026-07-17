import { renderToStaticMarkup } from 'react-dom/server';

import { TooltipProvider } from '@/components/tooltip';

import ContextCapacityIndicator from './ContextCapacityIndicator';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('ContextCapacityIndicator', () => {
  it('forwards tooltip trigger state to the capacity ring', () => {
    const html = renderToStaticMarkup(
      <TooltipProvider>
        <ContextCapacityIndicator
          capacity={{
            percent: 25,
            estimatedTokens: 1000,
            triggerTokens: 4000,
          }}
        />
      </TooltipProvider>
    );

    expect(html).toContain('role="img"');
    expect(html).toContain('data-state="closed"');
  });
});

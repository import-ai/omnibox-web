import { shouldShowChatHomeOnboarding } from './chatHomeOnboarding';

describe('shouldShowChatHomeOnboarding', () => {
  it('shows when there is no conversation history and remaining credits exceed 100', () => {
    expect(
      shouldShowChatHomeOnboarding({
        hasConversationHistory: false,
        remainingCredits: 101,
      })
    ).toBe(true);
  });

  it('hides when remaining credits are 100 or less', () => {
    expect(
      shouldShowChatHomeOnboarding({
        hasConversationHistory: false,
        remainingCredits: 100,
      })
    ).toBe(false);
    expect(
      shouldShowChatHomeOnboarding({
        hasConversationHistory: false,
        remainingCredits: 0,
      })
    ).toBe(false);
  });

  it('hides until remaining credits are known', () => {
    expect(
      shouldShowChatHomeOnboarding({
        hasConversationHistory: false,
        remainingCredits: undefined,
      })
    ).toBe(false);
  });

  it('hides when conversation history exists or is still loading', () => {
    expect(
      shouldShowChatHomeOnboarding({
        hasConversationHistory: true,
        remainingCredits: 1000,
      })
    ).toBe(false);
    expect(
      shouldShowChatHomeOnboarding({
        hasConversationHistory: null,
        remainingCredits: 1000,
      })
    ).toBe(false);
  });
});

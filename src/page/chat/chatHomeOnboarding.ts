export const CHAT_HOME_ONBOARDING_MIN_CREDITS = 100;

export function shouldShowChatHomeOnboarding({
  hasConversationHistory,
  remainingCredits,
}: {
  hasConversationHistory: boolean | null;
  remainingCredits: number | undefined;
}): boolean {
  return (
    hasConversationHistory === false &&
    remainingCredits !== undefined &&
    remainingCredits > CHAT_HOME_ONBOARDING_MIN_CREDITS
  );
}

/**
 * localStorage utilities for persisting branch selections across page refreshes
 *
 * 用于重新编辑场景：记录每个用户消息对应选择了哪个助手回复
 * 例如：{ "user-msg-id-1": "assistant-msg-id-2" } 表示在 user-msg-id-1 的多个回复中选择了 assistant-msg-id-2
 */

const STORAGE_KEY_PREFIX = 'conversation-branch-selections-';

export type BranchSelections = Record<string, string>; // userMessageId -> selectedAssistantId

/**
 * Save branch selections to localStorage
 */
export function saveBranchSelections(
  conversationId: string,
  selections: BranchSelections
) {
  try {
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${conversationId}`,
      JSON.stringify(selections)
    );
  } catch (error) {
    console.warn('Failed to save branch selections to localStorage:', error);
  }
}

/**
 * Get branch selections from localStorage
 */
export function getBranchSelections(conversationId: string): BranchSelections {
  try {
    const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${conversationId}`);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.warn('Failed to get branch selections from localStorage:', error);
    return {};
  }
}

/**
 * Clear branch selections from localStorage
 */
export function clearBranchSelections(conversationId: string) {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${conversationId}`);
  } catch (error) {
    console.warn('Failed to clear branch selections from localStorage:', error);
  }
}

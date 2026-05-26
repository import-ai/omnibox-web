import { ToolType } from './types';

export interface ConversationPreferences {
  tools?: Array<{ name: ToolType.WEB_SEARCH }>;
  enable_thinking?: boolean;
}

export function toolsToPreferences(
  tools: ToolType[]
): ConversationPreferences | null {
  const hasWebSearch = tools.includes(ToolType.WEB_SEARCH);
  const enableThinking = tools.includes(ToolType.REASONING);

  if (!hasWebSearch && !enableThinking) {
    return null;
  }

  const preferences: ConversationPreferences = {};
  if (hasWebSearch) {
    preferences.tools = [{ name: ToolType.WEB_SEARCH }];
  }
  if (enableThinking) {
    preferences.enable_thinking = true;
  }
  return preferences;
}

export function preferencesToTools(
  preferences?: ConversationPreferences | null
): ToolType[] {
  const tools: ToolType[] = [];

  if (preferences?.tools?.some(tool => tool.name === ToolType.WEB_SEARCH)) {
    tools.push(ToolType.WEB_SEARCH);
  }
  if (preferences?.enable_thinking) {
    tools.push(ToolType.REASONING);
  }

  return tools;
}

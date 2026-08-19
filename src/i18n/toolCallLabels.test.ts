import * as en from './locales/en.json';
import * as zh from './locales/zh.json';

// A tool call whose name has no entry here renders its raw i18n key as the
// approval card title (DecisionInput), falls back to "unknown" in the message
// list (AssistantMessage), and — because the two resolve differently — is never
// matched back to its interrupt, so it never shows as INTERRUPTED.
const labels = (locale: typeof en | typeof zh): Record<string, string> =>
  locale.chat.messages.tool_calls.function_name as Record<string, string>;

const AGENT_TOOLS = [
  'create_smart_folder',
  'get_smart_folder_config',
  'update_smart_folder_config',
  'create_rss_folder',
  'get_rss_folder_config',
  'update_rss_folder_config',
];

describe('tool call labels', () => {
  it.each(AGENT_TOOLS)('labels %s in every locale', name => {
    for (const locale of [en, zh]) {
      const label = labels(locale)[name];
      expect(label).toBeTruthy();
      // The raw key would be shown verbatim by the approval card.
      expect(label).not.toBe(name);
      expect(label).not.toBe(labels(locale).unknown);
    }
  });

  it('keeps the same tool names in every locale', () => {
    expect(Object.keys(labels(zh)).sort()).toEqual(
      Object.keys(labels(en)).sort()
    );
  });

  it('resolves the same label for a tool call and for its interrupt', () => {
    // AssistantMessage resolves the tool call with an "unknown" fallback and the
    // interrupt without one, then compares the two strings to mark INTERRUPTED.
    for (const name of AGENT_TOOLS) {
      const fromToolCall = labels(en)[name] ?? labels(en).unknown;
      const fromInterrupt = labels(en)[name] ?? name;
      expect(fromToolCall).toBe(fromInterrupt);
    }
  });
});

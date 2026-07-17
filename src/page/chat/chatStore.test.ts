import { normalizeResourceContexts } from './chat-input/resourceContexts';
import { readChatContextStorage } from './chatStore';

describe('readChatContextStorage', () => {
  it('migrates legacy raw-array chat_context values', () => {
    const legacy = [
      {
        type: 'resource',
        resource: {
          id: 'r1',
          name: 'note.md',
          parent_id: null,
          resource_type: 'file',
        },
      },
    ];

    expect(readChatContextStorage(JSON.stringify(legacy))).toEqual({
      state: {
        selectedResources: normalizeResourceContexts(legacy),
      },
      version: 0,
    });
  });

  it('reads zustand persist payload shape', () => {
    const selectedResources = normalizeResourceContexts([
      {
        type: 'folder',
        resource: {
          id: 'f1',
          name: 'Docs',
          parent_id: null,
          resource_type: 'folder',
          has_children: true,
        },
      },
    ]);

    expect(
      readChatContextStorage(
        JSON.stringify({
          state: { selectedResources },
          version: 0,
        })
      )
    ).toEqual({
      state: { selectedResources },
      version: 0,
    });
  });

  it('returns null for empty or invalid payloads', () => {
    expect(readChatContextStorage(null)).toBeNull();
    expect(readChatContextStorage('not-json')).toBeNull();
    expect(readChatContextStorage(JSON.stringify(null))).toBeNull();
  });
});

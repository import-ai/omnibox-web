import { ToolCallStatus } from '@/page/chat/core/types/toolCall';

import {
  collectStreamingToolCallOperations,
  fallbackOperationsForToolCall,
  resourceIdFromProcessedArgs,
} from './toolCallOperations';

describe('resourceIdFromProcessedArgs', () => {
  it('reads resource_id from processed tool arguments', () => {
    expect(
      resourceIdFromProcessedArgs([
        { key: 'path', display: '/private/doc.md' },
        { key: 'resource_id', display: 'resource-a', resourceId: 'resource-a' },
      ])
    ).toBe('resource-a');
  });
});

describe('fallbackOperationsForToolCall', () => {
  it('fires delete_resource when a delete tool succeeds', () => {
    expect(
      fallbackOperationsForToolCall({
        functionName: 'delete_resource',
        resourceId: 'resource-a',
        status: ToolCallStatus.SUCCESS,
      })
    ).toEqual([
      { name: 'delete_resource', args: { resource_id: 'resource-a' } },
    ]);
  });

  it('fires update_resource when an edit tool succeeds', () => {
    expect(
      fallbackOperationsForToolCall({
        functionName: 'edit_resource',
        resourceId: 'resource-a',
        status: ToolCallStatus.SUCCESS,
      })
    ).toEqual([
      { name: 'update_resource', args: { resource_id: 'resource-a' } },
    ]);
  });

  it('ignores failed or incomplete tool calls', () => {
    expect(
      fallbackOperationsForToolCall({
        functionName: 'delete_resource',
        resourceId: 'resource-a',
        status: ToolCallStatus.FAILED,
      })
    ).toEqual([]);
    expect(
      fallbackOperationsForToolCall({
        functionName: 'delete_resource',
        status: ToolCallStatus.SUCCESS,
      })
    ).toEqual([]);
  });
});

describe('collectStreamingToolCallOperations', () => {
  it('synthesizes a delete operation when the backend omitted operations', () => {
    const processed = new Set<string>();

    expect(
      collectStreamingToolCallOperations(
        [
          {
            functionName: 'delete_resource',
            inStreaming: true,
            resourceId: 'resource-a',
            status: ToolCallStatus.SUCCESS,
            toolMessageId: 'tool-message-a',
          },
        ],
        processed
      )
    ).toEqual([
      { name: 'delete_resource', args: { resource_id: 'resource-a' } },
    ]);
    expect(processed.has('tool-message-a')).toBe(true);
  });

  it('does not replay historical tool calls', () => {
    expect(
      collectStreamingToolCallOperations(
        [
          {
            functionName: 'delete_resource',
            inStreaming: false,
            resourceId: 'resource-a',
            status: ToolCallStatus.SUCCESS,
            toolMessageId: 'tool-message-a',
          },
        ],
        new Set()
      )
    ).toEqual([]);
  });

  it('processes a completed call without waiting for other calls', () => {
    const processed = new Set<string>();

    expect(
      collectStreamingToolCallOperations(
        [
          {
            functionName: 'edit_resource',
            inStreaming: true,
            resourceId: 'resource-a',
            status: ToolCallStatus.SUCCESS,
            toolMessageId: 'tool-message-a',
          },
          {
            functionName: 'delete_resource',
            inStreaming: true,
            operations: [
              {
                name: 'delete_resource',
                args: { resource_id: 'resource-b' },
              },
            ],
            resourceId: 'resource-b',
            status: ToolCallStatus.RUNNING,
            toolMessageId: 'tool-message-b',
          },
        ],
        processed
      )
    ).toEqual([
      { name: 'update_resource', args: { resource_id: 'resource-a' } },
    ]);
    expect(processed).toEqual(new Set(['tool-message-a']));
  });

  it('dedupes backend operations with the fallback', () => {
    expect(
      collectStreamingToolCallOperations(
        [
          {
            functionName: 'delete_resource',
            inStreaming: true,
            operations: [
              {
                name: 'delete_resource',
                args: { resource_id: 'resource-a' },
              },
            ],
            resourceId: 'resource-a',
            status: ToolCallStatus.SUCCESS,
            toolMessageId: 'tool-message-a',
          },
        ],
        new Set()
      )
    ).toEqual([
      { name: 'delete_resource', args: { resource_id: 'resource-a' } },
    ]);
  });

  it('waits for backend operations when fallback cannot synthesize one', () => {
    const processed = new Set<string>();
    const pendingToolCall = {
      functionName: 'edit_file',
      inStreaming: true,
      status: ToolCallStatus.SUCCESS,
      toolMessageId: 'tool-message-a',
    };

    expect(
      collectStreamingToolCallOperations([pendingToolCall], processed)
    ).toEqual([]);
    expect(processed.has('tool-message-a')).toBe(false);

    expect(
      collectStreamingToolCallOperations(
        [
          {
            ...pendingToolCall,
            operations: [
              {
                name: 'update_resource',
                args: { resource_id: 'resource-a' },
              },
            ],
          },
        ],
        processed
      )
    ).toEqual([
      { name: 'update_resource', args: { resource_id: 'resource-a' } },
    ]);
    expect(processed.has('tool-message-a')).toBe(true);
  });
});

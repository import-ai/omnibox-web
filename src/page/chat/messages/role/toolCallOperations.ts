import type { ProcessedArg } from '@/lib/toolArgs';
import type { ToolCallFrontendOperation } from '@/page/chat/core/types/conversation';
import { ToolCallStatus } from '@/page/chat/core/types/toolCall';

const RESOURCE_UPDATE_TOOLS = new Set([
  'add_tag_to_resource',
  'edit_file',
  'edit_resource',
  'move_resource',
  'remove_tag_from_resource',
  'rename_resource',
  'write_file',
]);

const RESOURCE_DELETE_TOOLS = new Set(['delete_resource']);

export function resourceIdFromProcessedArgs(
  args: ProcessedArg[]
): string | undefined {
  return args.find(arg => arg.key === 'resource_id')?.resourceId;
}

export function fallbackOperationsForToolCall(input: {
  functionName: string;
  resourceId?: string;
  status: string;
}): ToolCallFrontendOperation[] {
  if (input.status !== ToolCallStatus.SUCCESS || !input.resourceId) {
    return [];
  }
  if (RESOURCE_DELETE_TOOLS.has(input.functionName)) {
    return [
      { name: 'delete_resource', args: { resource_id: input.resourceId } },
    ];
  }
  if (RESOURCE_UPDATE_TOOLS.has(input.functionName)) {
    return [
      { name: 'update_resource', args: { resource_id: input.resourceId } },
    ];
  }
  return [];
}

export function dedupeToolCallFrontendOperations(
  operations: ToolCallFrontendOperation[]
): ToolCallFrontendOperation[] {
  const deduplicated: ToolCallFrontendOperation[] = [];
  for (const operation of operations) {
    if (
      !deduplicated.some(
        item =>
          item.name === operation.name &&
          item.args?.resource_id === operation.args?.resource_id
      )
    ) {
      deduplicated.push(operation);
    }
  }
  return deduplicated;
}

export function collectStreamingToolCallOperations(
  toolCalls: Array<{
    functionName: string;
    inStreaming?: boolean;
    operations?: ToolCallFrontendOperation[];
    resourceId?: string;
    status: string;
    toolMessageId?: string;
  }>,
  processedToolMessageIds: Set<string>
): ToolCallFrontendOperation[] {
  const operations: ToolCallFrontendOperation[] = [];
  for (const toolCall of toolCalls) {
    if (!toolCall.inStreaming || !toolCall.toolMessageId) continue;
    if (processedToolMessageIds.has(toolCall.toolMessageId)) continue;
    const nextOperations = [
      ...(toolCall.operations ?? []),
      ...fallbackOperationsForToolCall(toolCall),
    ];
    if (nextOperations.length === 0) continue;
    processedToolMessageIds.add(toolCall.toolMessageId);
    operations.push(...nextOperations);
  }
  return dedupeToolCallFrontendOperations(operations);
}

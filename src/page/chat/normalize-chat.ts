import { MessageDetail } from './types/conversation';

// Normalize chat data, supporting multi-turn conversations. Only merge when consecutive tool calls are detected.
export function normalizeChatData(rawData: MessageDetail[]): MessageDetail[] {
  if (!Array.isArray(rawData) || rawData.length <= 0) {
    return rawData;
  }

  // Group data by conversation rounds (each round starts with a user message)
  const conversationRounds = groupByConversationRounds(rawData);

  // Process each round
  const processedRounds = conversationRounds.map(round =>
    processConversationRound(round)
  );

  // Flatten processed rounds
  const result = processedRounds.flat();

  return rebuildRelationships(result);
}

/**
 * Group chat data by conversation rounds, each round starts with a user message
 */
function groupByConversationRounds(
  rawData: MessageDetail[]
): MessageDetail[][] {
  const rounds: MessageDetail[][] = [];
  let currentRound: MessageDetail[] = [];

  for (const node of rawData) {
    // Start a new round when encountering a user message
    if (node.message.role === 'user') {
      // Save the current round if not empty
      if (currentRound.length > 0) {
        rounds.push(currentRound);
      }
      // Start a new round
      currentRound = [node];
    } else {
      // Add non-user messages to the current round
      currentRound.push(node);
    }
  }

  // Add the last round
  if (currentRound.length > 0) {
    rounds.push(currentRound);
  }

  return rounds;
}

/**
 * Process consecutive tool calls in a single conversation round
 * Simplified logic: only keep the last group of consecutive assistant(tool_calls) → tool, discard other intermediate data
 */
function processConversationRound(roundData: MessageDetail[]): MessageDetail[] {
  if (roundData.length === 0) {
    return roundData;
  }

  // Detect if there are consecutive tool calls in this round
  if (!hasConsecutiveToolCallsInRound(roundData)) {
    // No consecutive tool calls, return original data
    return roundData;
  }

  // Find all consecutive assistant → tool groups
  const consecutiveGroups = findConsecutiveGroups(roundData);

  if (consecutiveGroups.length === 0) {
    return roundData;
  }

  // Only keep the last group, discard other intermediate groups
  const lastGroup = consecutiveGroups[consecutiveGroups.length - 1];
  const toRemoveIds = new Set<string>();

  // Mark intermediate groups to be removed
  for (let i = 0; i < consecutiveGroups.length - 1; i++) {
    const group = consecutiveGroups[i];
    toRemoveIds.add(group.assistantId);
    // Add all tool nodes of the group
    group.toolIds.forEach(toolId => toRemoveIds.add(toolId));
  }

  // Filter out nodes to be removed
  const filteredData = roundData.filter(node => !toRemoveIds.has(node.id));

  // Merge citations data from all removed tool nodes into the last group
  const mergedCitations = collectCitationsFromRemovedTools(
    roundData,
    toRemoveIds
  );

  // Update parent-child relationships for the last group
  return updateRelationshipsForLastGroup(
    filteredData,
    lastGroup,
    mergedCitations
  );
}

/**
 * Find all consecutive assistant(tool_calls) → tool(s) groups
 * One assistant may be followed by 1-3 tool messages
 */
function findConsecutiveGroups(roundData: MessageDetail[]): Array<{
  assistantId: string;
  toolIds: string[];
  assistantNode: MessageDetail;
  toolNodes: MessageDetail[];
}> {
  const nodeMap = new Map<string, MessageDetail>();
  roundData.forEach(node => {
    nodeMap.set(node.id, node);
  });

  const groups: Array<{
    assistantId: string;
    toolIds: string[];
    assistantNode: MessageDetail;
    toolNodes: MessageDetail[];
  }> = [];

  for (const node of roundData) {
    // Find assistant(tool_calls) nodes
    if (node.message.role === 'assistant' && node.message.tool_calls) {
      // Collect all tool child nodes after this assistant (up to 3)
      const toolNodes = findAllToolChildren(node, nodeMap);
      if (toolNodes.length > 0) {
        groups.push({
          assistantId: node.id,
          toolIds: toolNodes.map(t => t.id),
          assistantNode: node,
          toolNodes: toolNodes,
        });
      }
    }
  }

  return groups;
}

/**
 * Find all tool child nodes after an assistant node (chain search, up to 3)
 * Note: tool nodes may be chained, need to search along the chain
 */
function findAllToolChildren(
  assistantNode: MessageDetail,
  nodeMap: Map<string, MessageDetail>
): MessageDetail[] {
  const toolNodes: MessageDetail[] = [];

  // Start from assistant, search all tool nodes along the children chain
  let currentNodeId = assistantNode.children[0];

  while (currentNodeId && toolNodes.length < 3) {
    const currentNode = nodeMap.get(currentNodeId);
    if (!currentNode) break;

    if (currentNode.message.role === 'tool') {
      toolNodes.push(currentNode);
      // Continue searching the next node (could be another tool or assistant)
      currentNodeId = currentNode.children[0];
    } else {
      // Stop if not a tool node
      break;
    }
  }

  return toolNodes;
}

/**
 * Collect all citations data from removed tool nodes
 */
function collectCitationsFromRemovedTools(
  roundData: MessageDetail[],
  toRemoveIds: Set<string>
): any[] {
  const allCitations: any[] = [];

  for (const node of roundData) {
    // If it's a removed tool node and has citations
    if (
      toRemoveIds.has(node.id) &&
      node.message.role === 'tool' &&
      (node as any).attrs?.citations
    ) {
      allCitations.push(...(node as any).attrs.citations);
    }
  }

  return allCitations;
}

/**
 * Update parent-child relationships for the last group, connect it to where the removed nodes should connect
 * Also merge citations data from removed nodes
 */
function updateRelationshipsForLastGroup(
  filteredData: MessageDetail[],
  lastGroup: {
    assistantId: string;
    toolIds: string[];
    assistantNode: MessageDetail;
    toolNodes: MessageDetail[];
  },
  mergedCitations: any[]
): MessageDetail[] {
  // Find user message (the first message of each round)
  const userMessage = filteredData.find(node => node.message.role === 'user');
  if (!userMessage) {
    return filteredData;
  }

  // Update the last group's data
  const updatedData = filteredData.map(node => {
    // Update assistant's parent_id to point to user message
    if (node.id === lastGroup.assistantId) {
      return {
        ...node,
        parent_id: userMessage.id,
      };
    }

    // Update the first tool node of the last group, merge citations data
    if (
      lastGroup.toolIds.includes(node.id) &&
      lastGroup.toolIds[0] === node.id
    ) {
      const existingCitations = (node as any).attrs?.citations || [];
      return {
        ...node,
        attrs: {
          ...((node as any).attrs || {}),
          citations: [...existingCitations, ...mergedCitations],
        },
      };
    }

    return node;
  });

  return updatedData;
}

/**
 * Detect if there are consecutive tool calls in a single conversation round
 * Consecutive means: assistant(tool_calls) → tool → assistant(tool_calls) → tool ...
 */
function hasConsecutiveToolCallsInRound(roundData: MessageDetail[]): boolean {
  const nodeMap = new Map<string, MessageDetail>();
  roundData.forEach(node => {
    nodeMap.set(node.id, node);
  });

  for (const node of roundData) {
    if (node.message.role === 'assistant' && node.message.tool_calls) {
      // Check if this assistant has subsequent consecutive tool calls
      if (countConsecutiveToolCalls(node, nodeMap) > 1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Count the number of consecutive tool calls starting from the given assistant node
 * Simplified version: only check direct assistant→tool pairs
 */
function countConsecutiveToolCalls(
  assistantNode: MessageDetail,
  nodeMap: Map<string, MessageDetail>
): number {
  let count = 0;
  let currentNode = assistantNode;

  while (
    currentNode.message.role === 'assistant' &&
    currentNode.message.tool_calls &&
    (!currentNode.message.content || currentNode.message.content.trim() === '')
  ) {
    // Find the next tool node
    const toolNode = findImmediateTool(currentNode, nodeMap);
    if (!toolNode) break;

    count++;

    // Find the next node after the tool node
    const firstChildId = toolNode.children[0];
    if (!firstChildId) break;

    const nextNode = nodeMap.get(firstChildId);
    if (!nextNode || nextNode.message.role !== 'assistant') break;

    currentNode = nextNode;
  }

  return count;
}

/**
 * Find the immediate tool message
 */
function findImmediateTool(
  assistantNode: MessageDetail,
  nodeMap: Map<string, MessageDetail>
): MessageDetail | null {
  // Check if the first child node is a tool
  const firstChildId = assistantNode.children[0];
  if (!firstChildId) return null;

  const firstChild = nodeMap.get(firstChildId);
  if (!firstChild || firstChild.message.role !== 'tool') return null;

  return firstChild;
}

/**
 * Rebuild parent-child relationships between nodes
 */
function rebuildRelationships(nodes: MessageDetail[]): MessageDetail[] {
  if (nodes.length === 0) return nodes;

  // Create a new node map
  const nodeMap = new Map<string, MessageDetail>();
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Re-establish parent-child relationships
  for (let i = 1; i < nodes.length; i++) {
    const currentNode = nodes[i];
    const parentId = currentNode.parent_id;

    if (parentId && nodeMap.has(parentId)) {
      const parentNode = nodeMap.get(parentId)!;
      if (!parentNode.children.includes(currentNode.id)) {
        parentNode.children.push(currentNode.id);
      }
    }
  }

  return Array.from(nodeMap.values());
}

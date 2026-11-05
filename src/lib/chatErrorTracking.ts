import {
  type ChatErrorDetails,
  chatErrorDetails,
  chatErrorKey,
  type ChatErrorName,
  isChatCancellation,
} from '@/lib/chatErrors';
import * as tracking from '@/lib/sendTrackEvent';

export type ChatErrorStage =
  | 'prepare'
  | 'upload'
  | 'transport'
  | 'http'
  | 'stream'
  | 'resume'
  | 'decision'
  | 'history'
  | 'protocol'
  | 'display';

export type ChatErrorGroup =
  'network' | 'auth' | 'request' | 'service' | 'quota' | 'device' | 'unknown';

export interface ChatErrorContext {
  conversationId?: string;
  requestId?: string;
  messageId?: string;
  parentMessageId?: string;
  channel?: string;
  stage: ChatErrorStage;
  shareId?: string;
  userVisible?: boolean;
  retryable?: boolean;
  clientState?: string;
  source?: 'client' | 'server';
}

const errorGroups: Record<ChatErrorName, ChatErrorGroup> = {
  stream_interrupted: 'network',
  stream_send_failed: 'network',
  content_review: 'request',
  output_content_review: 'request',
  upstream_error: 'service',
  unknown: 'unknown',
  request_failed: 'service',
  connection_interrupted: 'network',
  response_unreadable: 'service',
  timeout: 'network',
  unauthorized: 'auth',
  forbidden: 'auth',
  not_found: 'request',
  invalid_request: 'request',
  rate_limited: 'quota',
  service_unavailable: 'service',
  busy: 'service',
  pending_decision: 'service',
  decision_not_applied: 'service',
  already_decided: 'service',
  upload_failed: 'request',
  file_too_large: 'request',
  unsupported_file: 'request',
  attachment_unavailable: 'request',
  storage_full: 'quota',
  credits_exhausted: 'quota',
  namespace_not_found: 'request',
  private_root_unavailable: 'request',
  tool_failed: 'service',
  device_offline: 'device',
  device_revoked: 'device',
  approval_expired: 'device',
  execution_changed: 'device',
  execution_unavailable: 'device',
  share_unavailable: 'request',
};

const retryableGroups = new Set<ChatErrorGroup>([
  'network',
  'service',
  'quota',
]);

const controlFlowErrorNames = new Set<ChatErrorName>([
  'pending_decision',
  'decision_not_applied',
  'already_decided',
]);
const controlFlowErrorCodes = new Set([
  'pending_interrupt',
  'decision_not_applied',
  'interrupt_already_decided',
]);

const deduped = new Map<string, number>();
const DEDUPE_TTL_MS = 5 * 60 * 1000;
const MAX_DEDUPE_ENTRIES = 500;

function chatErrorName(error: unknown): ChatErrorName {
  return chatErrorKey(error).slice('chat.errors.'.length) as ChatErrorName;
}

function isControlFlowError(error: unknown, name: ChatErrorName) {
  const code = chatErrorDetails(error).code?.toLowerCase();
  return (
    controlFlowErrorNames.has(name) ||
    (code !== undefined && controlFlowErrorCodes.has(code))
  );
}

function sanitizeMessage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const sanitized = value
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(
      /\b(token|authorization|cookie|password|secret|api[_-]?key)\b\s*[:=]\s*[^\s,;]+/gi,
      '$1=[redacted]'
    )
    .replace(/\s+/g, ' ')
    .trim();
  return sanitized ? sanitized.slice(0, 512) : undefined;
}

function isDuplicate(eventKey: string) {
  const key = `${tracking.getChatErrorScope?.() ?? ''}:${eventKey}`;
  const now = Date.now();
  for (const [entry, expiresAt] of deduped) {
    if (expiresAt <= now) deduped.delete(entry);
  }
  if (deduped.has(key)) return true;
  deduped.set(key, now + DEDUPE_TTL_MS);
  if (deduped.size > MAX_DEDUPE_ENTRIES) {
    const oldest = deduped.keys().next().value;
    if (oldest) deduped.delete(oldest);
  }
  return false;
}

export function chatErrorGroup(error: unknown): ChatErrorGroup {
  return errorGroups[chatErrorName(error)] ?? 'unknown';
}

export function chatErrorDedupeKey(error: unknown, context: ChatErrorContext) {
  const details = chatErrorDetails(error);
  return [
    context.requestId || context.conversationId || 'unknown',
    context.stage,
    details.code?.toLowerCase() || chatErrorName(error),
    context.clientState || '',
    context.userVisible === false ? 'hidden' : 'visible',
  ].join(':');
}

function chatErrorDisplayDedupeKey(
  displayMessage: string,
  context: ChatErrorContext
) {
  return [
    'display',
    context.conversationId || 'unknown',
    context.messageId || 'unknown',
    context.requestId || 'unknown',
    displayMessage,
  ].join(':');
}

/**
 * Reports the exact red error text rendered in the conversation. This is
 * separate from reportChatError: the latter records an error occurrence, while
 * this records that the user actually saw a specific piece of red copy.
 */
export function reportChatErrorDisplay(
  displayMessage: string,
  context: ChatErrorContext,
  error?: unknown
) {
  if (!displayMessage) return;
  const name = error === undefined ? 'unknown' : chatErrorName(error);
  const details: ChatErrorDetails =
    error === undefined ? {} : chatErrorDetails(error);
  const group = errorGroups[name] ?? 'unknown';
  const dedupeKey = chatErrorDisplayDedupeKey(displayMessage, context);
  if (isDuplicate(dedupeKey)) return;

  const props = {
    schema_version: 1,
    conversation_id: context.conversationId,
    request_id: context.requestId,
    message_id: context.messageId,
    parent_message_id: context.parentMessageId,
    channel: context.channel,
    stage: 'display',
    error_category: name,
    error_group: group,
    error_code: details.code,
    http_status: details.status,
    error_message: sanitizeMessage(details.message),
    display_message: displayMessage,
    error_surface: 'inline',
    user_visible: true,
    retryable: context.retryable ?? retryableGroups.has(group),
    client_state: context.clientState ?? 'display',
    share_id: context.shareId,
    source: context.source ?? 'client',
    dedupe_key: dedupeKey,
  };

  void tracking.track('chat_error', props).catch(() => undefined);
}

export function reportChatError(error: unknown, context: ChatErrorContext) {
  if (isChatCancellation(error)) return;
  const name = chatErrorName(error);
  if (isControlFlowError(error, name)) return;
  const details = chatErrorDetails(error);
  const group = errorGroups[name] ?? 'unknown';
  const dedupeKey = chatErrorDedupeKey(error, context);
  if (isDuplicate(dedupeKey)) return;

  const props = {
    schema_version: 1,
    conversation_id: context.conversationId,
    request_id: context.requestId,
    message_id: context.messageId,
    parent_message_id: context.parentMessageId,
    channel: context.channel,
    stage: context.stage,
    error_category: name,
    error_group: group,
    error_code: details.code,
    http_status: details.status,
    error_message: sanitizeMessage(details.message),
    user_visible: context.userVisible ?? true,
    retryable: context.retryable ?? retryableGroups.has(group),
    client_state: context.clientState ?? context.stage,
    share_id: context.shareId,
    source: context.source ?? 'client',
    dedupe_key: dedupeKey,
  };

  void tracking.track('chat_error', props).catch(() => undefined);
}

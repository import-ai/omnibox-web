export const chatErrorNames = [
  'unknown',
  'request_failed',
  'connection_interrupted',
  'stream_interrupted',
  'stream_send_failed',
  'response_unreadable',
  'timeout',
  'unauthorized',
  'forbidden',
  'not_found',
  'invalid_request',
  'rate_limited',
  'service_unavailable',
  'busy',
  'pending_decision',
  'decision_not_applied',
  'already_decided',
  'upload_failed',
  'file_too_large',
  'unsupported_file',
  'attachment_unavailable',
  'storage_full',
  'credits_exhausted',
  'namespace_not_found',
  'private_root_unavailable',
  'tool_failed',
  'device_offline',
  'device_revoked',
  'approval_expired',
  'execution_changed',
  'execution_unavailable',
  'share_unavailable',
  'content_review',
  'output_content_review',
  'upstream_error',
] as const;
export type ChatErrorName = (typeof chatErrorNames)[number];
export type ChatErrorKey = `chat.errors.${ChatErrorName}`;

export interface ChatErrorDetails {
  code?: string;
  status?: number;
  message?: string;
}

const objectOf = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const textOf = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export function chatErrorDetails(error: unknown): ChatErrorDetails {
  if (typeof error === 'string') {
    try {
      const parsed: unknown = JSON.parse(error);
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed)
      )
        error = parsed;
    } catch {
      // Legacy message text is classified without exposing it to the UI.
    }
  }
  const value = objectOf(error);
  const response = objectOf(value.response);
  const payload = response.data === undefined ? value : objectOf(response.data);
  const code = textOf(payload.code) ?? textOf(value.code);
  const message =
    textOf(payload.message) ??
    textOf(payload.detail) ??
    textOf(value.message) ??
    textOf(error);
  const status = response.status ?? value.status ?? payload.statusCode;
  return {
    ...(code ? { code } : {}),
    ...(typeof status === 'number' ? { status } : {}),
    ...(message ? { message } : {}),
  };
}

// Explicit backend codes take precedence over lossy or previously translated text.
const codes: Record<string, ChatErrorName> = {
  conversation_busy: 'busy',
  pending_interrupt: 'pending_decision',
  decision_not_applied: 'decision_not_applied',
  interrupt_already_decided: 'already_decided',
  wizard_request_failed: 'request_failed',
  response_body_not_readable: 'response_unreadable',
  token_expired: 'unauthorized',
  invalid_token: 'unauthorized',
  no_token: 'unauthorized',
  unauthorized: 'unauthorized',
  conversation_access_denied: 'forbidden',
  user_not_owner_or_admin: 'forbidden',
  not_a_member: 'forbidden',
  resource_read_only: 'forbidden',
  conversation_not_found: 'not_found',
  message_not_found: 'not_found',
  resource_not_found: 'not_found',
  file_not_found: 'not_found',
  namespace_not_found: 'namespace_not_found',
  workspace_not_found: 'namespace_not_found',
  root_resource_not_found: 'private_root_unavailable',
  parent_conversation_mismatch: 'invalid_request',
  invalid_history: 'invalid_request',
  missing_required_fields: 'invalid_request',
  missing_file: 'invalid_request',
  file_required: 'invalid_request',
  file_empty: 'invalid_request',
  local_runtime_not_found: 'execution_unavailable',
  local_runtime_unauthorized: 'unauthorized',
  local_runtime_revoked: 'device_revoked',
  local_runtime_changed: 'execution_changed',
  local_runtime_offline: 'device_offline',
  local_runtime_expired: 'approval_expired',
  local_runtime_sequence: 'tool_failed',
  local_runtime_state: 'tool_failed',
  upload_failed: 'upload_failed',
  file_too_large: 'file_too_large',
  file_type_not_supported: 'unsupported_file',
  conversation_attachment_unavailable: 'attachment_unavailable',
  attachment_not_found: 'attachment_unavailable',
  storage_quota_exceeded: 'storage_full',
  insufficient_credits: 'credits_exhausted',
  share_not_found: 'share_unavailable',
  share_chat_not_allowed: 'share_unavailable',
  stream_connection_failed: 'connection_interrupted',
  stream_read_failed: 'connection_interrupted',
  stream_interrupted: 'stream_interrupted',
  stream_not_found: 'stream_interrupted',
  stream_send_failed: 'stream_send_failed',
  err_network: 'connection_interrupted',
  econnreset: 'connection_interrupted',
  econnaborted: 'timeout',
  etimedout: 'timeout',
  content_review_rejected: 'content_review',
  output_content_review_rejected: 'output_content_review',
  upstream_bad_request: 'upstream_error',
  upstream_unauthorized: 'upstream_error',
  upstream_forbidden: 'upstream_error',
  upstream_not_found: 'upstream_error',
  upstream_conflict: 'upstream_error',
  upstream_unprocessable: 'upstream_error',
  upstream_rate_limited: 'upstream_error',
  upstream_server_error: 'upstream_error',
  upstream_timeout: 'upstream_error',
  upstream_connection_failed: 'upstream_error',
  upstream_api_error: 'upstream_error',
  internal_error: 'upstream_error',
};

// Only exact, source-backed legacy aliases are recognized. Unknown text is never shown.
export const chatErrorAliases: Record<string, ChatErrorName> = {
  'Message not found': 'not_found',
  'Token is missing': 'unauthorized',
  'Authentication token cookie is required': 'unauthorized',
  'Invalid token payload': 'unauthorized',
  'You are not a member of this namespace': 'forbidden',
  'Current user is not owner or admin of this namespace': 'forbidden',
  'Attachment ID is ambiguous. Provide the full ID including its extension.':
    'invalid_request',
  'File is required for upload': 'invalid_request',
  'Name is required for the resource': 'invalid_request',
  'Content is required for the resource': 'invalid_request',
  'First message is not system message': 'service_unavailable',
  'No query content found to create title': 'invalid_request',
  'Message ID is not set in context': 'service_unavailable',
  'Environment variable OBB_WIZARD_BASE_URL is required': 'service_unavailable',
  资源未找到: 'not_found',
  文件未找到: 'not_found',
  不支持的文件类型: 'unsupported_file',
  资源需要内容: 'invalid_request',
  资源需要名称: 'invalid_request',
  需要上传文件: 'invalid_request',
  该资源为只读: 'forbidden',
  此分享不允许聊天功能: 'share_unavailable',
  此分享需要登录: 'unauthorized',
  您没有权限访问此对话: 'forbidden',
  '会话历史请求无效，请刷新后重试': 'invalid_request',
  对话不存在: 'not_found',
  '需要环境变量 OBB_WIZARD_BASE_URL': 'service_unavailable',
  首条消息不是系统消息: 'service_unavailable',
  未找到查询内容以创建标题: 'invalid_request',
  '从 wizard 获取数据失败': 'request_failed',
  响应体不可读: 'response_unreadable',
  '上下文中未设置消息 ID': 'service_unavailable',
  消息未找到: 'not_found',
  父消息不属于这个对话: 'invalid_request',
  这个对话正在等待工具确认: 'pending_decision',
  这个工具确认已经处理过了: 'already_decided',
  这个对话里有一个确认还没有生效: 'decision_not_applied',
  这个对话还在生成回复: 'busy',
  空间未找到: 'namespace_not_found',
  根资源未找到: 'private_root_unavailable',
  当前用户不是该空间的所有者或管理员: 'forbidden',
  您不是该空间的成员: 'forbidden',
  '存储空间已满，请删除部分文件或升级您的套餐。': 'storage_full',
  '请选择附件文件。': 'invalid_request',
  '附件文件为空，请选择其他文件。': 'invalid_request',
  '附件不可用或不属于此对话。': 'attachment_unavailable',
  附件未找到: 'attachment_unavailable',
  '附件 ID 不唯一，请提供包含扩展名的完整 ID。': 'invalid_request',
  无效的令牌: 'unauthorized',
  缺少令牌: 'unauthorized',
  '需要身份验证令牌 cookie': 'unauthorized',
  无效的令牌载荷: 'unauthorized',
  令牌无效或已过期: 'unauthorized',
  未授权: 'unauthorized',
  设备或执行记录不存在: 'execution_unavailable',
  设备认证失败: 'unauthorized',
  设备已被撤销: 'device_revoked',
  执行参数已改变: 'execution_changed',
  设备离线或已暂停: 'device_offline',
  审批已过期或执行已不再等待审批: 'approval_expired',
  执行事件顺序不正确: 'tool_failed',
  执行状态变更无效: 'tool_failed',
  '高级版额度不足，请选择基础版或补充额度。': 'credits_exhausted',
  '模型计费配置暂不可用，请稍后重试。': 'service_unavailable',
  'Software caused connection abort': 'connection_interrupted',
  'Failed to fetch': 'connection_interrupted',
  'Load failed': 'connection_interrupted',
  'Network Error': 'connection_interrupted',
  'NetworkError when attempting to fetch resource.': 'connection_interrupted',
  'Failed to fetch from wizard': 'request_failed',
  'Response body is not readable': 'response_unreadable',
  'Unknown error': 'unknown',
  'Inappropriate content': 'service_unavailable',
  '本次请求未通过模型服务的安全审核，请修改相关内容后重试，或新建对话。':
    'content_review',
  "This request did not pass the model service's safety review. Edit the relevant content and try again, or start a new conversation.":
    'content_review',
  '生成的回复未通过模型服务的安全审核，请新建对话或修改后重试。':
    'output_content_review',
  "The generated reply did not pass the model service's safety review. Start a new conversation or edit the relevant content and try again.":
    'output_content_review',
  '网络错误，请稍后重试。': 'upstream_error',
  'Network error. Please try again later.': 'upstream_error',
  'Namespace not found': 'namespace_not_found',
  'Workspace not found': 'namespace_not_found',
  'Private root resource not found': 'private_root_unavailable',
  'Root resource not found': 'private_root_unavailable',
  'Upload failed': 'upload_failed',
  'Failed to upload image': 'upload_failed',
  'You do not have permission to access this conversation': 'forbidden',
  'Conversation not found': 'not_found',
  'Invalid conversation history request': 'invalid_request',
  'This conversation is waiting for a tool decision': 'pending_decision',
  'This tool decision was already made': 'already_decided',
  'A decision in this conversation was not applied yet': 'decision_not_applied',
  'This conversation is still generating a reply': 'busy',
  'Parent message does not belong to this conversation': 'invalid_request',
  'Missing required fields': 'invalid_request',
  'An attachment file is required.': 'invalid_request',
  'The attachment file is empty. Please choose another file.':
    'invalid_request',
  'The attachment is unavailable or does not belong to this conversation.':
    'attachment_unavailable',
  'Attachment not found': 'attachment_unavailable',
  'Resource not found': 'not_found',
  'File not found': 'not_found',
  'This file type is not supported': 'unsupported_file',
  'This resource is read-only': 'forbidden',
  'Storage quota exceeded. Please delete some files or upgrade your plan.':
    'storage_full',
  'Not enough credits to use Pro. Choose Basic or add credits.':
    'credits_exhausted',
  'Model pricing is unavailable. Please try again later.':
    'service_unavailable',
  'This share does not allow chat functionality': 'share_unavailable',
  'This share requires login': 'unauthorized',
  'Invalid token': 'unauthorized',
  'Invalid or expired token': 'unauthorized',
  Unauthorized: 'unauthorized',
  'Not authorized': 'unauthorized',
  'Device or execution not found': 'execution_unavailable',
  'Device authentication failed': 'unauthorized',
  'Device access has been revoked': 'device_revoked',
  'Execution parameters changed': 'execution_changed',
  'Device is offline or paused': 'device_offline',
  'Approval expired or execution is no longer waiting': 'approval_expired',
  'Execution events are out of sequence': 'tool_failed',
  'Invalid execution state transition': 'tool_failed',
};

export function chatErrorKey(
  error: unknown,
  fallback: ChatErrorKey = 'chat.errors.unknown'
): ChatErrorKey {
  const { code, status, message } = chatErrorDetails(error);
  const codeName =
    code && Object.prototype.hasOwnProperty.call(codes, code.toLowerCase())
      ? codes[code.toLowerCase()]
      : undefined;
  if (codeName) return `chat.errors.${codeName}`;
  if (objectOf(error).name === 'TimeoutError') return 'chat.errors.timeout';
  const alias =
    message && Object.prototype.hasOwnProperty.call(chatErrorAliases, message)
      ? chatErrorAliases[message]
      : undefined;
  const genericAlias =
    alias === 'unknown' ||
    alias === 'request_failed' ||
    alias === 'service_unavailable';
  if (alias && !genericAlias) return `chat.errors.${alias}`;
  if (status === 401) return 'chat.errors.unauthorized';
  if (status === 403) return 'chat.errors.forbidden';
  if (status === 404) return 'chat.errors.not_found';
  if (status === 408 || status === 504) return 'chat.errors.timeout';
  if (status === 413) return 'chat.errors.file_too_large';
  if (status === 415) return 'chat.errors.unsupported_file';
  if (status === 429) return 'chat.errors.rate_limited';
  if (status && status >= 500) return 'chat.errors.service_unavailable';
  if (status && status >= 400) return 'chat.errors.invalid_request';
  return alias ? `chat.errors.${alias}` : fallback;
}

export function isChatCancellation(error: unknown): boolean {
  const value = objectOf(error);
  return value.__CANCEL__ === true || value.name === 'AbortError';
}

// Connection loss is recoverable: the server keeps the turn alive and the
// client can resume it. Server-side failures and 4xx answers are not.
const transientCodes = new Set([
  'stream_connection_failed',
  'stream_read_failed',
  'err_network',
  'econnreset',
  'etimedout',
]);

export function isTransientChatError(error: unknown): boolean {
  if (isChatCancellation(error)) return false;
  const { code, status } = chatErrorDetails(error);
  if (code && transientCodes.has(code.toLowerCase())) return true;
  return status === 408 || status === 502 || status === 503 || status === 504;
}

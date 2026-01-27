import { t } from 'i18next';

export interface IBase {
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface Theme {
  skin: 'system' | 'dark' | 'light';
  content: 'light' | 'dark';
  code: 'github' | 'github-dark';
}

export type Permission =
  | 'no_access'
  | 'can_view'
  | 'can_comment'
  | 'can_edit'
  | 'full_access';

export interface User extends IBase {
  id: string;
  email: string;
  username: string;
  phone?: string;
  password?: string;
  password_repeat?: string;
}

export interface UserBinding extends IBase {
  id: number;
  user_id: string;
  login_type: string;
  login_id: string;
  email?: string;
  metadata?: {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
    email_verified?: boolean;
    nickname?: string; // WeChat nickname
  };
}

export interface Namespace extends IBase {
  id: string;
  name: string;
  collaborators?: string[];
  owner_id?: string[];
}

export interface Tag extends IBase {
  id: string;
  name: string;
}

export interface TagDto {
  id: string;
  name: string;
}

export type SpaceType = 'private' | 'teamspace';
export type ResourceType = 'doc' | 'file' | 'link' | 'folder';

export interface PathItem {
  id: string;
  name: string;
}

export interface SharedResource extends ResourceMeta {
  content: string;
  attrs?: Record<string, any>;
}

export interface Resource extends IBase {
  id: string;
  current_permission?: Permission;

  has_children: boolean;

  resource_type: ResourceType;
  space_type: SpaceType;

  parent_id: string;

  name?: string;
  content?: string;

  tags?: TagDto[];
  attrs?: Record<string, any>;

  global_permission?: Permission;

  path?: PathItem[];
}

export interface IResourceData extends Resource {
  children: Array<IResourceData>;
}

export type Role = 'owner' | 'admin' | 'member';

export interface Member {
  id: string;
  user_id: string;
  username: string;
  email: string | null;
  role: Role;
  permission: Permission;
}

export interface NamespaceMember extends IBase {
  id: number;
  role: Role;
  namespace: Namespace;
  user: User;
  rootResource: Resource;
}

export interface Group extends IBase {
  id: string;
  title: string;
  invitation_id?: string;
}

export interface UserPermission extends IBase {
  id: number;
  permission: Permission;
  role?: Role;
  namespace?: Namespace;
  resource?: Resource;
  user?: User;
}

export interface GroupPermission extends IBase {
  permission: Permission;
  group: Group;
}

export interface Invitation {
  id: string;
  namespace_role: Role;
  root_permission: Permission;
  group?: Group;
}

export enum APIKeyPermissionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum APIKeyPermissionTarget {
  RESOURCES = 'resources',
  CHAT = 'chat',
}

export interface APIKeyPermission {
  target: APIKeyPermissionTarget;
  permissions: APIKeyPermissionType[];
}

export interface APIKeyAttrs {
  related_app_id?: string;
  root_resource_id: string;
  permissions: APIKeyPermission[];
}

export interface APIKey extends IBase {
  id: string;
  value: string;
  user_id: string;
  namespace_id: string;
  attrs: APIKeyAttrs;
}

export interface CreateAPIKeyDto {
  user_id: string;
  namespace_id: string;
  attrs?: APIKeyAttrs;
}

export interface UpdateAPIKeyDto {
  attrs?: APIKeyAttrs;
}

export type ShareType = 'doc_only' | 'chat_only' | 'all';

export function shareTypeToString(type: ShareType): string {
  switch (type) {
    case 'doc_only':
      return t('share.share.share_type.doc_only');
    case 'chat_only':
      return t('share.share.share_type.chat_only');
    case 'all':
      return t('share.share.share_type.all');
    default:
      return '';
  }
}

export interface ShareInfo {
  id: string;
  enabled: boolean;
  resource_id: string;
  all_resources: boolean;
  require_login: boolean;
  password_enabled: boolean;
  share_type: ShareType;
  expires_at: Date | null;
}

export function parseShareInfo(data: any): ShareInfo {
  return {
    ...data,
    expires_at: data.expires_at ? new Date(data.expires_at) : null,
  };
}

export interface UpdateShareInfoReq {
  enabled?: boolean;
  all_resources?: boolean;
  require_login?: boolean;
  password?: string | null;
  share_type?: ShareType;
  expires_at?: Date | null;
  expires_seconds?: number;
}

export interface ResourceMeta {
  id: string;
  name?: string;
  parent_id: string | null;
  resource_type: ResourceType;
  created_at?: string;
  updated_at?: string;
  attrs?: Record<string, any>;
  has_children?: boolean;
}

export interface ResourceSummary {
  id: string;
  name: string;
  resource_type: ResourceType;
  attrs: Record<string, any>;
  content: string;
  has_children: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicShareInfo {
  id: string;
  all_resources: boolean;
  share_type: ShareType;
  username: string;
  resource: ResourceMeta;
}

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'finished'
  | 'canceled'
  | 'error'
  | 'timeout'
  | 'insufficient_quota';

export interface TaskAttrs {
  resource_id?: string;
  message_id?: string;
  conversation_id?: string;
}

export interface Task {
  id: string;
  status: TaskStatus;
  function: string;
  created_at: string;
  attrs: TaskAttrs | null;
  started_at: string | null;
  ended_at: string | null;
  canceled_at: string | null;
  can_cancel?: boolean;
  can_rerun?: boolean;
  can_redirect?: boolean;
}

export interface ApplicationAttrs {
  verify_code?: string;
}

export interface Application extends IBase {
  id: string;
  namespace_id: string;
  user_id: string;
  app_id: string;
  api_key_id?: string;
  attrs?: ApplicationAttrs;
}

export interface UploadFileInfo {
  id: string;
  post_url: string;
  post_fields: [string, string][];
}

export interface DownloadFileInfo {
  url: string;
}

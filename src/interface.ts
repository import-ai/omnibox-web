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
  password?: string;
  password_repeat?: string;
}

export interface UserBinding extends IBase {
  id: number;
  user_id: string;
  login_type: string;
  login_id: string;
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

export interface Resource extends IBase {
  id: string;
  current_permission?: Permission;

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

export type Role = 'owner' | 'member';

export interface Member {
  id: string;
  user_id: string;
  username: string;
  email: string;
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
}

export interface APIKeyPermission {
  target: APIKeyPermissionTarget;
  permissions: APIKeyPermissionType[];
}

export interface APIKeyAttrs {
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

export interface ShareInfo {
  id: string;
  enabled: boolean;
  require_login: boolean;
  password_enabled: boolean;
  share_type: ShareType;
  expires_at: Date | null;
}

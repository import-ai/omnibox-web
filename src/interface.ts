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

  parent_id: string;

  name?: string;
  content?: string;

  tags?: string[];
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

interface IBase {
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface Theme {
  skin: 'system' | 'dark' | 'light';
  content: 'light' | 'dark';
  code: 'github' | 'github-dark';
}

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

export type SpaceType = 'private' | 'teamspace';
export type ResourceType = 'doc' | 'file' | 'link' | 'folder';

export interface Resource extends IBase {
  id: string;

  namespace: { id: string };
  resource_type: ResourceType;
  space_type: SpaceType;

  parent_id: string;
  child_count: number;

  name?: string;
  content?: string;

  tags?: string[];
  attrs?: Record<string, string>;
}

export interface IResourceData extends Resource {
  children: Array<IResourceData>;
}

export type Role = 'owner' | 'member';

export interface NamespaceMember {
  email: string;
  role: Role;
}

export interface Theme {
  skin: 'system' | 'dark' | 'light';
  content: 'light' | 'dark';
  code: 'github' | 'github-dark';
}

export interface User {
  id: string;
  email: string;
  username: string;
  password?: string;
  password_repeat?: string;
  created_at: string;
  updated_at: string;
}

export type SpaceType = 'private' | 'teamspace';
export type ResourceType = 'doc' | 'file' | 'link' | 'folder';

export type Resource = {
  id: number;

  namespace: { id: number };
  resourceType: ResourceType;
  spaceType: SpaceType;

  parentId: number;
  childCount: number;

  name?: string;
  content?: string;

  tags?: string[];
  attrs?: Record<string, string>;

  // ISO 8601
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};

export interface IResourceData extends Resource {
  children: Array<IResourceData>;
}

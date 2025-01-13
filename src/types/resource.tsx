export type ResourceType = "doc" | "file" | "link" | "folder";

export type SpaceType = "private" | "teamspace";

export type Resource = {
  id: string;

  namespace: string;
  resourceType: ResourceType;
  spaceType: SpaceType;

  parentId: string;
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
export type ResourceType = "doc" | "file" | "link" | "folder";

export type Resource = {
  id: string;

  namespace: string;
  resourceType: ResourceType;
  spaceType: "private" | "teamspace";

  parentId: string;
  childCount: number;

  name?: string;
  content?: string;

  tags?: string[];

  // ISO 8601
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};
export type Resource = {
  id: string;
  namespace: string;
  resourceType: "doc" | "file" | "link" | "folder";
  spaceType: "private" | "teamspace";
  name: string;
  content?: string;
  parentId: string;
  childCount: number;
};
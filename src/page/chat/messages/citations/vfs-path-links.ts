const VFS_PATH_ROOTS = ['/private', '/teamspace', '/share'];

type MarkdownNode = {
  type?: string;
  value?: string;
  url?: string;
  title?: string | null;
  children?: MarkdownNode[];
};

export type VfsPathResourceIds = Record<string, string>;

export function isVfsPath(path: string): boolean {
  return VFS_PATH_ROOTS.some(
    root => path === root || path.startsWith(root + '/')
  );
}

export function getVfsResourceHref(
  path: string,
  pathResourceIds: VfsPathResourceIds,
  resourceLinkPrefix: string
): string | undefined {
  const resourceId = pathResourceIds[path];
  if (!resourceId || !resourceLinkPrefix || !isVfsPath(path)) {
    return undefined;
  }
  return `${resourceLinkPrefix}/${resourceId}`;
}

function isBoundary(value: string | undefined): boolean {
  return !value || /[\s`"'()[\]{}<>.,!?;:]/.test(value);
}

function linkNode(path: string, href: string): MarkdownNode {
  return {
    type: 'link',
    url: href,
    title: null,
    children: [{ type: 'text', value: path }],
  };
}

export function splitTextWithVfsPathLinks(
  value: string,
  pathResourceIds: VfsPathResourceIds,
  resourceLinkPrefix: string
): MarkdownNode[] {
  const paths = Object.keys(pathResourceIds)
    .filter(path => isVfsPath(path))
    .sort((a, b) => b.length - a.length);
  if (paths.length === 0) {
    return [{ type: 'text', value }];
  }

  const nodes: MarkdownNode[] = [];
  let index = 0;

  while (index < value.length) {
    let matchedPath = '';
    let matchedHref = '';

    for (const path of paths) {
      if (
        value.startsWith(path, index) &&
        isBoundary(value[index - 1]) &&
        isBoundary(value[index + path.length])
      ) {
        const href = getVfsResourceHref(
          path,
          pathResourceIds,
          resourceLinkPrefix
        );
        if (href) {
          matchedPath = path;
          matchedHref = href;
          break;
        }
      }
    }

    if (!matchedPath) {
      const lastNode = nodes[nodes.length - 1];
      if (lastNode?.type === 'text') {
        lastNode.value = (lastNode.value || '') + value[index];
      } else {
        nodes.push({ type: 'text', value: value[index] });
      }
      index += 1;
      continue;
    }

    nodes.push(linkNode(matchedPath, matchedHref));
    index += matchedPath.length;
  }

  return nodes;
}

function transformChildren(
  node: MarkdownNode,
  pathResourceIds: VfsPathResourceIds,
  resourceLinkPrefix: string
) {
  if (
    !node.children ||
    ['link', 'linkReference', 'code'].includes(node.type || '')
  ) {
    return;
  }

  const children: MarkdownNode[] = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value) {
      children.push(
        ...splitTextWithVfsPathLinks(
          child.value,
          pathResourceIds,
          resourceLinkPrefix
        )
      );
    } else {
      transformChildren(child, pathResourceIds, resourceLinkPrefix);
      children.push(child);
    }
  }
  node.children = children;
}

export function remarkVfsPathLinks(
  pathResourceIds: VfsPathResourceIds,
  resourceLinkPrefix: string
) {
  return function vfsPathLinksTransformer(tree: MarkdownNode) {
    transformChildren(tree, pathResourceIds, resourceLinkPrefix);
  };
}

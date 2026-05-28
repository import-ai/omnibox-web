const VFS_PATH_ROOTS = ['/private', '/teamspace', '/share'];

type MarkdownNode = {
  type?: string;
  value?: string;
  url?: string;
  title?: string | null;
  children?: MarkdownNode[];
};

export type VfsPathResourceIds = Record<string, string>;
export type VfsPathResourceTitles = Record<string, string>;
export type VfsRootPathLabels = Record<string, string>;

function decodeVfsPath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function isVfsPath(path: string): boolean {
  const decodedPath = decodeVfsPath(path);
  return VFS_PATH_ROOTS.some(
    root => decodedPath === root || decodedPath.startsWith(root + '/')
  );
}

function isVfsRootPath(path: string): boolean {
  const decodedPath = decodeVfsPath(path);
  return VFS_PATH_ROOTS.includes(decodedPath);
}

export function getVfsResourceHref(
  path: string,
  pathResourceIds: VfsPathResourceIds,
  resourceLinkPrefix: string
): string | undefined {
  const decodedPath = decodeVfsPath(path);
  if (isVfsRootPath(decodedPath)) {
    return undefined;
  }
  const resourceId = pathResourceIds[path] || pathResourceIds[decodedPath];
  if (!resourceId || !resourceLinkPrefix || !isVfsPath(decodedPath)) {
    return undefined;
  }
  return `${resourceLinkPrefix}/${resourceId}`;
}

export function getVfsRootPathLabel(
  path: string,
  rootPathLabels: VfsRootPathLabels
): string | undefined {
  const decodedPath = decodeVfsPath(path);
  if (!isVfsRootPath(decodedPath)) {
    return undefined;
  }
  return rootPathLabels[decodedPath] || decodedPath;
}

function isBoundary(value: string | undefined): boolean {
  return !value || /[\s`"'()[\]{}<>.,!?;:]/.test(value);
}

function linkNode(text: string, href: string): MarkdownNode {
  return {
    type: 'link',
    url: href,
    title: null,
    children: [{ type: 'text', value: text }],
  };
}

function getVfsResourceTitle(
  path: string,
  pathResourceTitles: VfsPathResourceTitles
): string | undefined {
  const decodedPath = decodeVfsPath(path);
  return pathResourceTitles[path] || pathResourceTitles[decodedPath];
}

export function getVfsResourceDisplayName(
  path: string,
  pathResourceTitles: VfsPathResourceTitles = {}
): string {
  const decodedPath = decodeVfsPath(path);
  const title = getVfsResourceTitle(decodedPath, pathResourceTitles);
  if (title) {
    return title;
  }
  return decodedPath.split('/').filter(Boolean).at(-1) || decodedPath;
}

export function splitTextWithVfsPathLinks(
  value: string,
  pathResourceIds: VfsPathResourceIds,
  resourceLinkPrefix: string,
  pathResourceTitles: VfsPathResourceTitles = {},
  rootPathLabels: VfsRootPathLabels = {}
): MarkdownNode[] {
  const paths = [
    ...new Set([...Object.keys(pathResourceIds), ...VFS_PATH_ROOTS]),
  ]
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
        const rootLabel = getVfsRootPathLabel(path, rootPathLabels);
        if (rootLabel) {
          matchedPath = path;
          matchedHref = '';
          break;
        }
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

    const rootLabel = getVfsRootPathLabel(matchedPath, rootPathLabels);
    if (rootLabel) {
      nodes.push({ type: 'text', value: rootLabel });
    } else {
      nodes.push(
        linkNode(
          getVfsResourceDisplayName(matchedPath, pathResourceTitles),
          matchedHref
        )
      );
    }
    index += matchedPath.length;
  }

  return nodes;
}

function transformChildren(
  node: MarkdownNode,
  pathResourceIds: VfsPathResourceIds,
  resourceLinkPrefix: string,
  pathResourceTitles: VfsPathResourceTitles,
  rootPathLabels: VfsRootPathLabels
) {
  if (
    !node.children ||
    ['link', 'linkReference', 'code'].includes(node.type || '')
  ) {
    return;
  }

  const children: MarkdownNode[] = [];
  for (const child of node.children) {
    if (child.type === 'link' && child.url) {
      const originalUrl = child.url;
      const rootLabel = getVfsRootPathLabel(originalUrl, rootPathLabels);
      if (rootLabel) {
        children.push({ type: 'text', value: rootLabel });
        continue;
      }
      const href = getVfsResourceHref(
        originalUrl,
        pathResourceIds,
        resourceLinkPrefix
      );
      if (href) {
        child.url = href;
        child.children = [
          {
            type: 'text',
            value: getVfsResourceDisplayName(originalUrl, pathResourceTitles),
          },
        ];
      }
      children.push(child);
    } else if (child.type === 'text' && child.value) {
      children.push(
        ...splitTextWithVfsPathLinks(
          child.value,
          pathResourceIds,
          resourceLinkPrefix,
          pathResourceTitles,
          rootPathLabels
        )
      );
    } else {
      transformChildren(
        child,
        pathResourceIds,
        resourceLinkPrefix,
        pathResourceTitles,
        rootPathLabels
      );
      children.push(child);
    }
  }
  node.children = children;
}

export function remarkVfsPathLinks(
  pathResourceIds: VfsPathResourceIds,
  resourceLinkPrefix: string,
  pathResourceTitles: VfsPathResourceTitles = {},
  rootPathLabels: VfsRootPathLabels = {}
) {
  return function vfsPathLinksTransformer(tree: MarkdownNode) {
    transformChildren(
      tree,
      pathResourceIds,
      resourceLinkPrefix,
      pathResourceTitles,
      rootPathLabels
    );
  };
}

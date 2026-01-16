import JSZip from 'jszip';

import { ResourceSummary } from '@/interface';
import { http } from '@/lib/request';
import { parseImageLinks } from '@/page/resource/utils';

export interface ExportProgress {
  phase: 'fetching' | 'downloading' | 'packaging' | 'complete' | 'error';
  current: number;
  total: number;
  currentItem?: string;
  error?: string;
}

export type ExportProgressCallback = (progress: ExportProgress) => void;

export interface ResourceNode {
  resource: ResourceSummary;
  path: string;
  children: ResourceNode[];
}

const PAGE_SIZE = 50;

function sanitizeFileName(name: string): string {
  return (name || 'untitled')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchAllChildren(
  namespaceId: string,
  resourceId: string
): Promise<ResourceSummary[]> {
  let offset = 0;
  let allChildren: ResourceSummary[] = [];
  let hasMore = true;

  while (hasMore) {
    const batch: ResourceSummary[] = await http.get(
      `/namespaces/${namespaceId}/resources/${resourceId}/children?summary=true&offset=${offset}&limit=${PAGE_SIZE}`,
      { mute: true }
    );
    allChildren = [...allChildren, ...batch];
    hasMore = batch.length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return allChildren;
}

async function fetchAllResourcesRecursively(
  namespaceId: string,
  resourceId: string,
  currentPath: string,
  onProgress?: ExportProgressCallback,
  abortSignal?: AbortSignal
): Promise<ResourceNode[]> {
  if (abortSignal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const children = await fetchAllChildren(namespaceId, resourceId);
  const nodes: ResourceNode[] = [];

  for (const child of children) {
    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const nodePath = currentPath
      ? `${currentPath}/${sanitizeFileName(child.name)}`
      : sanitizeFileName(child.name);

    if (onProgress) {
      onProgress({
        phase: 'fetching',
        current: 0,
        total: 0,
        currentItem: child.name,
      });
    }

    if (child.resource_type === 'folder' && child.has_children) {
      const subChildren = await fetchAllResourcesRecursively(
        namespaceId,
        child.id,
        nodePath,
        onProgress,
        abortSignal
      );
      nodes.push({ resource: child, path: nodePath, children: subChildren });
    } else {
      nodes.push({ resource: child, path: nodePath, children: [] });
    }
  }

  return nodes;
}

function countTotalResources(nodes: ResourceNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.children.length > 0) {
      count += countTotalResources(node.children);
    }
  }
  return count;
}

async function buildZipWithHierarchy(
  zip: JSZip,
  nodes: ResourceNode[],
  resourceId: string,
  onProgress?: ExportProgressCallback,
  abortSignal?: AbortSignal,
  progressState?: { current: number; total: number }
): Promise<void> {
  for (const node of nodes) {
    if (abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (progressState && onProgress) {
      progressState.current += 1;
      onProgress({
        phase: 'downloading',
        current: progressState.current,
        total: progressState.total,
        currentItem: node.resource.name,
      });
    }

    if (node.resource.resource_type === 'folder') {
      zip.folder(node.path);
      await buildZipWithHierarchy(
        zip,
        node.children,
        resourceId,
        onProgress,
        abortSignal,
        progressState
      );
    } else if (node.resource.resource_type === 'doc') {
      const content = node.resource.content || '';
      const fileName = node.path.endsWith('.md')
        ? node.path
        : `${node.path}.md`;
      zip.file(fileName, content);

      const imageLinks = parseImageLinks(content);
      if (imageLinks.length > 0) {
        const attachmentsPath = node.path.endsWith('.md')
          ? `${node.path.slice(0, -3)}_attachments`
          : `${node.path}_attachments`;
        const attachmentsFolder = zip.folder(attachmentsPath);

        for (const imageUrl of imageLinks) {
          if (abortSignal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }

          try {
            const fullImageUrl = `${node.resource.id}/${imageUrl}`;
            const response = await fetch(fullImageUrl);
            if (response.ok) {
              const imageBlob = await response.blob();
              const arrayBuffer = await imageBlob.arrayBuffer();
              const imageName = imageUrl.split('/').pop() || 'image';
              if (attachmentsFolder) {
                attachmentsFolder.file(imageName, arrayBuffer);
              }
            }
          } catch (error) {
            console.error(`Failed to fetch image: ${imageUrl}`, error);
          }
        }
      }
    }
  }
}

export async function exportAllAsZip(
  namespaceId: string,
  resourceId: string,
  folderName: string,
  onProgress?: ExportProgressCallback,
  abortSignal?: AbortSignal
): Promise<void> {
  try {
    if (onProgress) {
      onProgress({
        phase: 'fetching',
        current: 0,
        total: 0,
        currentItem: '',
      });
    }

    const resourceTree = await fetchAllResourcesRecursively(
      namespaceId,
      resourceId,
      '',
      onProgress,
      abortSignal
    );

    if (resourceTree.length === 0) {
      throw new Error('No resources to export');
    }

    const totalResources = countTotalResources(resourceTree);
    const progressState = { current: 0, total: totalResources };

    if (onProgress) {
      onProgress({
        phase: 'downloading',
        current: 0,
        total: totalResources,
        currentItem: '',
      });
    }

    const zip = new JSZip();
    await buildZipWithHierarchy(
      zip,
      resourceTree,
      resourceId,
      onProgress,
      abortSignal,
      progressState
    );

    if (onProgress) {
      onProgress({
        phase: 'packaging',
        current: totalResources,
        total: totalResources,
        currentItem: '',
      });
    }

    const blob = await zip.generateAsync({ type: 'blob' });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFileName(folderName)}.zip`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    if (onProgress) {
      onProgress({
        phase: 'complete',
        current: totalResources,
        total: totalResources,
        currentItem: '',
      });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    if (onProgress) {
      onProgress({
        phase: 'error',
        current: 0,
        total: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    throw error;
  }
}

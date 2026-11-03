import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useLocation } from 'react-router-dom';

import { TooltipProvider } from '@/components/tooltip';
import type { Resource, ResourceCommentThread } from '@/interface';
import Editor from '@/page/resource/editor';
import Page from '@/page/resource/Page';
import Render from '@/page/resource/Render';
import {
  getResourceCommentThread,
  listResourceCommentThreads,
} from '@/service/resourceComments';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

export const thread: ResourceCommentThread = {
  id: 'thread',
  quoted_text: 'Quoted text',
  resolved: false,
  anchor: {
    from: 1,
    to: 5,
    prefix: '',
    suffix: '',
    content_hash: 'hash',
    status: 'active',
  },
  creator: { id: 'author', username: 'Author' },
  comments: [],
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
};
export const resource: Resource = {
  id: 'resource',
  name: 'Document',
  resource_type: 'doc',
  space_type: 'private',
  parent_id: 'root',
  has_children: false,
  content: 'Quoted text',
  content_hash: 'hash',
  current_permission: 'can_comment',
  comment_threads: [thread],
};
export function createResourceCommentsFixture() {
  const onResource = jest.fn();
  let root: Root;
  let container: HTMLDivElement;
  let source: HTMLDivElement;
  let panel: HTMLDivElement;

  const render = async (
    editPage: boolean,
    currentResource = resource,
    isHistorical = false
  ) => {
    await act(async () => {
      root.render(
        <TooltipProvider>
          <Page
            isHistorical={isHistorical}
            editPage={editPage}
            namespaceId="namespace"
            resource={currentResource}
            showToc
            wide={false}
            onResource={onResource}
          />
        </TooltipProvider>
      );
    });
    await act(async () => jest.advanceTimersByTime(100));
  };

  const readonlyComments = () => {
    const comments = jest.mocked(Render).mock.lastCall?.[0].comments;
    if (!comments) {
      throw new Error('The page did not provide its comments to the viewer');
    }
    return comments;
  };

  const editorProps = () => {
    const props = jest.mocked(Editor).mock.lastCall?.[0];
    if (!props) {
      throw new Error('The resource editor was not mounted');
    }
    return props;
  };

  const setup = () => {
    jest.mocked(useLocation).mockReturnValue({
      key: 'resource',
      hash: '',
      pathname: '/namespace/resource',
      search: '',
      state: null,
    });
    container = document.createElement('div');
    source = document.createElement('div');
    source.setAttribute('data-resource-scroll', '');
    panel = document.createElement('div');
    container.append(source, panel);
    document.body.append(container);
    root = createRoot(source);
    jest.mocked(useResourceCommentsPanel).mockReturnValue({
      rootElement: container,
      panelElement: panel,
      panelOpen: true,
      namespaceId: 'namespace',
      setPanelOpen: jest.fn(),
      setPanelElement: jest.fn(),
      commentFocusOffset: 0,
      setCommentFocusOffset: jest.fn(),
    });
    jest.mocked(listResourceCommentThreads).mockResolvedValue({
      items: [thread],
      total: 1,
      has_more: false,
      offset: 0,
      limit: 20,
    });
    jest.mocked(getResourceCommentThread).mockResolvedValue(thread);
    Object.assign(URL, {
      createObjectURL: jest.fn(() => 'blob:pending-image'),
      revokeObjectURL: jest.fn(),
    });
  };

  const unmount = async () => {
    await act(async () => root.unmount());
    container.remove();
  };
  return {
    setup,
    unmount,
    render,
    readonlyComments,
    editorProps,
    onResource,
    get container() {
      return container;
    },
    get source() {
      return source;
    },
    get panel() {
      return panel;
    },
  };
}

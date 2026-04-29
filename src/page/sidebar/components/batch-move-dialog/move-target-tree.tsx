import { useTranslation } from 'react-i18next';

import ResourceIcon from '@/assets/icons/resourceIcon';
import { Arrow } from '@/assets/icons/treeArrow';
import { SpaceType } from '@/interface';
import { cn } from '@/lib/utils';
import { useNode, useRootId, useSidebarStore } from '@/page/sidebar/store';

interface MoveTargetTreeProps {
  targetId: string | null;
  onSelect: (id: string) => void;
}

export function MoveTargetTree({ targetId, onSelect }: MoveTargetTreeProps) {
  return (
    <div className="p-2">
      {(['private', 'teamspace'] as SpaceType[]).map(spaceType => (
        <MoveSpace
          key={spaceType}
          spaceType={spaceType}
          targetId={targetId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

interface MoveSpaceProps {
  spaceType: SpaceType;
  targetId: string | null;
  onSelect: (id: string) => void;
}

function MoveSpace({ spaceType, targetId, onSelect }: MoveSpaceProps) {
  const { t } = useTranslation();
  const rootId = useRootId(spaceType);
  const root = useNode(rootId);
  if (!root) return null;

  return (
    <div className="mb-2">
      <button
        type="button"
        className={cn(
          'flex h-8 w-full items-center rounded-md px-2 text-sm text-muted-foreground hover:bg-sidebar-accent',
          targetId === rootId && 'bg-sidebar-accent text-foreground'
        )}
        onClick={() => onSelect(rootId)}
      >
        {t(spaceType)}
      </button>
      <div className="pl-3">
        {root.children.map(childId => (
          <MoveTargetNode
            key={childId}
            nodeId={childId}
            targetId={targetId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface MoveTargetNodeProps {
  nodeId: string;
  targetId: string | null;
  onSelect: (id: string) => void;
}

function MoveTargetNode({ nodeId, targetId, onSelect }: MoveTargetNodeProps) {
  const { t } = useTranslation();
  const node = useNode(nodeId);
  const nodeUI = useSidebarStore(state => state.ui[nodeId]);
  if (!node) return null;

  const handleExpand = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (nodeUI?.expanded) {
      useSidebarStore.getState().collapse(nodeId);
    } else {
      useSidebarStore.getState().expand(nodeId);
    }
  };

  return (
    <div>
      <button
        type="button"
        className={cn(
          'flex h-8 w-full items-center gap-1 rounded-md px-1 text-left text-sm hover:bg-sidebar-accent',
          targetId === nodeId && 'bg-sidebar-accent text-foreground'
        )}
        onClick={() => onSelect(nodeId)}
      >
        {node.hasChildren ? (
          <span
            className={cn(
              'flex size-5 items-center justify-center text-neutral-400',
              nodeUI?.expanded && 'rotate-90'
            )}
            onClick={handleExpand}
          >
            <Arrow className="transition-transform" />
          </span>
        ) : (
          <span className="size-5" />
        )}
        <ResourceIcon
          expand={nodeUI?.expanded}
          resource={{
            id: node.id,
            name: node.name,
            parent_id: node.parentId,
            resource_type: node.resourceType,
            has_children: node.hasChildren,
            attrs: node.attrs,
          }}
        />
        <span className="truncate">{node.name || t('untitled')}</span>
      </button>
      {nodeUI?.expanded && node.children.length > 0 && (
        <div className="pl-4">
          {node.children.map(childId => (
            <MoveTargetNode
              key={childId}
              nodeId={childId}
              targetId={targetId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

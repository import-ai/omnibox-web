import { CellSelection } from '@tiptap/pm/tables';
import type { Editor } from '@tiptap/react';
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { getTableMenuPosition, isTableCellTarget } from './menuPosition';
import TableContextMenuContent from './TableContextMenuContent';
import type { MenuPosition, TableMenuLabels } from './types';
import { useTableMenuItems } from './useTableMenuItems';

interface TableContextMenuProps {
  children: ReactNode;
  editor: Editor | null;
}

function TableContextMenu(props: TableContextMenuProps) {
  const { children, editor } = props;
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const closeMenu = () => setPosition(null);

  useEffect(() => {
    if (!position) {
      return;
    }

    const handleClick = (event: globalThis.MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      closeMenu();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [position]);

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!editor || !isTableCellTarget(event.target)) {
      return;
    }

    event.preventDefault();

    if (
      editor.isEditable &&
      !(editor.state.selection instanceof CellSelection)
    ) {
      const positionAtCoords = editor.view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      });

      if (positionAtCoords) {
        editor.chain().setTextSelection(positionAtCoords.pos).focus().run();
      } else {
        editor.view.focus();
      }
    } else {
      editor.view.focus();
    }

    setPosition(getTableMenuPosition(event));
  };

  const labels = t('resource.editor.table_menu', {
    returnObjects: true,
  }) as TableMenuLabels;
  const menuItems = useTableMenuItems(editor, labels, closeMenu);

  return (
    <div onContextMenu={handleContextMenu}>
      {children}

      {position && menuItems && (
        <TableContextMenuContent
          deleteTableAction={menuItems.deleteTableAction}
          groups={menuItems.groups}
          menuRef={menuRef}
          position={position}
        />
      )}
    </div>
  );
}

export default TableContextMenu;

export const STICKY_FOLDER_HEIGHT = 34;

export interface StickyFolderBounds {
  id: string;
  top: number;
  bottom: number;
  depth: number;
}

/** Choose one expanded ancestor at the first unobscured row. */
export function findStickyFolder(
  folders: StickyFolderBounds[],
  scrollTop: number,
  height = STICKY_FOLDER_HEIGHT
): string | null {
  let nearest: StickyFolderBounds | undefined;
  for (const folder of folders) {
    if (
      folder.top < scrollTop - 0.5 &&
      folder.bottom > scrollTop + height &&
      (!nearest || folder.depth > nearest.depth)
    ) {
      nearest = folder;
    }
  }
  return nearest?.id ?? null;
}

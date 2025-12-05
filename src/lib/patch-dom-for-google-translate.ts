/**
 * Workaround for Google Translate breaking React
 *
 * When Google Translate modifies the DOM, it can interfere with React's
 * management of text nodes, causing "Cannot remove a child from a different parent" errors.
 *
 * This patch catches these errors gracefully instead of crashing the application.
 *
 * References:
 * - https://github.com/facebook/react/issues/11538#issuecomment-417504600
 * - https://github.com/remarkjs/react-markdown/issues/402
 */
export function patchDOMForGoogleTranslate() {
  if (typeof Node === 'function' && Node.prototype) {
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function removeChild<T extends Node>(
      child: T
    ): T {
      if (child.parentNode !== this) {
        if (console) {
          console.warn(
            'Attempting to remove a child from a different parent. Trying to remove from actual parent instead.',
            child,
            this
          );
        }

        // Try to remove from the actual parent
        if (child.parentNode) {
          try {
            return originalRemoveChild.call(child.parentNode, child) as T;
          } catch (e) {
            console.error('Failed to remove child from actual parent:', e);
            return child;
          }
        }

        return child;
      }

      return originalRemoveChild.call(this, child) as T;
    };

    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function insertBefore<T extends Node>(
      newNode: T,
      referenceNode: Node | null
    ): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        if (console) {
          console.warn(
            'Cannot insert before a reference node from a different parent. Falling back to appendChild.',
            referenceNode,
            this
          );
        }

        // Fall back to appendChild when reference node is invalid
        try {
          return this.appendChild(newNode) as T;
        } catch (e) {
          console.error('Failed to appendChild as fallback:', e);
          return newNode;
        }
      }

      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    };
  }
}

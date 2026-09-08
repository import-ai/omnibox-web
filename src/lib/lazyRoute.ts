import type { ComponentType } from 'react';

/** Loads a default-export page as a React Router route `lazy` module. */
export function lazyRoute(load: () => Promise<{ default: ComponentType }>) {
  return async () => {
    const { default: Component } = await load();
    return { Component };
  };
}

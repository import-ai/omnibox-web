import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom';

type ResourceNavigateOptions = Omit<NavigateOptions, 'flushSync'>;

/** Navigates to a resource without leaving the previous resource painted. */
export function navigateToResource(
  navigate: NavigateFunction,
  to: To,
  options: ResourceNavigateOptions = {}
) {
  navigate(to, { ...options, flushSync: true });
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BIND_CHECK_INTERVAL } from '@/const';
import { Application } from '@/interface';
import { http } from '@/lib/request';

interface ApplicationSyncOptions {
  active?: boolean;
  syncBindingIds?: readonly string[];
  onUnbound?: (applications: Application[]) => void;
}

interface RefreshOptions {
  background?: boolean;
  showLoading?: boolean;
}

const NO_BINDING_SYNC: readonly string[] = [];

export default function useApplications(
  namespaceId: string,
  {
    active = true,
    syncBindingIds = NO_BINDING_SYNC,
    onUnbound,
  }: ApplicationSyncOptions = {}
) {
  const [state, setState] = useState({
    namespaceId,
    applications: [] as Application[],
    loading: true,
    error: null as string | null,
  });
  const syncRef = useRef({ active, syncBindingIds, onUnbound });
  syncRef.current = { active, syncBindingIds, onUnbound };
  const session = useMemo(
    () => ({
      active: false,
      requestVersion: 0,
      mutations: 0,
      creationVersions: new Map<string, number>(),
      statusRequests: new Set<AbortController>(),
      applications: [] as Application[],
      requests: new Map<AbortController, { showLoading: boolean }>(),
    }),
    [namespaceId, active]
  );

  const fetchApplications = useCallback(
    async ({
      background = false,
      showLoading = !background,
    }: RefreshOptions = {}) => {
      if (!namespaceId) {
        setState(previous => ({ ...previous, loading: false }));
        return;
      }
      if (
        !session.active ||
        !syncRef.current.active ||
        ((background || syncRef.current.syncBindingIds.length > 0) &&
          document.visibilityState !== 'visible')
      )
        return;
      const requestVersion = ++session.requestVersion;
      const controller = new AbortController();
      session.requests.set(controller, { showLoading });
      if (showLoading) {
        setState(previous => ({ ...previous, loading: true, error: null }));
      }

      try {
        const response: Application[] = await http.get(
          `/namespaces/${namespaceId}/applications`,
          { mute: background, signal: controller.signal }
        );
        if (
          !session.active ||
          !syncRef.current.active ||
          controller.signal.aborted ||
          requestVersion !== session.requestVersion ||
          ((background || syncRef.current.syncBindingIds.length > 0) &&
            document.visibilityState !== 'visible')
        )
          return;
        if (
          !Array.isArray(response) ||
          response.some(
            application =>
              !application ||
              typeof application.app_id !== 'string' ||
              !application.app_id
          )
        ) {
          throw new Error('Invalid applications response');
        }
        // The list contract includes an explicit placeholder for unbound apps.
        // A missing known assistant cannot establish a new binding baseline.
        if (
          session.applications.some(
            previous =>
              syncRef.current.syncBindingIds.includes(previous.app_id) &&
              !response.some(current => current.app_id === previous.app_id)
          )
        ) {
          throw new Error('Incomplete applications response');
        }
        const previousApplications = session.applications;
        session.applications = response;
        setState({
          namespaceId,
          applications: response,
          loading: [...session.requests.values()].some(
            request => request.showLoading
          ),
          error: null,
        });

        const removed = previousApplications.filter(previous => {
          if (
            !syncRef.current.syncBindingIds.includes(previous.app_id) ||
            !previous.id ||
            !previous.api_key_id
          )
            return false;
          const current = response.find(app => app.app_id === previous.app_id);
          return current && !current.id;
        });
        if (removed.length && document.visibilityState === 'visible') {
          syncRef.current.onUnbound?.(removed);
        }
        return response;
      } catch (err) {
        if (
          session.active &&
          !controller.signal.aborted &&
          requestVersion === session.requestVersion &&
          !background
        ) {
          setState(previous => ({
            ...previous,
            namespaceId,
            applications:
              previous.namespaceId === namespaceId ? previous.applications : [],
            loading: [...session.requests.values()].some(
              request => request.showLoading
            ),
            error:
              err instanceof Error
                ? err.message
                : 'Failed to fetch applications',
          }));
        }
      } finally {
        session.requests.delete(controller);
        if (showLoading && session.active && syncRef.current.active) {
          setState(previous => ({
            ...previous,
            loading: [...session.requests.values()].some(
              request => request.showLoading
            ),
          }));
        }
      }
    },
    [namespaceId, session]
  );

  const bindApplication = useCallback(
    async (appId: string): Promise<Application> => {
      if (!session.active || !syncRef.current.active) {
        throw new DOMException('Obsolete application session', 'AbortError');
      }
      const creationVersion = (session.creationVersions.get(appId) ?? 0) + 1;
      session.creationVersions.set(appId, creationVersion);
      session.mutations++;
      session.requestVersion++;
      session.requests.forEach((_request, controller) => controller.abort());
      session.requests.clear();
      session.statusRequests.forEach(controller => controller.abort());
      try {
        const response: Application = await http.post(
          `/namespaces/${namespaceId}/applications/${appId}`,
          undefined,
          { mute: true }
        );
        if (session.creationVersions.get(appId) !== creationVersion) {
          throw new DOMException('Obsolete application creation', 'AbortError');
        }
        if (session.active && syncRef.current.active) {
          const existing = session.applications.find(
            application => application.app_id === response.app_id
          );
          session.applications = existing
            ? session.applications.map(application =>
                application === existing ? response : application
              )
            : [...session.applications, response];
          setState({
            namespaceId,
            applications: session.applications,
            loading: false,
            error: null,
          });
          void fetchApplications({ showLoading: false });
        }
        return response;
      } finally {
        session.mutations--;
      }
    },
    [namespaceId, session, fetchApplications]
  );

  const unbindApplication = useCallback(
    async (
      applicationId: string,
      { showLoading = true }: Pick<RefreshOptions, 'showLoading'> = {}
    ): Promise<void> => {
      if (!session.active || !syncRef.current.active) {
        throw new DOMException('Obsolete application session', 'AbortError');
      }
      session.mutations++;
      session.requestVersion++;
      session.requests.forEach((_request, controller) => controller.abort());
      session.requests.clear();
      session.statusRequests.forEach(controller => controller.abort());
      try {
        await http.delete(
          `/namespaces/${namespaceId}/applications/${applicationId}`,
          { mute: true }
        );
        if (session.active) {
          session.applications = session.applications.map(application =>
            application.id === applicationId
              ? ({ app_id: application.app_id } as Application)
              : application
          );
          setState({
            namespaceId,
            applications: session.applications,
            loading: false,
            error: null,
          });
        }
        const refresh = fetchApplications({ showLoading });
        if (showLoading) await refresh;
      } finally {
        session.mutations--;
      }
    },
    [namespaceId, session, fetchApplications]
  );

  const checkApplicationStatus = useCallback(
    async (
      applicationId: string,
      options?: { signal?: AbortSignal }
    ): Promise<Application> => {
      if (session.mutations > 0) {
        throw new DOMException('Binding mutation in progress', 'AbortError');
      }
      const controller = new AbortController();
      const abort = () => controller.abort();
      options?.signal?.addEventListener('abort', abort, { once: true });
      if (options?.signal?.aborted || !session.active) controller.abort();
      session.statusRequests.add(controller);
      try {
        const result: Application = await http.get(
          `/namespaces/${namespaceId}/applications/${applicationId}`,
          { signal: controller.signal, mute: true }
        );
        if (
          controller.signal.aborted ||
          !session.active ||
          result.id !== applicationId
        ) {
          throw new DOMException('Obsolete binding status', 'AbortError');
        }
        return result;
      } finally {
        options?.signal?.removeEventListener('abort', abort);
        session.statusRequests.delete(controller);
      }
    },
    [namespaceId, session]
  );

  useEffect(() => {
    session.active = active;
    if (active) void fetchApplications();
    return () => {
      session.active = false;
      session.requestVersion++;
      session.requests.forEach((_request, controller) => controller.abort());
      session.statusRequests.forEach(controller => controller.abort());
    };
  }, [active, session, fetchApplications]);

  useEffect(() => {
    if (!active || !syncBindingIds.length || !namespaceId) return;
    const cancelReadRequests = () => {
      session.requests.forEach((_request, controller) => controller.abort());
      session.requests.clear();
      session.statusRequests.forEach(controller => controller.abort());
    };
    const refresh = async (calibrate = false) => {
      if (
        !session.active ||
        session.mutations > 0 ||
        session.requests.size > 0 ||
        document.visibilityState !== 'visible' ||
        (!calibrate &&
          !session.applications.some(
            app =>
              syncRef.current.syncBindingIds.includes(app.app_id) &&
              app.id &&
              app.api_key_id
          ))
      ) {
        return;
      }
      await fetchApplications({ background: true });
    };
    const interval = setInterval(() => void refresh(), BIND_CHECK_INTERVAL);
    const onFocus = () => void refresh(true);
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        cancelReadRequests();
        return;
      }
      void refresh(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelReadRequests();
    };
  }, [active, syncBindingIds.length, namespaceId, session, fetchApplications]);

  const currentNamespace = state.namespaceId === namespaceId;
  return {
    applications: currentNamespace ? state.applications : [],
    loading: !currentNamespace || state.loading,
    error: currentNamespace ? state.error : null,
    bindApplication,
    unbindApplication,
    checkApplicationStatus,
    refetch: fetchApplications,
  };
}

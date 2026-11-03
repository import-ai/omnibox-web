import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BIND_CHECK_INTERVAL } from '@/const';
import { Application } from '@/interface';
import { http } from '@/lib/request';

interface ApplicationSyncOptions {
  active?: boolean;
  syncWechatBinding?: boolean;
  onUnbound?: (application: Application) => void;
}

interface RefreshOptions {
  background?: boolean;
  showLoading?: boolean;
}

export default function useApplications(
  namespaceId: string,
  {
    active = true,
    syncWechatBinding = false,
    onUnbound,
  }: ApplicationSyncOptions = {}
) {
  const [state, setState] = useState({
    namespaceId,
    applications: [] as Application[],
    loading: true,
    error: null as string | null,
  });
  const syncRef = useRef({ active, syncWechatBinding, onUnbound });
  syncRef.current = { active, syncWechatBinding, onUnbound };
  const session = useMemo(
    () => ({
      active: false,
      requestVersion: 0,
      mutations: 0,
      applications: [] as Application[],
      requests: new Map<
        AbortController,
        { background: boolean; showLoading: boolean }
      >(),
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
        (background && document.visibilityState !== 'visible')
      )
        return;
      const requestVersion = ++session.requestVersion;
      const controller = new AbortController();
      session.requests.set(controller, { background, showLoading });
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
          (background && document.visibilityState !== 'visible')
        )
          return;
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

        if (background && syncRef.current.syncWechatBinding) {
          const previous = previousApplications.find(
            app => app.app_id === 'wechat_oa_bot' && app.id && app.api_key_id
          );
          const current = response.find(app => app.app_id === 'wechat_oa_bot');
          if (previous && current && !current.id) {
            syncRef.current.onUnbound?.(previous);
          }
        }
        return response;
      } catch (err) {
        if (
          session.active &&
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
      session.mutations++;
      session.requestVersion++;
      try {
        const response: Application = await http.post(
          `/namespaces/${namespaceId}/applications/${appId}`,
          undefined,
          { mute: true }
        );
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
      session.mutations++;
      session.requestVersion++;
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
    async (applicationId: string): Promise<Application> =>
      http.get(`/namespaces/${namespaceId}/applications/${applicationId}`),
    [namespaceId]
  );

  useEffect(() => {
    session.active = active;
    if (active) void fetchApplications();
    return () => {
      session.active = false;
      session.requestVersion++;
      session.requests.forEach((_background, controller) => controller.abort());
    };
  }, [active, session, fetchApplications]);

  useEffect(() => {
    if (!active || !syncWechatBinding || !namespaceId) return;
    const cancelBackgroundRequests = () => {
      session.requests.forEach(({ background }, controller) => {
        if (background) {
          controller.abort();
          session.requests.delete(controller);
        }
      });
    };
    const refresh = async () => {
      if (
        !session.active ||
        session.mutations > 0 ||
        session.requests.size > 0 ||
        document.visibilityState !== 'visible' ||
        !session.applications.some(
          app => app.app_id === 'wechat_oa_bot' && app.id && app.api_key_id
        )
      ) {
        return;
      }
      await fetchApplications({ background: true });
    };
    const interval = setInterval(() => void refresh(), BIND_CHECK_INTERVAL);
    const onFocus = () => void refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        cancelBackgroundRequests();
        return;
      }
      void refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelBackgroundRequests();
    };
  }, [active, syncWechatBinding, namespaceId, session, fetchApplications]);

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

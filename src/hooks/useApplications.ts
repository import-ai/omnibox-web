import { useEffect, useRef, useState } from 'react';

import { Application } from '@/interface';
import { http } from '@/lib/request';

interface FetchApplicationsOptions {
  showLoading?: boolean;
}

export default function useApplications(namespaceId: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSequenceRef = useRef(0);
  const visibleRequestCountRef = useRef(0);

  const fetchApplications = async ({
    showLoading = true,
  }: FetchApplicationsOptions = {}) => {
    const requestSequence = ++requestSequenceRef.current;
    if (!namespaceId) {
      if (showLoading) {
        setLoading(false);
      }
      return;
    }

    if (showLoading) {
      visibleRequestCountRef.current += 1;
      setLoading(true);
    }

    try {
      setError(null);
      const response = await http.get(
        `/namespaces/${namespaceId}/applications`
      );
      if (requestSequence === requestSequenceRef.current) {
        setApplications(response);
      }
    } catch (err: any) {
      if (requestSequence === requestSequenceRef.current) {
        setError(err.message || 'Failed to fetch applications');
      }
    } finally {
      if (showLoading) {
        visibleRequestCountRef.current -= 1;
        if (visibleRequestCountRef.current === 0) {
          setLoading(false);
        }
      }
    }
  };

  const bindApplication = async (appId: string): Promise<Application> => {
    const response: Application = await http.post(
      `/namespaces/${namespaceId}/applications/${appId}`,
      undefined,
      { mute: true }
    );
    setApplications(current => {
      const index = current.findIndex(
        application => application.app_id === response.app_id
      );
      if (index === -1) {
        return [...current, response];
      }
      return current.map((application, currentIndex) =>
        currentIndex === index ? response : application
      );
    });
    void fetchApplications({ showLoading: false });
    return response;
  };

  const unbindApplication = async (
    applicationId: string,
    { showLoading = true }: FetchApplicationsOptions = {}
  ): Promise<void> => {
    await http.delete(
      `/namespaces/${namespaceId}/applications/${applicationId}`,
      { mute: true }
    );
    setApplications(current =>
      current.filter(application => application.id !== applicationId)
    );
    const refresh = fetchApplications({ showLoading });
    if (showLoading) {
      await refresh;
    } else {
      void refresh;
    }
  };

  const checkApplicationStatus = async (
    applicationId: string
  ): Promise<Application> => {
    return await http.get(
      `/namespaces/${namespaceId}/applications/${applicationId}`
    );
  };

  useEffect(() => {
    fetchApplications();
  }, [namespaceId]);

  return {
    applications,
    loading,
    error,
    bindApplication,
    unbindApplication,
    checkApplicationStatus,
    refetch: fetchApplications,
  };
}

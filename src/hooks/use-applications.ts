import { useEffect, useState } from 'react';

import { Application, BindApplicationResponse } from '@/interface';
import { http } from '@/lib/request';

export default function useApplications(namespaceId: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = async () => {
    if (!namespaceId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await http.get(
        `/namespaces/${namespaceId}/applications`
      );
      setApplications(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const bindApplication = async (
    applicationId: string
  ): Promise<BindApplicationResponse> => {
    const response = await http.post(
      `/namespaces/${namespaceId}/applications/${applicationId}`
    );
    await fetchApplications(); // Refresh the list
    return response;
  };

  const unbindApplication = async (applicationId: string): Promise<void> => {
    await http.delete(
      `/namespaces/${namespaceId}/applications/${applicationId}`
    );
    await fetchApplications(); // Refresh the list
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
    refetch: fetchApplications,
  };
}

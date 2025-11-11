import { useCallback, useState } from 'react';

/**
 * Custom hook for managing async operations with loading and error states
 *
 * @example
 * const { loading, error, execute } = useAsync(async (data) => {
 *   return await http.post('/api/endpoint', data);
 * });
 *
 * // Later in your component
 * await execute(formData);
 */
export function useAsync<T, Args extends any[] = any[]>(
  asyncFunction: (...args: Args) => Promise<T>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFunction(...args);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction]
  );

  return { loading, error, execute };
}

import { useState, useEffect } from 'react';

export const useFirestoreQuery = (queryFn, deps = []) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    execute();
  }, deps);

  return { data, isLoading, error, refetch: execute };
};

export default useFirestoreQuery;

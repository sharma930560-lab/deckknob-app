import { useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';

export const useRealtimeCollection = (queryRef) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!queryRef) return;
    setIsLoading(true);
    
    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setData(items);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useRealtimeCollection] error:', err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryRef]);

  return { data, isLoading, error };
};

export default useRealtimeCollection;

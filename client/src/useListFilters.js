import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// Keep the directory's state in its URL, so Back and refresh restore it.
export default function useListFilters() {
  const [params, setParams] = useSearchParams();
  const update = useCallback((changes) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(changes)) {
        if (value === '' || value == null || (key === 'page' && Number(value) === 1)) next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    }, { replace: true });
  }, [setParams]);
  const pageValue = Number(params.get('page'));
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  return { params, page, update };
}

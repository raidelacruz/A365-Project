import { useCallback, useEffect, useState } from 'react';

export function useResource(loader, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: '' }));
    Promise.resolve().then(() => loader(controller.signal)).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: error.message }));
    });
    return () => controller.abort();
    // Los consumidores declaran explícitamente los valores que cambian la consulta.
  }, [...dependencies, revision]);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  return { ...state, reload };
}

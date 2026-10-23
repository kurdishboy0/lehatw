import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Query changes belong to the current list. New pages start at the top;
// Back restores the previous list position once its async content is tall enough.
export default function RouteScroll() {
  const location = useLocation();
  const navigation = useNavigationType();
  const positions = useRef(new Map());
  const previousPath = useRef(location.pathname);
  useLayoutEffect(() => {
    const oldRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = oldRestoration; };
  }, []);
  useLayoutEffect(() => {
    const cache = positions.current;
    const changedPage = previousPath.current !== location.pathname;
    previousPath.current = location.pathname;
    const saved = cache.get(location.key);
    const target = navigation === 'POP' && saved != null ? saved : changedPage || navigation === 'PUSH' ? 0 : window.scrollY;
    let restoring = true;
    let observer;
    let timer;
    let anchor = location.hash.slice(1);
    try { anchor = decodeURIComponent(anchor); } catch { /* Treat a malformed fragment as a literal ID. */ }
    const stop = () => { restoring = false; observer?.disconnect(); clearTimeout(timer); };
    const restore = () => {
      if (!restoring) return;
      if (location.hash) {
        const element = document.getElementById(anchor);
        if (element) { element.scrollIntoView(); stop(); }
        return;
      }
      window.scrollTo({ top: target, left: 0, behavior: 'instant' });
      if (document.documentElement.scrollHeight - window.innerHeight >= target) stop();
    };
    observer = new ResizeObserver(restore);
    observer.observe(document.body);
    timer = setTimeout(stop, 10000);
    restore();
    const onKey = (event) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) stop(); };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      cache.set(location.key, restoring ? target : window.scrollY);
      if (cache.size > 100) cache.delete(cache.keys().next().value);
      stop();
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', onKey);
    };
  }, [location.key, location.pathname, location.hash, navigation]);
  return null;
}

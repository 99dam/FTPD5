import { useEffect, useRef } from 'react';

const EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;

/**
 * Signs the user out after `minutes` without interaction (session timeout
 * policy). Also checks on tab focus, because timers are throttled in
 * background tabs on mobile.
 */
export function useIdleLogout(enabled: boolean, minutes: number, onTimeout: () => void) {
  const lastActivity = useRef(0);
  const callback = useRef(onTimeout);

  useEffect(() => {
    callback.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;
    const limit = minutes * 60_000;
    lastActivity.current = Date.now();

    const mark = () => {
      lastActivity.current = Date.now();
    };
    const check = () => {
      if (Date.now() - lastActivity.current >= limit) callback.current();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    const interval = window.setInterval(check, 30_000);

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, mark));
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(interval);
    };
  }, [enabled, minutes]);
}

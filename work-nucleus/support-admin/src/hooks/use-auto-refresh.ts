import { useEffect, useRef, useCallback } from "react";

/**
 * useAutoRefresh – polls a callback at a given interval (in ms).
 * Stops polling when the component unmounts or when `enabled` is false.
 *
 * @param callback  The async function to call on each tick.
 * @param interval  Poll interval in milliseconds (default 30 000).
 * @param enabled   Set to false to pause (default true).
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  interval = 30_000,
  enabled = true,
) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => savedCallback.current();
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}

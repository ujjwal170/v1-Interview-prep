import { useEffect, useState } from 'react';

/**
 * useDebounce — returns a debounced copy of `value` that only updates
 * after `delay` milliseconds of inactivity.
 *
 * @param {*} value  The value to debounce.
 * @param {number} delay  Debounce delay in milliseconds.
 * @returns {*} The debounced value.
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

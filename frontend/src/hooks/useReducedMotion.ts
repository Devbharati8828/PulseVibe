import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

export function useReducedMotion() {
  const setReducedMotion = useSettingsStore(state => state.setReducedMotion);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value based on system pref if not explicitly overridden by user
    // In a real app we'd track "system vs manual" pref. Here we just set it once on load if true.
    if (mediaQuery.matches) {
      setReducedMotion(true);
    }

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [setReducedMotion]);
  
  return useSettingsStore(state => state.reducedMotion);
}

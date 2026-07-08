import { useEffect, useState } from 'react';

// The single source of truth for "should the app use the mobile,
// full-screen window model instead of the desktop drag/resize model."
// Deliberately matches Tailwind's `sm` step (640px) — the codebase already
// has an existing `max-sm:` convention (Navbar, Dock) and an existing
// `@media (max-width: 640px)` window-fullscreen CSS rule; introducing a
// second, different JS breakpoint (e.g. 768px) would create a dead zone
// where CSS still thinks "desktop" but JS has already disabled
// drag/resize, or vice versa.
const MOBILE_BREAKPOINT_QUERY = '(max-width: 640px)';

export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const handleChange = (event) => setIsMobile(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}

export default useIsMobileViewport;

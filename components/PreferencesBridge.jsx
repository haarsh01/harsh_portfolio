import { useEffect } from 'react';
import usePreferencesStore from '#store/preferences.js';
import { getAccentColor } from '#constants/appearance.js';

// Pure side-effect component: applies preference state to the document
// root as CSS custom properties / data attributes, so the rest of the app
// (existing CSS, no JSX changes) reacts through one shared mechanism
// instead of every component reading the store itself.
const PreferencesBridge = () => {
  const appearance = usePreferencesStore((state) => state.appearance);
  const motion = usePreferencesStore((state) => state.motion);
  const motionOSReduced = usePreferencesStore((state) => state.motionOSReduced);

  // OS reduced-motion — registered once, mirrored into the store so every
  // consumer reads it from one place (see src/utils/motion.js).
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    usePreferencesStore.getState().syncOSReducedMotion(mediaQuery.matches);
    const handleChange = (event) => usePreferencesStore.getState().syncOSReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Light / Dark / Automatic — resolves "auto" against the OS color-scheme
  // and keeps listening only while in auto mode.
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (isDark) => { root.dataset.theme = isDark ? 'dark' : 'light'; };

    if (appearance.mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      const handleChange = (event) => applyTheme(event.matches);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    applyTheme(appearance.mode === 'dark');
    return undefined;
  }, [appearance.mode]);

  // Accent color + transparency + contrast — expressed as CSS custom
  // properties so the glass system updates without touching component CSS.
  useEffect(() => {
    const root = document.documentElement;
    const accent = getAccentColor(appearance.accent);
    root.style.setProperty('--accent-color', accent.value);

    const scale = appearance.reduceTransparency ? 1 : appearance.transparency / 100;
    root.style.setProperty('--glass-alpha', String(Math.min(0.68 * scale + 0.3, 0.97)));
    root.style.setProperty('--glass-alpha-inactive', String(Math.min(0.5 * scale + 0.3, 0.94)));
    root.style.setProperty('--glass-blur-amount', appearance.reduceTransparency ? '6px' : '28px');
    root.style.setProperty('--window-shadow-strength', appearance.highContrast ? '1.35' : '1');

    root.dataset.highContrast = appearance.highContrast ? 'true' : 'false';
    root.dataset.reduceTransparency = appearance.reduceTransparency ? 'true' : 'false';
  }, [appearance.accent, appearance.transparency, appearance.reduceTransparency, appearance.highContrast]);

  // Combined effective reduced-motion (OS OR site toggle) — one data
  // attribute the global CSS rule already keys off of (see index.css),
  // so System preferences override site animation preferences without
  // every component needing its own check.
  useEffect(() => {
    const reduced = motionOSReduced || !motion.animationsEnabled;
    document.documentElement.dataset.reduceMotion = String(reduced);
  }, [motionOSReduced, motion.animationsEnabled]);

  return null;
};

export default PreferencesBridge;

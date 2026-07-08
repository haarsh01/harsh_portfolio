import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isReducedMotion } from '#utils/motion.js';

// Registered once, at module scope — gsap.registerPlugin is itself
// idempotent, but this still guarantees it happens exactly once no matter
// how many times this module is evaluated (Strict Mode, HMR, etc.).
gsap.registerPlugin(ScrollTrigger);

// Matches the `@container about-page (min-width: 640px)` breakpoint in
// index.css that switches the hero to two columns — the sticky/scrub image
// treatment only makes sense once that same column split exists, so the
// two are kept intentionally identical rather than picking a separate
// number.
const WIDE_BREAKPOINT = 640;

// Debounces ScrollTrigger.refresh() calls after the About window's size
// changes (manual resize, maximize, restore) so a resize gesture doesn't
// call refresh on every intermediate frame — only once, shortly after the
// size settles.
const REFRESH_DEBOUNCE_MS = 150;

// How long to wait, after mount, before measuring and creating the chapter
// ScrollTriggers — see the long comment at its use site below for why this
// is necessary at all.
const CHAPTER_TRIGGER_SETUP_DELAY_MS = 500;

// Drives every scroll-linked animation for the About biography. Deliberately
// takes only refs and reads the DOM/ResizeObserver directly rather than
// subscribing to the window store — the About window is only ever mounted
// while genuinely open (Text.jsx nulls its data, and therefore unmounts
// this content, on close), so the one lifecycle fact this hook actually
// needs — "is the scroll container currently a real, non-zero size" — is
// something a ResizeObserver already reports directly, for every cause
// (open, manual resize, maximize, restore, un-minimize) uniformly.
export function useAboutScrollAnimations({ rootRef, scrollContainerRef, heroImageRef }) {
  const [isWide, setIsWide] = useState(false);
  const hasMeasuredRef = useRef(false);
  const refreshTimeoutRef = useRef(null);

  // ---- Layout-mode + resize-safe refresh, decoupled from GSAP entirely ----
  useEffect(() => {
    const scroller = scrollContainerRef.current;
    if (!scroller) return undefined;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        ScrollTrigger.refresh(true);
      }, REFRESH_DEBOUNCE_MS);
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = entry.contentRect.width;

      // A minimized (display:none) window reports 0 — ignore it entirely
      // rather than treating it as "became narrow"; the real width comes
      // back on restore and is handled like any other resize.
      if (width <= 0) return;

      setIsWide((prev) => {
        const next = width >= WIDE_BREAKPOINT;
        return prev === next ? prev : next;
      });

      // The very first real measurement just establishes initial layout —
      // no prior trigger positions exist yet to refresh.
      if (!hasMeasuredRef.current) {
        hasMeasuredRef.current = true;
        return;
      }
      scheduleRefresh();
    });

    observer.observe(scroller);

    return () => {
      observer.disconnect();
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [scrollContainerRef]);

  // ---- Hero entrance (mount-only) + chapter/detail scroll reveals ----
  // Deliberately excludes `isWide` from its dependencies: these are
  // one-shot ("once: true") reveals, and recreating them on every resize
  // would re-evaluate each trigger's start/end against the CURRENT scroll
  // position, replaying any reveal already scrolled past. They're created
  // once and simply refreshed (see above) as the window changes size.
  useGSAP((context, contextSafe) => {
    const root = rootRef.current;
    const scroller = scrollContainerRef.current;
    if (!root || !scroller) return undefined;

    // Progressive enhancement: content is never hidden via CSS, only ever
    // via gsap.set() right here — if reduced motion is on, this whole
    // branch is skipped and every section stays at its natural, fully
    // visible default.
    if (isReducedMotion()) return undefined;

    // Hero entrance — pure opacity/transform sets on elements that already
    // exist, with no ScrollTrigger measurement involved, so it's safe to
    // run synchronously in this same layout-effect pass.
    const heroImage = heroImageRef.current;
    const eyebrow = root.querySelector('.about-eyebrow');
    const name = root.querySelector('.about-name');
    const lead = root.querySelector('.about-lead');

    const heroTargets = [heroImage, eyebrow, name, lead].filter(Boolean);
    if (heroTargets.length) {
      gsap.set(heroTargets, { opacity: 0, y: 20 });
      gsap.to(heroTargets, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.09,
        delay: 0.05,
      });
    }

    // The chapter/detail ScrollTriggers below need an accurate measurement
    // of the scroll container and each trigger element's position — but
    // right here, in a layout effect firing on the very commit that mounts
    // this component, the *ancestor* window section can still carry the
    // `display:none` it had while closed. React fires a child's layout
    // effects before its parent's, and WindowWrapper's own layout effect
    // (the one that clears that `display:none`) belongs to that ancestor —
    // so measuring now made every trigger degenerate to `start:0, end:0`
    // (confirmed directly via `ScrollTrigger.getAll()`, not assumed). A
    // deliberate short delay — past both that ordering and the window's
    // own ~400ms open/pop-in scale animation, which would otherwise also
    // skew a `getBoundingClientRect()`-based measurement taken mid-tween —
    // is simpler and more robust than trying to precisely race either one.
    // `contextSafe` is required here specifically because this work runs
    // inside a `setTimeout`, outside this callback's own synchronous
    // execution — without it, `useGSAP` would have no way to know these
    // ScrollTriggers belong to this context and should be reverted with it.
    const setupChapterReveals = contextSafe(() => {
      const revealChapter = (sectionEl) => {
        if (!sectionEl) return;
        const divider = sectionEl.querySelector('.about-divider');
        const heading = sectionEl.querySelector('.about-section-title');
        const copy = Array.from(sectionEl.querySelectorAll('.about-copy-group > *'));

        const fadeTargets = [heading, ...copy].filter(Boolean);
        if (!divider && !fadeTargets.length) return;

        if (divider) gsap.set(divider, { scaleX: 0, transformOrigin: 'left center' });
        if (fadeTargets.length) gsap.set(fadeTargets, { opacity: 0, y: 20 });

        const tl = gsap.timeline({ paused: true });
        if (divider) tl.to(divider, { scaleX: 1, duration: 0.7, ease: 'power2.out' }, 0);
        if (heading) tl.to(heading, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, divider ? 0.15 : 0);
        if (copy.length) {
          tl.to(copy, { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out', stagger: 0.1 }, divider ? 0.3 : 0.15);
        }

        ScrollTrigger.create({
          trigger: sectionEl,
          scroller,
          start: 'top 82%',
          end: 'top 58%',
          once: true,
          onEnter: () => tl.play(),
        });
      };

      revealChapter(root.querySelector('[data-about-chapter="research"]'));
      revealChapter(root.querySelector('[data-about-chapter="outside"]'));

      // Principle rows — sequential, slightly slower stagger than prose.
      const principleRows = root.querySelectorAll('.about-principle');
      if (principleRows.length) {
        gsap.set(principleRows, { opacity: 0, y: 18 });
        ScrollTrigger.create({
          trigger: root.querySelector('[data-about-chapter="principles"]'),
          scroller,
          start: 'top 82%',
          end: 'top 58%',
          once: true,
          onEnter: () =>
            gsap.to(principleRows, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.12 }),
        });
      }

      // Closing vision — its own divider growth + a slightly stronger rise.
      const visionSection = root.querySelector('[data-about-chapter="vision"]');
      if (visionSection) {
        const visionDivider = visionSection.querySelector('.about-divider');
        const visionText = visionSection.querySelector('p');
        if (visionDivider || visionText) {
          if (visionDivider) gsap.set(visionDivider, { scaleX: 0, transformOrigin: 'left center' });
          if (visionText) gsap.set(visionText, { opacity: 0, y: 20 });

          ScrollTrigger.create({
            trigger: visionSection,
            scroller,
            start: 'top 82%',
            end: 'top 58%',
            once: true,
            onEnter: () => {
              const tl = gsap.timeline();
              if (visionDivider) tl.to(visionDivider, { scaleX: 1, duration: 0.8, ease: 'power2.out' }, 0);
              if (visionText) tl.to(visionText, { opacity: 1, y: 0, duration: 0.85, ease: 'power2.out' }, 0.1);
            },
          });
        }
      }

      // Based in / Often found — quiet, small stagger.
      const detailRows = root.querySelectorAll('.about-detail');
      if (detailRows.length) {
        gsap.set(detailRows, { opacity: 0, y: 14 });
        ScrollTrigger.create({
          trigger: root.querySelector('[data-about-chapter="details"]'),
          scroller,
          start: 'top 88%',
          end: 'top 68%',
          once: true,
          onEnter: () =>
            gsap.to(detailRows, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1 }),
        });
      }

      ScrollTrigger.refresh(true);
    });

    const timeoutId = setTimeout(setupChapterReveals, CHAPTER_TRIGGER_SETUP_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, { scope: rootRef, dependencies: [] });

  // ---- Subtle portrait scrub — wide layout only, sticky handled by CSS ----
  useGSAP(() => {
    const root = rootRef.current;
    const scroller = scrollContainerRef.current;
    const heroImage = heroImageRef.current;
    if (!root || !scroller || !heroImage) return undefined;
    if (isReducedMotion() || !isWide) return undefined;

    gsap.fromTo(
      heroImage,
      { scale: 1.02, y: 0 },
      {
        scale: 1,
        y: -16,
        ease: 'none',
        scrollTrigger: {
          trigger: root.querySelector('.about-hero'),
          scroller,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      },
    );

    return undefined;
  }, { scope: rootRef, dependencies: [isWide], revertOnUpdate: true });
}

export default useAboutScrollAnimations;

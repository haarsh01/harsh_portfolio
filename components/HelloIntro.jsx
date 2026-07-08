import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { isReducedMotion } from '#utils/motion.js';
import { composeWord } from '#utils/handwritingLetters.js';
import { HELLO_WORD } from '#constants/greetings.js';
import { getNextGreeting } from '#utils/getNextGreeting.js';

// Resolved once per actual page load/refresh — module evaluation runs
// exactly once per real load and is never subject to React Strict Mode's
// double-invocation (unlike a useState lazy initializer would be), so the
// non-repeating rotation in getNextGreeting() can never double-advance.
const SELECTED_GREETING = getNextGreeting();
const HELLO_ARTWORK = composeWord(HELLO_WORD);
const TRANSLATION_ARTWORK = SELECTED_GREETING ? composeWord(SELECTED_GREETING.text) : null;
const SEPARATOR_PATH = 'M20,58 C17,100 17,160 20,202';

// One original SVG renderer shared by "hello" and the translated greeting —
// both are just pre-composed path lists at this point, so there is only
// one place that turns "a list of paths" into a drawable, sized SVG.
const GreetingArtwork = React.forwardRef(function GreetingArtwork({ artwork, className }, ref) {
  return (
    <svg
      ref={ref}
      className={className}
      viewBox={`0 0 ${artwork.width} ${artwork.height}`}
      aria-hidden="true"
      focusable="false"
    >
      {artwork.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
});

// One controlled GSAP timeline drives the whole sequence. `tlRef` lets the
// skip path (click/tap/Enter/Escape/Space, all outside the timeline
// itself) kill that exact timeline and snap everything to its finished
// state, instead of leaving it running invisibly behind an already-hidden
// overlay. Deliberately just "hello | translation" on a plain light
// surface — no background word field, no decoration competing with it.
const HelloIntro = ({ onComplete }) => {
  const overlayRef = useRef(null);
  const helloRef = useRef(null);
  const separatorSvgRef = useRef(null);
  const separatorPathRef = useRef(null);
  const translationRef = useRef(null);
  const hasCompletedRef = useRef(false);
  const tlRef = useRef(null);

  const finish = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onComplete?.();
  };

  const skip = () => {
    if (hasCompletedRef.current) return;
    tlRef.current?.kill();
    if (overlayRef.current) gsap.set(overlayRef.current, { opacity: 0 });
    finish();
  };

  useGSAP(() => {
    const overlay = overlayRef.current;
    const helloPaths = helloRef.current ? Array.from(helloRef.current.querySelectorAll('path')) : [];
    const separatorPath = separatorPathRef.current;
    const translationPaths = translationRef.current ? Array.from(translationRef.current.querySelectorAll('path')) : [];

    if (!overlay || !helloPaths.length) { finish(); return undefined; }

    const allDrawPaths = [...helloPaths, separatorPath, ...translationPaths].filter(Boolean);

    if (isReducedMotion()) {
      // Show the completed greeting immediately — no drawing — and exit
      // well under the 600ms budget.
      gsap.set(allDrawPaths, { strokeDasharray: 'none', strokeDashoffset: 0 });
      const tl = gsap.timeline({ onComplete: finish });
      tlRef.current = tl;
      tl.to(overlay, { opacity: 0, duration: 0.25, ease: 'power1.out', delay: 0.25 });
      return () => tl.kill();
    }

    // Prime every drawable path to its hidden (fully-offset) state before
    // any tween runs, so there is never a flash of the finished glyph.
    const setupDraw = (path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
      return length;
    };
    const helloLengths = helloPaths.map(setupDraw);
    if (separatorPath) setupDraw(separatorPath);
    const translationLengths = translationPaths.map(setupDraw);
    gsap.set(separatorPath, { opacity: 0 });

    const drawGroup = (tl, paths, lengths, position, totalDuration) => {
      const totalLength = lengths.reduce((sum, len) => sum + len, 0) || 1;
      let cursor = 0;
      paths.forEach((path, i) => {
        const duration = Math.max((lengths[i] / totalLength) * totalDuration, 0.09);
        tl.to(path, { strokeDashoffset: 0, duration, ease: 'power1.inOut' }, position + cursor);
        cursor += duration * 0.72; // slight overlap — a natural pen speed, not a mechanical stagger
      });
    };

    const tl = gsap.timeline({ onComplete: finish });
    tlRef.current = tl;

    // "hello" draws left to right (~0.05–0.80s).
    drawGroup(tl, helloPaths, helloLengths, 0.05, 0.75);

    // Separator appears (~0.80–0.93s).
    if (separatorPath) {
      tl.to(separatorPath, { opacity: 1, duration: 0.05 }, 0.80);
      tl.to(separatorPath, { strokeDashoffset: 0, duration: 0.13, ease: 'power1.out' }, 0.80);
    }

    // The translated greeting draws (~0.93–1.53s).
    drawGroup(tl, translationPaths, translationLengths, 0.93, 0.60);

    // Brief hold, then a smooth exit.
    tl.to([helloRef.current, separatorSvgRef.current, translationRef.current].filter(Boolean), {
      scale: 0.99,
      opacity: 0.92,
      duration: 0.2,
      ease: 'power1.out',
    }, '+=0.2')
      .to(overlay, { opacity: 0, duration: 0.35, ease: 'power2.inOut' }, '<');

    return () => tl.kill();
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // The overlay is portaled to document.body, so it lands *after* #root
    // in DOM order — without this, Tab would reach the Navbar/Dock behind
    // the (visually opaque, pointer-blocking) overlay before ever reaching
    // Skip, since Tab order follows DOM order, not z-index. `inert` removes
    // the entire app from the accessibility tree and tab order while the
    // overlay is up, without needing to touch tabIndex anywhere else.
    const appRoot = document.getElementById('root');
    appRoot?.setAttribute('inert', '');

    const handleKeyDown = (event) => {
      if (['Enter', 'Escape', ' ', 'Spacebar'].includes(event.key)) {
        event.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.removeProperty('overflow');
      appRoot?.removeAttribute('inert');
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accessibleLabel = SELECTED_GREETING
    ? `Hello — ${SELECTED_GREETING.language} greeting: ${SELECTED_GREETING.text}`
    : 'Hello';

  return createPortal(
    <div
      id="hello-intro"
      ref={overlayRef}
      role="img"
      aria-label={accessibleLabel}
      onClick={skip}
    >
      <div className="hello-intro__center">
        <div className="hello-intro__primary" aria-hidden="true">
          <GreetingArtwork artwork={HELLO_ARTWORK} className="hello-intro__hello" ref={helloRef} />

          <svg ref={separatorSvgRef} className="hello-intro__separator" viewBox="0 0 40 240" aria-hidden="true" focusable="false">
            <path ref={separatorPathRef} d={SEPARATOR_PATH} />
          </svg>

          {TRANSLATION_ARTWORK ? (
            <GreetingArtwork artwork={TRANSLATION_ARTWORK} className="hello-intro__translation" ref={translationRef} />
          ) : null}
        </div>
      </div>

      <button type="button" className="hello-intro__skip" onClick={(event) => { event.stopPropagation(); skip(); }}>
        Skip
      </button>
    </div>,
    document.body,
  );
};

export default HelloIntro;

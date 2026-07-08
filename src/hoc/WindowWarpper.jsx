import React, { useLayoutEffect, useRef } from 'react'
import useWindowStore from "#store/window.js";
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { getMotionDuration as getDuration } from '#utils/motion.js';
import { useIsMobileViewport } from '#hooks/useIsMobileViewport.js';

const MENU_BAR_HEIGHT = 56;
const SCREEN_EDGE_MARGIN = 8;
const BOTTOM_SAFE_MARGIN = 16;
const MAXIMIZE_MARGIN = { top: MENU_BAR_HEIGHT, left: 16, right: 16, bottom: 112 };
const DEFAULT_MIN_WIDTH = 360;
const DEFAULT_MIN_HEIGHT = 280;

const RESIZE_DIRECTIONS = [
  { dir: "n" },
  { dir: "s" },
  { dir: "e" },
  { dir: "w" },
  { dir: "ne" },
  { dir: "nw" },
  { dir: "se" },
  { dir: "sw" },
];

// GSAP's Draggable attaches its own native pointerdown listener directly on
// the window element and, by default, calls preventDefault() on it (to
// suppress text-selection/native-drag while the user drags the window
// around) — including when the pointerdown target is a real <textarea>,
// <input>, or <button>. preventDefault() on pointerdown/mousedown also
// suppresses the browser's native "focus the element" behavior, so any
// interactive control inside a window (a composer textarea, a form input)
// would silently fail to focus on click. `dragClickables: false` plus this
// custom clickableTest tells Draggable to skip preventDefault/drag-init
// (while still dispatching onPress so the window still gets raised/focused)
// for native interactive elements and anything explicitly opted out via
// data-no-drag, without touching drag behavior anywhere else in the window.
const isNonDraggableTarget = (target) => !!(
  target
  && typeof target.closest === "function"
  && target.closest('a, input, textarea, button, select, [contenteditable="true"], [data-no-drag]')
);

const getDockTarget = (windowKey) => {
  const dockIcon =
    document.querySelector(`.dock-icon[data-window="${windowKey}"]`) ||
    document.querySelector(`.dock-icon[data-window="finder"]`);
  if (dockIcon) return dockIcon.getBoundingClientRect();

  const dock = document.getElementById("dock");
  if (dock) return dock.getBoundingClientRect();

  return { left: window.innerWidth / 2, top: window.innerHeight, width: 0, height: 0 };
};

const WindowWarpper = (Component, windowKey) => {
  const Wrapped = (props) => {
    const { focusWindow, windows } = useWindowStore();
    const {
      isOpen, zIndex, isMinimized, isMaximized,
      resizable = true,
      minWidth = DEFAULT_MIN_WIDTH,
      minHeight = DEFAULT_MIN_HEIGHT,
    } = windows[windowKey];
    const isMobile = useIsMobileViewport();
    const ref = useRef(null);
    const draggableRef = useRef(null);
    const minimizeStateRef = useRef(null);
    const maximizeStateRef = useRef(null);
    const resizeStateRef = useRef(null);
    const resizeFrameRef = useRef(null);
    const resizeHandlesRef = useRef(null);
    const startResizeRef = useRef(null);

    useGSAP(() => {
      const el = ref.current;
      if(!el || !isOpen) return;

      el.style.removeProperty("display");
      gsap.fromTo(el, {scale: 0.8, opacity: 0, y: 40}, {scale: 1, opacity: 1, y: 0, duration: getDuration(0.4), ease: "power3.out"});


    }, [isOpen]);

    useGSAP(() =>{
      const el = ref.current;
      // Mobile windows are forced full-screen by CSS (see index.css) — a
      // free `transform: translate(x,y)` from Draggable would still slide
      // the window visually away from that fixed position, so dragging is
      // never initialized at all below the mobile breakpoint rather than
      // merely disabled after the fact.
      if(!el || isMobile) return;
     const [instance] = Draggable.create(el, {
        onPress: () => focusWindow(windowKey),
        dragClickables: false,
        clickableTest: isNonDraggableTarget,
      });
        draggableRef.current = instance;
        return() => instance.kill();

    }, [isMobile])

    useGSAP(() => {
      const el = ref.current;
      if(!el) return;

      if(isMinimized){
        minimizeStateRef.current = {
          x: gsap.getProperty(el, "x"),
          y: gsap.getProperty(el, "y"),
          scale: gsap.getProperty(el, "scale"),
        };

        const rect = el.getBoundingClientRect();
        const target = getDockTarget(windowKey);
        const targetX = target.left + target.width / 2;
        const targetY = target.top + target.height / 2;

        gsap.to(el, {
          x: `+=${targetX - (rect.left + rect.width / 2)}`,
          y: `+=${targetY - (rect.top + rect.height / 2)}`,
          scale: 0.1,
          opacity: 0,
          duration: getDuration(0.45),
          ease: "power2.in",
          onComplete: () => { el.style.display = "none"; },
        });
      } else if(minimizeStateRef.current){
        const prev = minimizeStateRef.current;
        minimizeStateRef.current = null;

        el.style.removeProperty("display");
        gsap.fromTo(el,
          { x: prev.x, y: prev.y, scale: 0.1, opacity: 0 },
          { scale: prev.scale, opacity: 1, duration: getDuration(0.4), ease: "power2.out" },
        );
      }
    }, [isMinimized]);

    useGSAP(() => {
      const el = ref.current;
      if(!el) return;
      const instance = draggableRef.current;

      if(isMaximized){
        // Bake the current visual box (CSS defaults, a prior drag transform,
        // and/or a prior manual resize are all reflected in this rect) into
        // explicit top/left/width/height so restoring later can animate back
        // to exactly this box, regardless of how the window got here.
        const rect = el.getBoundingClientRect();
        maximizeStateRef.current = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        instance?.disable();
        gsap.set(el, { x: 0, y: 0 });
        el.style.top = `${rect.top}px`;
        el.style.left = `${rect.left}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;

        gsap.to(el, {
          top: MAXIMIZE_MARGIN.top,
          left: MAXIMIZE_MARGIN.left,
          width: window.innerWidth - MAXIMIZE_MARGIN.left - MAXIMIZE_MARGIN.right,
          height: window.innerHeight - MAXIMIZE_MARGIN.top - MAXIMIZE_MARGIN.bottom,
          duration: getDuration(0.35),
          ease: "power2.out",
        });
      } else if(maximizeStateRef.current){
        const prev = maximizeStateRef.current;
        maximizeStateRef.current = null;

        // Animate back to the exact pre-maximize box and leave it pinned via
        // inline styles (same convention manual resize uses) instead of
        // stripping back to the original stylesheet size/position.
        gsap.to(el, {
          top: prev.top,
          left: prev.left,
          width: prev.width,
          height: prev.height,
          duration: getDuration(0.3),
          ease: "power2.inOut",
          onComplete: () => { instance?.enable(); },
        });
      }
    }, [isMaximized]);


    useLayoutEffect(() =>{
      const el = ref.current;
      if(!el) return;
      if(isOpen && !isMinimized){
        el.style.removeProperty("display");
      } else if(!isOpen){
        el.style.display = "none";
      }

    }, [isOpen, isMinimized]);

    // Neither dragging (a GSAP transform on top of the base CSS position)
    // nor manual resizing (explicit inline top/left/width/height) ever gets
    // reconciled against the viewport shrinking later — a window dragged
    // to use most of a large screen, or maximized to fill it, could end up
    // partly or fully off-screen (traffic-light controls included) after
    // the browser window shrinks or a device rotates. This nudges it back
    // into reach whenever that happens, using the real on-screen rect
    // (which already reflects transform + inline styles combined) rather
    // than assuming which one is currently in play.
    useLayoutEffect(() => {
      const handleViewportResize = () => {
        const el = ref.current;
        if (!el || !isOpen || isMinimized) return;

        if (isMaximized) {
          el.style.width = `${window.innerWidth - MAXIMIZE_MARGIN.left - MAXIMIZE_MARGIN.right}px`;
          el.style.height = `${window.innerHeight - MAXIMIZE_MARGIN.top - MAXIMIZE_MARGIN.bottom}px`;
          return;
        }

        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const minVisible = 96; // enough of the window must stay reachable to grab/close it

        let dx = 0;
        let dy = 0;
        if (rect.right < minVisible) dx = minVisible - rect.right;
        else if (rect.left > vw - minVisible) dx = (vw - minVisible) - rect.left;

        if (rect.top < MENU_BAR_HEIGHT) dy = MENU_BAR_HEIGHT - rect.top;
        else if (rect.top > vh - minVisible) dy = (vh - minVisible) - rect.top;

        if (dx || dy) {
          const currentX = gsap.getProperty(el, "x") || 0;
          const currentY = gsap.getProperty(el, "y") || 0;
          gsap.set(el, { x: currentX + dx, y: currentY + dy });
        }
      };

      window.addEventListener("resize", handleViewportResize);
      return () => window.removeEventListener("resize", handleViewportResize);
    }, [isOpen, isMinimized, isMaximized]);

    // Cleanup any in-flight resize gesture if the window is closed, minimized
    // or maximized mid-drag, so listeners and rAF callbacks never leak.
    useLayoutEffect(() => {
      if(isMaximized || isMinimized || !isOpen){
        resizeStateRef.current?.cancel();
      }
    }, [isMaximized, isMinimized, isOpen]);

    useLayoutEffect(() => () => {
      resizeStateRef.current?.cancel();
      if(resizeFrameRef.current != null) cancelAnimationFrame(resizeFrameRef.current);
    }, []);

    const applyResizeFrame = () => {
      resizeFrameRef.current = null;
      const el = ref.current;
      const state = resizeStateRef.current;
      if(!el || !state) return;
      el.style.top = `${state.current.top}px`;
      el.style.left = `${state.current.left}px`;
      el.style.width = `${state.current.width}px`;
      el.style.height = `${state.current.height}px`;
    };

    const startResize = (event, direction, handle) => {
      const el = ref.current;
      if(!el || !resizable || isMaximized) return;
      if(event.button != null && event.button !== 0) return;

      event.preventDefault();
      focusWindow(windowKey);

      const rect = el.getBoundingClientRect();
      gsap.set(el, { x: 0, y: 0 });
      el.style.top = `${rect.top}px`;
      el.style.left = `${rect.left}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;

      handle.setPointerCapture(event.pointerId);

      const start = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      };

      const onMove = (moveEvent) => {
        const state = resizeStateRef.current;
        if(!state) return;

        const dx = moveEvent.clientX - start.pointerX;
        const dy = moveEvent.clientY - start.pointerY;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let width = start.width;
        let left = start.left;
        if(direction.includes("e")){
          const maxWidth = Math.max(minWidth, vw - SCREEN_EDGE_MARGIN - start.left);
          width = Math.min(Math.max(start.width + dx, minWidth), maxWidth);
        } else if(direction.includes("w")){
          const maxWidth = Math.max(minWidth, start.left + start.width - SCREEN_EDGE_MARGIN);
          width = Math.min(Math.max(start.width - dx, minWidth), maxWidth);
          left = start.left + start.width - width;
        }

        let height = start.height;
        let top = start.top;
        if(direction.includes("s")){
          const maxHeight = Math.max(minHeight, vh - BOTTOM_SAFE_MARGIN - start.top);
          height = Math.min(Math.max(start.height + dy, minHeight), maxHeight);
        } else if(direction.includes("n")){
          const maxHeight = Math.max(minHeight, start.top + start.height - MENU_BAR_HEIGHT);
          height = Math.min(Math.max(start.height - dy, minHeight), maxHeight);
          top = start.top + start.height - height;
        }

        if(![top, left, width, height].every(Number.isFinite)) return;

        state.current = { top, left, width, height };

        if(resizeFrameRef.current == null){
          resizeFrameRef.current = requestAnimationFrame(applyResizeFrame);
        }
      };

      const endResize = () => {
        try { handle.releasePointerCapture(event.pointerId); } catch { /* already released */ }
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", endResize);
        handle.removeEventListener("pointercancel", endResize);

        if(resizeFrameRef.current != null){
          cancelAnimationFrame(resizeFrameRef.current);
          applyResizeFrame();
        }
        resizeStateRef.current = null;
        document.body.style.removeProperty("user-select");
        document.body.style.removeProperty("cursor");
      };

      resizeStateRef.current = {
        current: { ...start },
        cancel: endResize,
      };

      document.body.style.userSelect = "none";
      document.body.style.cursor = getComputedStyle(handle).cursor;

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", endResize);
      handle.addEventListener("pointercancel", endResize);
    };

    // Always call the latest startResize without re-binding the native
    // listener — mirrored into the ref inside an effect (runs after every
    // render, no dependency array) rather than during render itself, since
    // mutating a ref directly in the render body is unsafe under React's
    // render-replay guarantees.
    useLayoutEffect(() => {
      startResizeRef.current = startResize;
    });

    // GSAP Draggable attaches its pointerdown listener natively, directly on
    // `el`. A React onPointerDown prop on a descendant fires too late to stop
    // that native ancestor listener via stopPropagation (React only dispatches
    // synthetic events once bubbling reaches its root, which is after native
    // ancestor listeners already ran) — so this listener has to be native too.
    useLayoutEffect(() => {
      const wrapper = resizeHandlesRef.current;
      if(!wrapper) return undefined;

      const onPointerDown = (event) => {
        const handle = event.target.closest(".resize-handle");
        if(!handle) return;
        event.stopPropagation();
        startResizeRef.current?.(event, handle.dataset.direction, handle);
      };

      wrapper.addEventListener("pointerdown", onPointerDown);
      return () => wrapper.removeEventListener("pointerdown", onPointerDown);
    }, [resizable, isMaximized]);

    return (
      <section
        id={windowKey}
        ref={ref}
        style={{ zIndex }}
        className="absolute window-surface"
        data-maximized={isMaximized || undefined}
      >
        <Component {...props} />
        {resizable && !isMaximized && !isMobile ? (
          <div className="resize-handles" ref={resizeHandlesRef} aria-hidden="true">
            {RESIZE_DIRECTIONS.map(({ dir }) => (
              <span
                key={dir}
                className={`resize-handle resize-${dir}`}
                data-direction={dir}
              />
            ))}
          </div>
        ) : null}
      </section>
    );
  };
  Wrapped.displayName = `WindowWrapper(${Component.displayName || Component.name || "Component"})`;
  return Wrapped;
};

export default WindowWarpper;

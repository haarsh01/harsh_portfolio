import React, { useRef, useState } from 'react'
import gsap from "gsap";
import {dockApps} from "#constants/index.js";
import {useGSAP} from "@gsap/react";
import useWindowStore from "#store/window.js"
import usePreferencesStore from "#store/preferences.js";
import { getMotionDuration } from "#utils/motion.js";

// Below this Gaussian intensity, an icon is "in the ambient falloff" but
// not genuinely the one being pointed at/focused — used to decide when
// the controlled tooltip should hide entirely (mouse in the Dock's own
// padding, not really over any icon).
const TOOLTIP_INTENSITY_THRESHOLD = 0.12;

const Dock = () => {
  const{openWindow, focusWindow, restoreWindow, windows} = useWindowStore();
  const dock = usePreferencesStore((state) => state.dock);
  const motionOSReduced = usePreferencesStore((state) => state.motionOSReduced);
  const animationsEnabled = usePreferencesStore((state) => state.motion.animationsEnabled);
  const dockRef = useRef(null);
  const tooltipRef = useRef(null);
  const activeIdRef = useRef(null);
  // { id, name } | null — the ONLY React state this whole interaction
  // touches; see the note above the tooltip setup below for why.
  const [activeTooltip, setActiveTooltip] = useState(null);

useGSAP(() => {
  const dockEl = dockRef.current;
  if(!dockEl) return undefined;
  const icons = Array.from(dockEl.querySelectorAll(".dock-icon"));
  if(!icons.length) return undefined;

  // gsap.to() previously ran fresh (a brand-new tween, per icon) on every
  // single mousemove event — that per-call tween-creation overhead, spread
  // across every icon on every pointer tick, is what made magnification
  // feel delayed rather than the duration numbers themselves. quickTo()
  // builds one optimized setter per icon/property up front; a mousemove
  // then only feeds it a new target value, which is what keeps the visible
  // response tight (~150ms) even at a high mousemove rate, and the same
  // setters double as the "return to normal" animation on mouse-leave.
  //
  // Uses "scaleX"/"scaleY" rather than the "scale" shorthand: GSAP's
  // quickTo() silently no-ops on "scale" (logs "scale not eligible for
  // reset" and the value never advances) because quickTo's fast-reset path
  // doesn't support that compound property — confirmed directly against
  // this GSAP version, not a hypothetical. The atomic scaleX/scaleY
  // properties don't have that limitation and animate identically since
  // this dock never needs non-uniform scaling.
  const duration = getMotionDuration(0.15);

  // Base (resting, untransformed) geometry captured once while every icon
  // is still at scale 1 — never re-derived from a mid-gesture
  // getBoundingClientRect() call, which would read GSAP's own transform
  // back as layout and compound error frame over frame. This is also what
  // lets the horizontal-displacement math below work in a simple relative
  // coordinate space (each icon's delta from ITS OWN resting position)
  // instead of juggling live viewport coordinates.
  let baseWidth = 56;
  let baseHeight = 56;
  let baseGap = 6;
  let relativeBaseCenters = icons.map((_, i) => i * 62);

  const captureBaseGeometry = () => {
    const dockLeft = dockEl.getBoundingClientRect().left;
    const rects = icons.map((icon) => icon.getBoundingClientRect());
    baseWidth = rects[0]?.width || baseWidth;
    baseHeight = rects[0]?.height || baseHeight;
    baseGap = rects.length > 1 ? Math.max(0, rects[1].left - rects[0].right) : baseGap;
    // Relative to the SAME origin handleMouseMove uses for mouseX
    // (dockEl's own left edge) — not icon 0's center. Those previously
    // differed by dock-items' left padding + half an icon width (~48px),
    // a constant offset that silently biased every distance/intensity
    // calculation below toward the wrong neighbor (proven live: it
    // produced a strictly-one-off "shows the next icon" tooltip pattern,
    // not random noise).
    relativeBaseCenters = rects.map((r) => r.left + r.width / 2 - dockLeft);
  };
  captureBaseGeometry();

  // Derived, documented constants (replacing an unexplained "20000" and a
  // bare "60") — every one is a function of real, measured icon geometry
  // rather than a guessed number, so they stay correct at any icon size
  // (3xl:size-20) or Control Center magnification amount.
  //
  // DOCK_INFLUENCE_RADIUS: distance (px) at which a neighbor's Gaussian
  // falloff intensity has dropped to ~1/e — set to ~2.5 icon-slots so the
  // hovered icon dominates, immediate neighbors get a clearly smaller
  // boost, second neighbors a subtle one, and far icons stay ~base size.
  // DOCK_MAX_LIFT: the extra upward travel at full intensity/scale — tied
  // to the icon's own height (rise by up to "one icon tall") rather than
  // an arbitrary pixel count.
  const DOCK_INFLUENCE_RADIUS = (baseWidth + baseGap) * 2.5;
  const DOCK_MAX_LIFT = baseHeight;
  const TOOLTIP_GAP = 10;

  const setters = icons.map((icon) => ({
    scaleXTo: gsap.quickTo(icon, "scaleX", { duration, ease: "power2.out", overwrite: "auto" }),
    scaleYTo: gsap.quickTo(icon, "scaleY", { duration, ease: "power2.out", overwrite: "auto" }),
    xTo: gsap.quickTo(icon, "x", { duration, ease: "power2.out", overwrite: "auto" }),
    yTo: gsap.quickTo(icon, "y", { duration, ease: "power2.out", overwrite: "auto" }),
  }));

  // The Dock tooltip is deliberately NOT driven by native hover/focus
  // events on the (continuously transformed) icon buttons. Proven live:
  // once icons displace horizontally to make room for a magnified
  // neighbor, the browser's own hit-testing can end up "under" a
  // different icon than the one the pointer is actually approaching,
  // which fed react-tooltip the wrong anchor/content on the first
  // interaction after every page load (reproduced with real, continuous,
  // real-time-paced mouse movement — not just an instant jump — and
  // confirmed to disappear entirely when horizontal displacement is
  // disabled, isolating it to exactly that). Instead this is a single
  // controlled tooltip whose content/position are driven by the exact
  // same per-icon intensity this function already computes for scaling —
  // logically unambiguous regardless of how far anything has visually
  // shifted. React state is only touched when the *identity* of the
  // active icon changes (via activeIdRef), not on every mousemove tick,
  // so this doesn't add a render per pointer frame.
  const tooltipEl = tooltipRef.current;
  gsap.set(tooltipEl, { xPercent: -50 });
  const tooltipXTo = gsap.quickTo(tooltipEl, "x", { duration, ease: "power2.out", overwrite: "auto" });
  const tooltipYTo = gsap.quickTo(tooltipEl, "y", { duration, ease: "power2.out", overwrite: "auto" });
  const TOOLTIP_VIEWPORT_MARGIN = 8;
  // A live `tooltipEl.getBoundingClientRect().width` would be stale here:
  // this runs synchronously in the mousemove handler, before React has
  // re-rendered the tooltip's text for the icon it's about to move to
  // (setActiveIndex below only flushes on the next render) — so it would
  // always measure the *previous* label, not the one about to show. A
  // fixed estimate sized for the longest real label ("Ask HarshBot", at
  // this tooltip's own text-xs/font-medium/px-10 padding) avoids that
  // entirely, at the cost of being a few px more conservative than
  // necessary for shorter labels.
  const TOOLTIP_HALF_WIDTH_ESTIMATE = 60;

  // `x` here is in the same dock-relative coordinate frame as the icon
  // positions above (tooltipEl's untransformed `left:0` sits at dockEl's
  // own left edge) — converts to/from real viewport coordinates just to
  // clamp against the window's edges, so a tooltip over the first/last
  // icon (e.g. HarshBot, hard against the right edge of the screen)
  // never renders partially off-screen the way icon positions are
  // already clamped to stay inside the dock itself.
  const clampTooltipX = (x) => {
    const dockLeft = dockEl.getBoundingClientRect().left;
    const halfWidth = TOOLTIP_HALF_WIDTH_ESTIMATE;
    const minX = TOOLTIP_VIEWPORT_MARGIN - dockLeft + halfWidth;
    const maxX = window.innerWidth - TOOLTIP_VIEWPORT_MARGIN - dockLeft - halfWidth;
    return minX <= maxX ? Math.min(Math.max(x, minX), maxX) : x;
  };

  const setActiveIndex = (index) => {
    const app = index == null ? null : dockApps[index];
    const id = app?.id ?? null;
    if (activeIdRef.current === id) return;
    activeIdRef.current = id;
    setActiveTooltip(app ? { id: app.id, name: app.name } : null);
  };

  // Positions the tooltip over a given icon at rest (no magnification) —
  // used by keyboard focus, which never triggers animateIcons at all.
  const showTooltipAtRest = (index) => {
    tooltipXTo(clampTooltipX(relativeBaseCenters[index]));
    tooltipYTo(-(baseHeight + TOOLTIP_GAP));
    setActiveIndex(index);
  };

  const hideTooltip = () => setActiveIndex(null);

  const resetIcons = () => {
    setters.forEach(({ scaleXTo, scaleYTo, xTo, yTo }) => {
      scaleXTo(1);
      scaleYTo(1);
      xTo(0);
      yTo(0);
    });
    hideTooltip();
  };

  const handleFocusIn = (event) => {
    const target = event.target.closest(".dock-icon");
    if (!target) return;
    const index = icons.indexOf(target);
    if (index === -1) return;
    showTooltipAtRest(index);
  };
  const handleFocusOut = (event) => {
    if (event.target.closest(".dock-icon")) hideTooltip();
  };

  if(!dock.magnification){
    resetIcons();
    // Magnification drives the controlled tooltip everywhere else (see
    // the note above tooltipXTo) — with it off there's no per-frame
    // scale/intensity pass to piggyback on, so mouse-hover tooltips need
    // their own lightweight "which icon is closest" path. No scale/x/y
    // math at all here, matching Step 9's "zero horizontal displacement"
    // requirement when magnification is disabled.
    const handleMouseMoveNoMagnification = (e) => {
      const { left } = dockEl.getBoundingClientRect();
      const mouseX = e.clientX - left;
      let closestIndex = 0;
      let closestDistance = Infinity;
      relativeBaseCenters.forEach((center, i) => {
        const distance = Math.abs(mouseX - center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      });
      if (closestDistance <= baseWidth) showTooltipAtRest(closestIndex);
      else hideTooltip();
    };
    dockEl.addEventListener("mousemove", handleMouseMoveNoMagnification);
    dockEl.addEventListener("mouseleave", hideTooltip);
    dockEl.addEventListener("focusin", handleFocusIn);
    dockEl.addEventListener("focusout", handleFocusOut);
    return () => {
      dockEl.removeEventListener("mousemove", handleMouseMoveNoMagnification);
      dockEl.removeEventListener("mouseleave", hideTooltip);
      dockEl.removeEventListener("focusin", handleFocusIn);
      dockEl.removeEventListener("focusout", handleFocusOut);
    };
  }

  const animateIcons = (mouseX) => {
    const scaleBoost = dock.magnificationScale;

    // 1. Scale + intensity per icon (mouseX is already relative to the
    //    dock's own left edge, same frame as relativeBaseCenters).
    const scales = relativeBaseCenters.map((center) => {
      const distance = Math.abs(mouseX - center);
      const intensity = Math.exp(-(distance ** 2) / (2 * DOCK_INFLUENCE_RADIUS ** 2));
      return { scale: 1 + scaleBoost * intensity, intensity };
    });

    // 2. Cumulative horizontal displacement (Step: "preferred approach").
    //    Lay every icon out edge-to-edge using its *effective* (magnified)
    //    width — the same result real animated `width` reflow would
    //    produce — entirely in JS, without ever touching real layout.
    const effectiveWidths = scales.map(({ scale }) => baseWidth * scale);
    const newLefts = [];
    // Start the simulated layout at icon 0's REAL resting left edge (same
    // dockEl-relative frame as relativeBaseCenters/mouseX), not at 0 —
    // otherwise this silently ignored .dock-items' own left padding and
    // every icon would carry a constant, spurious delta even at rest.
    let cursor = relativeBaseCenters[0] - baseWidth / 2;
    effectiveWidths.forEach((w, i) => {
      newLefts[i] = cursor;
      cursor += w + baseGap;
    });
    const newTotalWidth = cursor - baseGap;
    const originalTotalWidth = relativeBaseCenters[relativeBaseCenters.length - 1] - relativeBaseCenters[0] + baseWidth;
    // Keep the row centered as it expands/contracts rather than growing
    // only to one side.
    let centeringOffset = (originalTotalWidth - newTotalWidth) / 2;

    // 3. Clamp the first/last icon within the dock's own usable width so
    //    neither can be pushed outside the viewport at maximum
    //    magnification (Step 7 / "clamp the first and last icon").
    //
    // Both bounds are computed and applied together, never as an
    // if/else-if picking only one — hovering a MIDDLE icon bulges the
    // cumulative layout on both sides at once (every icon after it is
    // pushed right by the bulge), which can push the first icon left of
    // 0 AND the last icon past dockWidth simultaneously. The previous
    // if/else-if only ever corrected whichever violation it checked
    // first (always the first icon, since it's checked before `else
    // if`), so the trailing icon could still get shoved out past the
    // dock's own right edge — confirmed live: hovering a middle icon
    // clipped the last icon almost entirely off the glass surface via
    // `.dock-items`' own `overflow-x: auto`, since GSAP's transform
    // moves it visually past the container's real (untransformed) box
    // without ever changing that box's actual scrollWidth.
    const dockWidth = dockEl.clientWidth || originalTotalWidth;
    const minCenteringOffset = -newLefts[0];
    const maxCenteringOffset = dockWidth - (newLefts[newLefts.length - 1] + effectiveWidths[effectiveWidths.length - 1]);
    centeringOffset = minCenteringOffset <= maxCenteringOffset
      ? Math.min(Math.max(centeringOffset, minCenteringOffset), maxCenteringOffset)
      // The magnified row is now genuinely wider than the dock itself —
      // no single offset can satisfy both ends. Split the difference so
      // it overflows evenly on both sides instead of clipping only one.
      : (minCenteringOffset + maxCenteringOffset) / 2;

    let topIndex = 0;
    let topIntensity = -Infinity;

    setters.forEach(({ scaleXTo, scaleYTo, xTo, yTo }, i) => {
      const { scale, intensity } = scales[i];
      const newCenter = newLefts[i] + effectiveWidths[i] / 2 + centeringOffset;
      const delta = newCenter - relativeBaseCenters[i];
      scaleXTo(scale);
      scaleYTo(scale);
      xTo(delta);
      yTo(-DOCK_MAX_LIFT * scaleBoost * intensity);

      if (intensity > topIntensity) {
        topIntensity = intensity;
        topIndex = i;
      }
    });

    // 4. Track/position the controlled tooltip on the single most-intense
    //    icon this frame — same coordinate math as that icon's own x, so
    //    it stays centered above it regardless of how far it's shifted.
    if (topIntensity > TOOLTIP_INTENSITY_THRESHOLD) {
      const { scale, intensity } = scales[topIndex];
      const newCenter = newLefts[topIndex] + effectiveWidths[topIndex] / 2 + centeringOffset;
      const extraRise = baseHeight * (scale - 1) + DOCK_MAX_LIFT * scaleBoost * intensity;
      tooltipXTo(clampTooltipX(newCenter));
      tooltipYTo(-(baseHeight + TOOLTIP_GAP + extraRise));
      setActiveIndex(topIndex);
    } else {
      hideTooltip();
    }
  };

  const handleMouseMove = (e) => {
    const {left} = dockEl.getBoundingClientRect();
    animateIcons(e.clientX - left);
  };

  const handleResize = () => captureBaseGeometry();

  dockEl.addEventListener("mousemove", handleMouseMove);
  dockEl.addEventListener("mouseleave", resetIcons);
  dockEl.addEventListener("focusin", handleFocusIn);
  dockEl.addEventListener("focusout", handleFocusOut);
  window.addEventListener("resize", handleResize);

  return ()=>{
    dockEl.removeEventListener("mousemove", handleMouseMove);
    dockEl.removeEventListener("mouseleave", resetIcons);
    dockEl.removeEventListener("focusin", handleFocusIn);
    dockEl.removeEventListener("focusout", handleFocusOut);
    window.removeEventListener("resize", handleResize);
  };
}, [dock.magnification, dock.magnificationScale, motionOSReduced, animationsEnabled]);



  const toggleApp = (app) => {
    if(!app.canOpen) return;
    const window = windows[app.id];
    if(!window){
      console.error(`window not found for app: ${app.id}`);
      return;
    }
    if(!window.isOpen){
      // Deliberately does not write to the URL — routine Dock navigation
      // used to push a `?app=...` entry on every open, which meant a
      // later plain reload of that (now-permanent) URL "auto-reopened"
      // whatever had last been used. Explicit sharing (ShareButton /
      // HandoffPanel) still computes a shareable link on demand.
      openWindow(app.id);
    } else if(window.isMinimized){
      restoreWindow(app.id);
    } else {
      focusWindow(app.id);
    }
  };

  return <section id="dock">
    {/* Purely decorative rounded/blurred background — sized and anchored
        to the compact "resting" capsule only (see #dock .dock-surface in
        index.css), never to the taller interactive layer below, so it can
        stay visually clipped/rounded without ever clipping a magnified
        icon (those live in a sibling layer with overflow: visible). */}
    <div className="dock-surface" aria-hidden="true" />
    <div ref={dockRef} className="dock-items">
      {dockApps.map(({id, name, icon, canOpen}) => (
        <div key={id} className="dock-item">
          <button
          type="button"
          className="dock-icon"
          data-window={id}
          aria-label={name}
          disabled={!canOpen}
          onClick={() => toggleApp({id, name, icon, canOpen})}
          >
            <img
            src={`/images/${icon}`}
            alt={name}
            loading="lazy"
            draggable={false}
            className={canOpen ? "" : "opacity-60"}

            />

          </button>
          {windows[id]?.isOpen ? <span className="dock-indicator"/> : null}
        </div>
      ))}
      <span
        ref={tooltipRef}
        className="dock-tooltip"
        role="status"
        aria-hidden={!activeTooltip}
        data-visible={activeTooltip ? "true" : undefined}
      >
        {activeTooltip?.name}
      </span>
    </div>

  </section>
};

export default Dock;

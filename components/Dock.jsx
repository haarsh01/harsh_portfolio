import React from 'react'
import {useRef} from "react";
import gsap from "gsap";
import {Tooltip} from "react-tooltip";
import {dockApps} from "#constants/index.js";
import {useGSAP} from "@gsap/react";
import useWindowStore from "#store/window.js"
import usePreferencesStore from "#store/preferences.js";
import { getMotionDuration } from "#utils/motion.js";
const Dock = () => {
  const{openWindow, focusWindow, restoreWindow, windows} = useWindowStore();
  const dock = usePreferencesStore((state) => state.dock);
  const motionOSReduced = usePreferencesStore((state) => state.motionOSReduced);
  const animationsEnabled = usePreferencesStore((state) => state.motion.animationsEnabled);
  const dockRef = useRef(null);

useGSAP(() => {
  const dockEl = dockRef.current;
  if(!dockEl) return undefined;
  const icons = Array.from(dockEl.querySelectorAll(".dock-icon"));

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

  const setters = icons.map((icon) => ({
    icon,
    scaleXTo: gsap.quickTo(icon, "scaleX", { duration, ease: "power2.out", overwrite: "auto" }),
    scaleYTo: gsap.quickTo(icon, "scaleY", { duration, ease: "power2.out", overwrite: "auto" }),
    yTo: gsap.quickTo(icon, "y", { duration, ease: "power2.out", overwrite: "auto" }),
  }));

  const resetIcons = () => {
    setters.forEach(({ scaleXTo, scaleYTo, yTo }) => {
      scaleXTo(1);
      scaleYTo(1);
      yTo(0);
    });
  };

  if(!dock.magnification){
    resetIcons();
    return undefined;
  }

  const animateIcons = (mouseX) => {
    const {left} = dockEl.getBoundingClientRect();
    const scaleBoost = dock.magnificationScale;

    setters.forEach(({ icon, scaleXTo, scaleYTo, yTo }) => {
      const {left:iconLeft, width} = icon.getBoundingClientRect();
      const center = iconLeft - left + width / 2;
      const distance = Math.abs(mouseX - center);

      const intensity = Math.exp(-(distance ** 2) / 20000);
      const scale = 1 + scaleBoost * intensity;
      scaleXTo(scale);
      scaleYTo(scale);
      yTo(-60 * scaleBoost * intensity);
    });
  };

  const handleMouseMove = (e) => {
    const {left} = dockEl.getBoundingClientRect();
    animateIcons(e.clientX - left);
  };

  dockEl.addEventListener("mousemove", handleMouseMove);
  dockEl.addEventListener("mouseleave", resetIcons);

  return ()=>{
    dockEl.removeEventListener("mousemove", handleMouseMove);
    dockEl.removeEventListener("mouseleave", resetIcons);
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
    <div ref={dockRef} className="dock-container">
      {dockApps.map(({id, name, icon, canOpen}) => (
        <div key={id} className="relative flex justify-center">
          <button
          type="button"
          className="dock-icon"
          data-window={id}
          aria-label={name}
          data-tooltip-id="dock-tooltip"
          data-tooltip-content={name}
          data-tooltip-delay-show={150}
          disabled={!canOpen}
          onClick={() => toggleApp({id, name, icon, canOpen})}
          >
            <img
            src={`/images/${icon}`}
            alt={name}
            loading="lazy"
            className={canOpen ? "" : "opacity-60"}

            />

          </button>
          {windows[id]?.isOpen ? <span className="dock-indicator"/> : null}
        </div>
      ))}
      <Tooltip id="dock-tooltip" place="top" className="tooltip"/>

    </div>

  </section>
};

export default Dock;

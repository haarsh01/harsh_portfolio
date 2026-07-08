import React, { useRef } from 'react';
import { Info, LayoutGrid, Pencil, RotateCcw } from 'lucide-react';
import useWindowStore from "#store/window.js";
import usePreferencesStore from "#store/preferences.js";
import useWidgetsStore from "#store/widgets.js";
import useSystemUIStore from "#store/systemUI.js";
import useDesktopItemsStore from "#store/desktopItems.js";
import gsap from "gsap";
import DesktopIcons from "#components/DesktopIcons.jsx";
import DesktopWidgets from "#components/DesktopWidgets.jsx";
import MobileHome from "#components/MobileHome.jsx";
import { isReducedMotion } from "#utils/motion.js";
import { useIsMobileViewport } from "#hooks/useIsMobileViewport.js";

// The desktop layer — every individually draggable desktop icon (project
// folders, about-me.txt, Resume.pdf; see DesktopIcons.jsx) plus Desktop
// Widgets, sharing this same coordinate space (#home) so their positions
// line up. Desktop Stacks (grouped category folders) have been removed
// from this layer entirely per the current design: the desktop only ever
// shows real individual items now, never a "Projects"/"Documents"/"Music"
// style grouping.
const Home = () => {
  const { openWindow } = useWindowStore();
  const preferences = usePreferencesStore();
  const { setEditMode } = useWidgetsStore();
  const { openContextMenu, openControlCenter, setSelectedItem } = useSystemUIStore();
  const { resetPositions } = useDesktopItemsStore();
  const sectionRef = useRef(null);
  const isMobile = useIsMobileViewport();

  const refreshDesktop = () => {
    setSelectedItem(null);
    const el = sectionRef.current;
    if (!el || isReducedMotion()) return;
    gsap.fromTo(el, { opacity: 0.5 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
  };

  const editWidgets = () => {
    preferences.setDesktop({ showWidgets: true });
    setEditMode(true);
  };

  const openDesktopMenu = (event) => {
    if (event.target.closest('.desktop-icon, .widget-card')) return;
    event.preventDefault();
    openContextMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        { key: "reset-icons", label: "Reset Icon Positions", icon: RotateCcw, onSelect: resetPositions },
        { key: "sep-widgets", separator: true },
        { key: "edit-widgets", label: "Edit Widgets…", icon: Pencil, onSelect: editWidgets },
        { key: "sep-actions", separator: true },
        { key: "control-center", label: "Control Center", icon: LayoutGrid, onSelect: () => openControlCenter() },
        { key: "refresh", label: "Refresh Desktop", onSelect: refreshDesktop },
        { key: "about", label: "About This Portfolio", icon: Info, onSelect: () => openWindow("aboutPortfolio") },
      ],
    });
  };

  if (isMobile) {
    // The free-floating draggable desktop (and widgets meant to be dragged
    // around it) isn't a coherent touch interaction model — a compact,
    // tappable app grid built from the same underlying data replaces it
    // entirely below the mobile breakpoint, rather than being squeezed
    // into the desktop layout.
    return (
      <section id="home" data-mobile="true">
        <MobileHome />
      </section>
    );
  }

  return (
    // Capture phase: `.desktop-icon` items are GSAP Draggable targets,
    // which swallow the native contextmenu event during the bubble phase
    // (see the matching note in Finder.jsx) before it could reach a
    // bubble-phase handler here.
    <section id="home" ref={sectionRef} onContextMenuCapture={openDesktopMenu}>
      <DesktopIcons />
      <DesktopWidgets />
    </section>
  );
};

export default Home;

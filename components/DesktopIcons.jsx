import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Eye, Info, Copy } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { Draggable } from 'gsap/Draggable';
import gsap from 'gsap';
import useWindowStore from '#store/window.js';
import useLocationStore from '#store/location.js';
import useSystemUIStore from '#store/systemUI.js';
import useDesktopItemsStore from '#store/desktopItems.js';
import { getDesktopIconItems, getCopyableLink, runItemAction, toQuickLookEntry } from '#utils/portfolioItems.js';

gsap.registerPlugin(Draggable);

// Below this many pixels of pointer movement, a press+release is treated
// as a click/tap, never a drag — matches Draggable's own live delta so it
// never fights with GSAP's own drag-engagement threshold.
const DRAG_THRESHOLD = 6;

// One shared draggable icon for every kind of desktop item (project
// folder, text file, PDF, and any future kind `getDesktopIconItems` ever
// returns) — icon image and label both come straight from the item's own
// already-normalized `icon`/`name`, so nothing here special-cases a kind.
function DesktopIcon({ item, position, selected, onSelect, onOpen, onQuickLook, onContextMenu, onEscape, onDragEnd }) {
  const liRef = useRef(null);
  const draggedRef = useRef(false);

  useGSAP(() => {
    const el = liRef.current;
    if (!el) return undefined;

    const [instance] = Draggable.create(el, {
      bounds: '#home',
      onPress: function handlePress() {
        draggedRef.current = false;
        // GSAP Draggable calls preventDefault() on its own pointerdown
        // handler (to stop native text/ghost-image dragging), which as a
        // side effect also suppresses the browser's normal focus-on-click
        // for this element — confirmed by comparing against Finder's list
        // items (no Draggable attached), which focus correctly on click.
        // Without this, a mouse click selects an icon but Escape/Space
        // don't respond until the icon is separately given focus (e.g. via
        // Tab), even though both are part of the required interaction
        // model here.
        el.focus({ preventScroll: true });
        onSelect();
      },
      onDrag: function handleDrag() {
        if (Math.abs(this.x) > DRAG_THRESHOLD || Math.abs(this.y) > DRAG_THRESHOLD) draggedRef.current = true;
      },
      // Named `handleDragEnd`, NOT `onDragEnd` — a same-named function
      // expression shadows the outer `onDragEnd` prop within its own body,
      // which previously turned the call below into infinite self-
      // recursion (a real bug caught via testing, not hypothetical).
      onDragEnd: function handleDragEnd() {
        if (!draggedRef.current) return; // pure click — position unchanged, nothing to persist
        const rect = el.getBoundingClientRect();
        const homeRect = document.getElementById('home')?.getBoundingClientRect() ?? { left: 0, top: 0 };
        const x = rect.left - homeRect.left;
        const y = rect.top - homeRect.top;
        gsap.set(el, { x: 0, y: 0 });
        onDragEnd(x, y);
      },
    });
    return () => instance.kill();
  }, [item.id]);

  const handleClick = () => {
    if (draggedRef.current) { draggedRef.current = false; return; } // a real drag cancels the click it would otherwise fire
    onSelect();
  };

  const handleDoubleClick = () => {
    if (draggedRef.current) return;
    onOpen();
  };

  // Bound as onContextMenuCapture: GSAP Draggable attaches its own native
  // "contextmenu" suppressor directly to this element during the bubble
  // phase (so right-drag/long-press doesn't pop the OS menu) — capture
  // phase runs on the way down, ahead of that (see the identical note in
  // Finder.jsx).
  const handleContextMenu = (event) => {
    event.preventDefault();
    onSelect();
    onContextMenu(event.clientX, event.clientY);
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        onOpen();
        break;
      case ' ':
      case 'Spacebar':
        if (event.metaKey || event.ctrlKey) break;
        event.preventDefault();
        event.stopPropagation();
        onQuickLook();
        break;
      case 'Escape':
        event.preventDefault();
        onEscape();
        break;
      default:
        break;
    }
  };

  return (
    <li
      ref={liRef}
      role="option"
      aria-selected={selected}
      aria-label={item.name}
      tabIndex={0}
      className={clsx('group', 'desktop-icon', selected && 'selected')}
      style={{ left: position?.x ?? 0, top: position?.y ?? 0 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onContextMenuCapture={handleContextMenu}
    >
      <img src={item.icon} alt="" draggable={false} />
      <p>{item.name}</p>
    </li>
  );
}

// The desktop's icon layer — one real, individually draggable icon per
// item `getDesktopIconItems` returns (every project folder, about-me.txt,
// and Resume.pdf), all sharing the single DesktopIcon component above.
// Opening/Quick Look/Get Info all reuse each item's existing normalized
// action instead of a bespoke desktop-only viewer.
const DesktopIcons = () => {
  const { openWindow } = useWindowStore();
  const { setActiveLocation } = useLocationStore();
  const { setSelectedItem, selectedItem, openQuickLook, openContextMenu, openGetInfo } = useSystemUIStore();
  const { positions, setPosition, clampAllToViewport } = useDesktopItemsStore();

  useEffect(() => {
    const handleResize = () => clampAllToViewport();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampAllToViewport]);

  const items = getDesktopIconItems();

  const openItem = (item) => runItemAction(item.action, { openWindow, setActiveLocation });
  const quickLookItem = (item) => openQuickLook([toQuickLookEntry(item, () => openItem(item))], 0);

  const showContextMenu = (item, x, y) => {
    const copyableLink = getCopyableLink(item);
    openContextMenu({
      x,
      y,
      items: [
        { key: 'open', label: 'Open', onSelect: () => openItem(item) },
        { key: 'quick-look', label: 'Quick Look', icon: Eye, onSelect: () => quickLookItem(item) },
        { key: 'get-info', label: 'Get Info', icon: Info, onSelect: () => openGetInfo(item) },
        {
          key: 'copy-link',
          label: 'Copy Link',
          icon: Copy,
          disabled: !copyableLink,
          onSelect: () => { if (copyableLink) navigator.clipboard?.writeText(copyableLink).catch(() => {}); },
        },
      ],
    });
  };

  return (
    <ul id="desktop-icons" role="listbox" aria-label="Desktop items">
      {items.map((item) => (
        <DesktopIcon
          key={item.id}
          item={item}
          position={positions[item.id]}
          selected={selectedItem?.id === item.id}
          onSelect={() => setSelectedItem(item)}
          onOpen={() => openItem(item)}
          onQuickLook={() => { setSelectedItem(item); quickLookItem(item); }}
          onContextMenu={(x, y) => showContextMenu(item, x, y)}
          onEscape={() => setSelectedItem(null)}
          onDragEnd={(x, y) => setPosition(item.id, x, y)}
        />
      ))}
    </ul>
  );
};

export default DesktopIcons;

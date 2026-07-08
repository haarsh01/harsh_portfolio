import React, { useEffect, useRef, useState } from 'react'
import { FolderOpen, Search, Eye, Info, Copy } from 'lucide-react';
import {WindowControls} from "#components";
import WindowWarpper from '#hoc/WindowWarpper.jsx';
import {locations} from "#constants/index.js";
import useLocationStore from '#store/location';
import clsx from 'clsx';
import useWindowStore from '#store/window';
import useSystemUIStore from '#store/systemUI.js';
import { normalizeFinderItem, getCopyableLink } from '#utils/portfolioItems.js';
import { getShareableFinderDestination } from '#utils/shareableDestinations.js';
import ShareButton from '#components/ShareButton.jsx';

// Converts a raw Finder location-tree item into the normalized shape Quick
// Look's preview renderer understands. Only real, already-present data is
// surfaced here — nothing about a project/file is invented.
//
// Folder items (locations and project directories) are identified by
// `kind === "folder"` and never carry a `fileType` — only leaf files do.
const toQuickLookEntry = (item, openItem) => {
  const base = { id: item.id, name: item.name, icon: item.icon, open: () => openItem(item) };

  // A "app" item (e.g. NexAI, Portfolio OS) is a direct launch point for a
  // real window, not a browsable folder — it may still carry a `children`
  // array purely so Get Info/Spotlight can surface a real description, but
  // Quick Look should preview it as a project, not offer to navigate in.
  if (item.kind === 'app') {
    const textChild = item.children?.find((child) => child.fileType === 'txt');
    return { ...base, kind: 'project', description: textChild?.description ?? null, childCount: 0 };
  }

  if (item.kind === 'folder') {
    const textChild = item.children?.find((child) => child.fileType === 'txt');
    const isProject = Boolean(textChild?.description);
    return {
      ...base,
      kind: isProject ? 'project' : 'folder',
      description: textChild?.description ?? null,
      childCount: item.children?.length ?? 0,
    };
  }

  switch (item.fileType) {
    case 'img':
      return { ...base, kind: 'image', imageUrl: item.imageUrl };
    case 'txt':
      return { ...base, kind: 'text', subtitle: item.subtitle, image: item.image, description: item.description };
    case 'pdf':
      return { ...base, kind: 'pdf' };
    case 'fig':
    case 'url':
      return { ...base, kind: 'link', href: item.href };
    default:
      return { ...base, kind: 'unknown' };
  }
};

const Finder = () => {
    const{openWindow} = useWindowStore();
    const{activeLocation, setActiveLocation} = useLocationStore();
    const { openQuickLook, setSelectedItem, openContextMenu, openGetInfo } = useSystemUIStore();
    const [selectedId, setSelectedId] = useState(null);
    const [syncedLocation, setSyncedLocation] = useState(activeLocation);
    const itemRefs = useRef([]);

    const items = activeLocation?.children ?? [];

    // Deselects whenever the active Finder location changes — adjusted
    // during render, not in an effect, since this is purely "reset state
    // in response to a changed value."
    if (activeLocation !== syncedLocation) {
        setSyncedLocation(activeLocation);
        setSelectedId(null);
    }

    // Clearing the ref array is a genuine ref mutation (not React state),
    // so it stays in an effect rather than moving to the render body above.
    useEffect(() => {
        itemRefs.current = [];
    }, [activeLocation]);

    const openItem =(item) => {

        // A direct-launch "app" item (NexAI, Portfolio OS) opens its real
        // window immediately — it is not a folder to browse into, even
        // though it may still carry `children` purely for Get Info/Quick
        // Look metadata (see toQuickLookEntry above).
        if(item.kind === 'app' && item.windowId) return openWindow(item.windowId);
        if(item.kind === 'folder') return setActiveLocation(item);
        if(item.fileType === 'pdf') return openWindow("resume");
        if(["fig" , "url"].includes(item.fileType) && item.href)
            return window.open(item.href, "blank");

        if(item.fileType === 'txt') return openWindow("txtfile", item);
        if(item.fileType === 'img') return openWindow("imgfile", item);
    };

    const selectIndex = (index) => {
        const item = items[index];
        if(!item) return;
        setSelectedId(item.id);
        setSelectedItem(normalizeFinderItem(item, activeLocation.name));
        itemRefs.current[index]?.focus();
    };

    // Bound as onContextMenuCapture below: GSAP Draggable attaches its own
    // native "contextmenu" suppressor directly to the window's root element
    // (so right-drag/long-press gestures don't pop the OS menu), which stops
    // this event during the bubble phase before React's normal (bubble)
    // synthetic onContextMenu would ever see it. Capture-phase fires on the
    // way down, ahead of that, so it isn't affected.
    const showItemMenu = (event, item) => {
        event.preventDefault();
        const normalized = normalizeFinderItem(item, activeLocation.name);
        setSelectedId(item.id);
        setSelectedItem(normalized);
        const copyableLink = getCopyableLink(normalized);
        openContextMenu({
            x: event.clientX,
            y: event.clientY,
            items: [
                { key: 'open', label: 'Open', onSelect: () => openItem(item) },
                { key: 'quick-look', label: 'Quick Look', icon: Eye, onSelect: () => openQuickLookAt(items.indexOf(item)) },
                { key: 'get-info', label: 'Get Info', icon: Info, onSelect: () => openGetInfo(normalized) },
                { key: 'copy-link', label: 'Copy Link', icon: Copy, disabled: !copyableLink, onSelect: () => { if (copyableLink) navigator.clipboard?.writeText(copyableLink).catch(() => {}); } },
            ],
        });
    };

    const openQuickLookAt = (index) => {
        if(!items.length) return;
        const entries = items.map((item) => toQuickLookEntry(item, openItem));
        openQuickLook(entries, index);
    };

    const handleItemKeyDown = (event, index) => {
        switch(event.key){
            case 'Enter':
                event.preventDefault();
                openItem(items[index]);
                break;
            case ' ':
            case 'Spacebar':
                // Cmd/Ctrl+Space is Spotlight's shortcut — let it bubble
                // past this item untouched instead of hijacking it for
                // Quick Look.
                if(event.metaKey || event.ctrlKey) break;
                event.preventDefault();
                // Stop this keydown from also reaching Quick Look's own
                // window-level listener — otherwise the very keypress that
                // opens Quick Look keeps bubbling and is immediately
                // re-read there as the "close" shortcut.
                event.stopPropagation();
                setSelectedId(items[index].id);
                setSelectedItem(normalizeFinderItem(items[index], activeLocation.name));
                openQuickLookAt(index);
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                selectIndex(Math.min(index + 1, items.length - 1));
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                selectIndex(Math.max(index - 1, 0));
                break;
            default:
                break;
        }
    };

    const renderList = (name, items) =>
    ( <div>
        <h3>{name}</h3>



         <ul>{items.map((item) => (
        <li key={item.id} onClick={()=>
            // "Publications" and "Talks" are real Finder sidebar entries
            // but have no browsable children (their content is a
            // dedicated window, not a folder) — open that window directly
            // instead of navigating into an empty pane. Work-folder "app"
            // entries (NexAI, Portfolio OS) behave the same way when
            // clicked straight from the sidebar shortcut list.
            item.type === "publications" ? openWindow("publications")
            : item.type === "talks" ? openWindow("talks")
            : (item.kind === "app" && item.windowId) ? openWindow(item.windowId)
            : setActiveLocation(item)
        }   className={clsx(item.id === activeLocation.id ? "active" : "not-active",)}>

            <img src={item.icon} className="w-4" alt={item.name}/>
            <p className="text-sm font-medium truncate">{item.name}</p>
        </li>

    ))}
    </ul>
    </div> );
  return (
<>
<div id="window-header">
    <WindowControls target="finder"/>
    <ShareButton destination={getShareableFinderDestination(activeLocation)} className="icon" label="Share this location" />
    <Search className="icon"/>

</div>

<div className="flex flex-1 min-h-0">
    <div className="sidebar">

                {renderList('Favorites', Object.values(locations))}

                {renderList('Work', locations.work.children)}

    </div>
    <ul className="content" role="listbox" aria-label="Finder items">
    {items.length ? items.map((item, index) => (
        <li
            key={item.id}
            ref={(el) => { itemRefs.current[index] = el; }}
            tabIndex={0}
            role="option"
            aria-selected={item.id === selectedId}
            className={clsx(item.position, item.id === selectedId && "selected")}
            onClick={(event) => { setSelectedId(item.id); setSelectedItem(normalizeFinderItem(item, activeLocation.name)); event.currentTarget.focus(); }}
            onDoubleClick={() => openItem(item)}
            onKeyDown={(event) => handleItemKeyDown(event, index)}
            onContextMenuCapture={(event) => showItemMenu(event, item)}
        >

            <img src={item.icon} alt={item.name} draggable={false}/>
            <p>{item.name}</p>
        </li>
    )) : (
        <li className="content-empty">
            <FolderOpen className="icon" size={28}/>
            <p>No items in {activeLocation?.name} yet</p>
        </li>
    )}
</ul>

</div>




</>
  )
}
const FinderWindow = WindowWarpper(Finder, "finder");
export default FinderWindow
